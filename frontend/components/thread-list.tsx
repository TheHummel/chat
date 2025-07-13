"use client"

import { useEffect, useState } from "react"
import { useThreadStore } from "@/lib/thread-store"
import { MessageSquare, Plus, Trash2, Edit3, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function ThreadList() {
    const {
        threads,
        currentThreadId,
        isLoading,
        fetchThreads,
        createNewThread,
        updateThreadTitle,
        removeThread,
        setCurrentThread
    } = useThreadStore()

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState("")

    useEffect(() => {
        fetchThreads()
    }, [fetchThreads])

    const handleNewThread = async () => {
        try {
            const newThread = await createNewThread()
            setCurrentThread(newThread.id)
        } catch (error) {
            console.error('Failed to create new thread:', error)
        }
    }

    const handleEditStart = (id: string, currentTitle: string) => {
        setEditingId(id)
        setEditingTitle(currentTitle)
    }

    const handleEditSave = async (id: string) => {
        if (editingTitle.trim()) {
            try {
                await updateThreadTitle(id, editingTitle.trim())
                setEditingId(null)
            } catch (error) {
                console.error('Failed to update thread title:', error)
            }
        }
    }

    const handleEditCancel = () => {
        setEditingId(null)
        setEditingTitle("")
    }

    const handleDelete = async (id: string) => {
        try {
            await removeThread(id)
        } catch (error) {
            console.error('Failed to delete thread:', error)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } else if (diffInHours < 24 * 7) {
            return date.toLocaleDateString([], { weekday: 'short' })
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
        }
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
                <h2 className="font-semibold">Chats</h2>
                <Button
                    onClick={handleNewThread}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>

            {/* Thread List */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading chats...
                    </div>
                ) : threads.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No chats yet. Start a conversation!
                    </div>
                ) : (
                    <div className="space-y-1 p-2">
                        {threads.map((thread) => (
                            <div
                                key={thread.id}
                                className={cn(
                                    "group flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                                    currentThreadId === thread.id && "bg-accent"
                                )}
                                onClick={() => setCurrentThread(thread.id)}
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                                <div className="flex-1 min-w-0">
                                    {editingId === thread.id ? (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleEditSave(thread.id)
                                                    if (e.key === 'Escape') handleEditCancel()
                                                }}
                                                className="h-6 text-xs"
                                                autoFocus
                                            />
                                            <Button
                                                onClick={() => handleEditSave(thread.id)}
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                onClick={handleEditCancel}
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0"
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-sm font-medium truncate">
                                                {thread.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {thread.message_count} messages • {formatDate(thread.updated_at)}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {editingId !== thread.id && (
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEditStart(thread.id, thread.title)
                                            }}
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleDelete(thread.id)
                                            }}
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 w-6 p-0 text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
