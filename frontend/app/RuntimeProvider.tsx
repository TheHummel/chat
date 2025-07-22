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
    modelId: string = "gpt-4o",
    onChunk: (chunk: string) => void
): Promise<{ threadId: string }> => {
    const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content
            })),
            thread_id: threadId,
            model_provider: modelId  // Send full model ID
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let newThreadId = threadId;

    if (reader) {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.text) {
                            onChunk(data.text);
                        }
                        if (data.thread_id && !newThreadId) {
                            newThreadId = data.thread_id;
                        }
                        if (data.done) {
                            return { threadId: newThreadId || "" };
                        }
                    } catch (e) {
                        // ignore parsing errors
                    }
                }
            }
        }
    }

    return { threadId: newThreadId || "" };
};

export function RuntimeProvider({
    children,
    modelProvider = "gpt-4o",
    selectedThreadId = null
}: Readonly<{
    children: ReactNode;
    modelProvider?: string;
    selectedThreadId?: string | null;
}>) {
    const [isRunning, setIsRunning] = useState(false);
    const [messages, setMessages] = useState<MyMessage[]>([]);
    const [threadId, setThreadId] = useState<string | null>(selectedThreadId);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>("");
    const [isLoadingThread, setIsLoadingThread] = useState(false);

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
        if (selectedThreadId && selectedThreadId !== threadId) {
            setThreadId(selectedThreadId);
            loadThreadMessages(selectedThreadId);
        } else if (!selectedThreadId && threadId) {
            setThreadId(null);
            setMessages([]);
        }
    }, [selectedThreadId]);

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

        try {
            let assistantText = "";

            const { threadId: newThreadId } = await streamBackendApi(
                [...messages, userMessage],
                threadId,
                modelProvider,  // This is now the full model ID
                (chunk: string) => {
                    assistantText += chunk;
                    setCurrentStreamingMessage(assistantText);
                }
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

            await fetchThreads();

        } catch (error) {
            console.error("Error calling backend:", error);
            const errorMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: "Sorry, I encountered an error. Please try again." }]
            };
            setMessages((prev) => [...prev, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsRunning(false);
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

        try {
            let assistantText = "";

            await streamBackendApi(
                newMessages,
                threadId,
                modelProvider,
                (chunk: string) => {
                    assistantText += chunk;
                    setCurrentStreamingMessage(assistantText);
                }
            );

            const assistantMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };

            setMessages([...newMessages, assistantMessage]);
            setCurrentStreamingMessage("");

            await fetchThreads();

        } catch (error) {
            console.error("Error editing message:", error);
            const errorMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: "Sorry, I encountered an error while editing. Please try again." }]
            };
            setMessages([...newMessages, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsRunning(false);
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

        try {
            let assistantText = "";

            await streamBackendApi(
                messagesToKeep,
                threadId,
                modelProvider,
                (chunk: string) => {
                    assistantText += chunk;
                    setCurrentStreamingMessage(assistantText);
                }
            );

            const assistantMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: assistantText }]
            };

            setMessages([...messagesToKeep, assistantMessage]);
            setCurrentStreamingMessage("");

            await fetchThreads();

        } catch (error) {
            console.error("Error reloading message:", error);
            const errorMessage: MyMessage = {
                role: "assistant",
                content: [{ type: "text", text: "Sorry, I encountered an error while reloading. Please try again." }]
            };
            setMessages([...messagesToKeep, errorMessage]);
            setCurrentStreamingMessage("");
        } finally {
            setIsRunning(false);
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
        setMessages: (newMessages: MyMessage[]) => {
            const filteredMessages = newMessages.filter(msg =>
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
    });

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}