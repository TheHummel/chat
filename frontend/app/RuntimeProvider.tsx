import { useState, ReactNode } from "react";
import {
    useExternalStoreRuntime,
    ThreadMessageLike,
    AppendMessage,
    AssistantRuntimeProvider,
} from "@assistant-ui/react";

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
    modelProvider: string = "openai",
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
            model_provider: modelProvider
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
    modelProvider = "openai"
}: Readonly<{
    children: ReactNode;
    modelProvider?: string;
}>) {
    const [isRunning, setIsRunning] = useState(false);
    const [messages, setMessages] = useState<MyMessage[]>([]);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [currentStreamingMessage, setCurrentStreamingMessage] = useState<string>("");

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

            setMessages((prev) => [...prev, assistantMessage]);
            setCurrentStreamingMessage("");

            if (newThreadId && !threadId) {
                setThreadId(newThreadId);
            }

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

    const allMessages = [...messages];
    if (currentStreamingMessage) {
        allMessages.push({
            role: "assistant",
            content: [{ type: "text", text: currentStreamingMessage }]
        });
    }

    const runtime = useExternalStoreRuntime({
        isRunning,
        messages: allMessages,
        convertMessage,
        onNew,
    });

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}