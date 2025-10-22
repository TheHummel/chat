import { useState, ReactNode, useEffect } from "react";
import {
    useExternalStoreRuntime,
    ThreadMessageLike,
    AppendMessage,
    AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useThreadStore } from "@/lib/thread-store";

interface MyMessage {
    role: "user" | "assistant";
    content: Array<{ type: "text"; text: string }>;
}

interface BackendMessage {
    role: string;
    content: Array<{ type: string; text: string }>;
}

const convertMessage = (message: MyMessage): ThreadMessageLike => {
    return {
        role: message.role,
        content: message.content,
    };
};

const streamBackendApi = async (
    messages: MyMessage[],
    threadId: string | null,
    modelId: string = "mistral-large-latest",
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
): Promise<{ threadId: string }> => {
    const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content[0].text
            })),
            model: modelId
        }),
        signal,
    });


    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let newThreadId = threadId;

    if (reader) {
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                if (chunk) {
                    onChunk(chunk);
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    return { threadId: newThreadId || "" };
};

// save messages to backend database
const saveMessagesToBackend = async (
    threadId: string,
    messages: MyMessage[]
): Promise<void> => {
    try {
        const response = await fetch(`http://localhost:8000/api/chat/messages?thread_id=${threadId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }))),
        });

        if (!response.ok) {
            console.error('Failed to save messages:', response.status);
        }
    } catch (error) {
        console.error('Error saving messages to backend:', error);
    }
};

export function RuntimeProvider({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    const { currentThreadId, threads, selectedModel } = useThreadStore();

    const [isRunning, setIsRunning] = useState(false);
    const [messages, setMessages] = useState<MyMessage[]>([]);
    const [threadId, setThreadId] = useState<string | null>(currentThreadId);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>("");
    const [isLoadingThread, setIsLoadingThread] = useState(false);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const { fetchThreads, updateThread, setCurrentThread } = useThreadStore();

    // load messages from selected thread
    const loadThreadMessages = async (threadIdToLoad: string) => {
        setIsLoadingThread(true);
        try {
            const response = await fetch(`http://localhost:8000/api/threads/${threadIdToLoad}/messages`);
            if (response.ok) {
                const threadMessages = await response.json();
                const convertedMessages: MyMessage[] = threadMessages.map((msg: any) => ({
                    role: msg.role as "user" | "assistant",
                    content: Array.isArray(msg.content)
                        ? msg.content.map((item: any) => ({ type: item.type || "text", text: item.text || "" }))
                        : [{ type: "text", text: msg.content || "" }]
                }));
                setMessages(convertedMessages);
            } else {
                console.error('Failed to load thread messages');
                setMessages([]);
            }
        } catch (error) {
            console.error('Error loading thread messages:', error);
            setMessages([]);
        } finally {
            setIsLoadingThread(false);
        }
    };

    // handle thread selection changes
    useEffect(() => {
        if (currentThreadId && currentThreadId !== threadId) {
            setThreadId(currentThreadId);
            loadThreadMessages(currentThreadId);
        } else if (!currentThreadId && threadId) {
            setThreadId(null);
            setMessages([]);
        }
    }, [currentThreadId]);

    const onNew = async (message: AppendMessage) => {
        if (message.content[0]?.type !== "text")
            throw new Error("Only text messages are supported");

        const input = message.content[0].text;
        const userMessage: MyMessage = {
            role: "user",
            content: [{ type: "text", text: input }]
        };

        // add user message
        setMessages((prev) => [...prev, userMessage]);
        setIsRunning(true);
        setCurrentStreamingMessage("");

        // create new abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);

        try {
            // create thread if it doesn't exist
            let currentActiveThreadId = threadId;
            if (!currentActiveThreadId) {
                const createResponse = await fetch('http://localhost:8000/api/threads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: input.slice(0, 50) }) // use first 50 chars as title
                });
                
                if (createResponse.ok) {
                    const newThread = await createResponse.json();
                    currentActiveThreadId = newThread.id;
                    setThreadId(currentActiveThreadId);
                    setCurrentThread(currentActiveThreadId);
                } else {
                    console.error('Failed to create thread');
                }
            }

            let assistantText = "";

            const { threadId: newThreadId } = await streamBackendApi(
                [...messages, userMessage],
                threadId,
                selectedModel,
                (chunk: string) => {
                    assistantText += chunk;
                    setCurrentStreamingMessage(assistantText);
                },
                controller.signal
            );

            const assistantMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };

            setMessages((prev) => [...prev, assistantMessage]);
            setCurrentStreamingMessage("");

            if (newThreadId && !threadId) {
                setThreadId(newThreadId);
                setCurrentThread(newThreadId);
            }

            // save messages to database
            const saveThreadId = newThreadId || currentActiveThreadId;
            if (saveThreadId) {
                await saveMessagesToBackend(saveThreadId, [userMessage, assistantMessage]);
            }

            await fetchThreads();

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setCurrentStreamingMessage("");
                return;
            }
            console.error("Error calling backend:", error);
            const errorMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: "Sorry, I encountered an error. Please try again." }]
            };
            setMessages((prev) => [...prev, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsRunning(false);
            setAbortController(null);
        }
    };

    const onEdit = async (message: AppendMessage) => {
        if (message.content[0]?.type !== "text")
            throw new Error("Only text messages are supported");

        const parentId = message.parentId;
        let parentIndex = -1;

        if (parentId) {
            parentIndex = messages.findIndex((m, index) => index.toString() === parentId);
        }

        const newMessages = parentIndex >= 0 ? messages.slice(0, parentIndex + 1) : [];

        const editedMessage: MyMessage = {
            role: "user",
            content: [{ type: "text", text: message.content[0].text }]
        };

        // add edited message
        newMessages.push(editedMessage);
        setMessages(newMessages);
        setIsRunning(true);
        setCurrentStreamingMessage("");

        // create new abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);

        try {
            let assistantText = "";

            await streamBackendApi(
                newMessages,
                threadId,
                selectedModel,
                (chunk: string) => {
                    assistantText += chunk;
                    setCurrentStreamingMessage(assistantText);
                },
                controller.signal
            );

            const assistantMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };

            setMessages([...newMessages, assistantMessage]);
            setCurrentStreamingMessage("");

            // save edited messages to database
            if (threadId) {
                await saveMessagesToBackend(threadId, [editedMessage, assistantMessage]);
            }

            await fetchThreads();

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setCurrentStreamingMessage("");
                return;
            }
            console.error("Error editing message:", error);
            const errorMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: "Sorry, I encountered an error while editing. Please try again." }]
            };
            setMessages([...newMessages, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsRunning(false);
            setAbortController(null);
        }
    };

    const onReload = async (parentId: string | null) => {
        let messagesToKeep: MyMessage[];

        if (parentId === null) {
            // reload from beginning
            messagesToKeep = messages.filter(msg => msg.role === "user");
        } else {
            // find parent message and keep messages up to and including it
            const parentIndex = parseInt(parentId);
            if (parentIndex >= 0 && parentIndex < messages.length) {
                messagesToKeep = messages.slice(0, parentIndex + 1);
            } else {
                messagesToKeep = messages;
            }
        }

        // remove any trailing assistant messages
        while (messagesToKeep.length > 0 && messagesToKeep[messagesToKeep.length - 1].role === "assistant") {
            messagesToKeep.pop();
        }

        if (messagesToKeep.length === 0) {
            return;
        }

        setMessages(messagesToKeep);
        setIsRunning(true);
        setCurrentStreamingMessage("");

        // create new abort controller for this request
        const controller = new AbortController();
        setAbortController(controller);

        try {
            let assistantText = "";

            await streamBackendApi(
                messagesToKeep,
                threadId,
                selectedModel,
                (chunk: string) => {
                    assistantText += chunk;
                    setCurrentStreamingMessage(assistantText);
                },
                controller.signal
            );

            const assistantMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };

            setMessages([...messagesToKeep, assistantMessage]);
            setCurrentStreamingMessage("");

            // save reloaded assistant message to database
            if (threadId) {
                await saveMessagesToBackend(threadId, [assistantMessage]);
            }

            await fetchThreads();

        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setCurrentStreamingMessage("");
                return;
            }
            console.error("Error reloading message:", error);
            const errorMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: "Sorry, I encountered an error while reloading. Please try again." }]
            };
            setMessages([...messagesToKeep, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsRunning(false);
            setAbortController(null);
        }
    };

    const onCancel = async () => {
        if (abortController) {
            abortController.abort();
            setIsRunning(false);
            setCurrentStreamingMessage("");
            setAbortController(null);
        }
    };

    const allMessages = [...messages];
    if (currentStreamingMessage) {
        allMessages.push({
            role: "assistant",
            content: [{ type: "text", text: currentStreamingMessage }]
        });
    }

    const runtime = useExternalStoreRuntime({
        isRunning: isRunning || isLoadingThread,
        messages: allMessages,
        setMessages: (newMessages: readonly MyMessage[]) => {
            const filteredMessages = Array.from(newMessages).filter(msg =>
                !(msg.role === "assistant" && currentStreamingMessage &&
                    msg.content[0]?.text === currentStreamingMessage)
            );
            setMessages(filteredMessages);
            setCurrentStreamingMessage("");
        },
        convertMessage,
        onNew,
        onEdit,
        onReload,
        onCancel,
    });

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}