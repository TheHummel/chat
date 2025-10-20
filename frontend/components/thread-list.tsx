"use client"

import { useEffect, useState } from "react"
import { useThreadStore } from "@/lib/thread-store"
import { MessageSquare, Plus, Trash2, Edit3, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button"

export function ThreadList() {
    const {
        threads,
        currentThreadId,
        isLoading,
        fetchThreads,
        createNewThread,
        updateThreadTitle,
        removeThread,
        setCurrentThread,
        clearAllThreads
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

    const handleClearAll = async () => {
        if (confirm('You sure you want to delete ALL chats? This action cannot be undone.')) {
            try {
                await clearAllThreads()
            } catch (error) {
                console.error('Failed to clear all threads:', error)
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            handleEditSave(id)
        } else if (e.key === 'Escape') {
            handleEditCancel()
        }
    }

    const getThreadTitle = (thread: any) => {
        return thread.title || "New Chat"
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
                <div className="flex items-center gap-1">
                    <TooltipIconButton
                        onClick={handleClearAll}
                        variant="ghost"
                        className="h-8 w-8 p-0 hover:text-destructive"
                        tooltip="Clear all chat history"
                        disabled={threads.length === 0}
                    >
                        <Trash2 className="h-4 w-4" />
                    </TooltipIconButton>
                    <Button
                        onClick={handleNewThread}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
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
                                    "group/thread flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors min-h-[60px]",
                                    currentThreadId === thread.id && "bg-accent"
                                )}
                            >
                                <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                                {editingId === thread.id ? (
                                    <>
                                        <Input
                                            value={editingTitle}
                                            onChange={(e) => setEditingTitle(e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, thread.id)}
                                            className="flex-1 h-8 text-sm"
                                            autoFocus
                                        />
                                        <div className="flex gap-1 flex-shrink-0">
                                            <TooltipIconButton
                                                onClick={() => handleEditSave(thread.id)}
                                                className="hover:text-green-600 text-foreground size-6 p-0"
                                                variant="ghost"
                                                tooltip="Save"
                                            >
                                                <Check className="h-3 w-3" />
                                            </TooltipIconButton>
                                            <TooltipIconButton
                                                onClick={handleEditCancel}
                                                className="hover:text-red-600 text-foreground size-6 p-0"
                                                variant="ghost"
                                                tooltip="Cancel"
                                            >
                                                <X className="h-3 w-3" />
                                            </TooltipIconButton>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setCurrentThread(thread.id)}
                                            className="flex-1 text-start py-2 min-w-0 mr-2"
                                        >
                                            <div className="text-sm font-medium truncate pr-2">
                                                {getThreadTitle(thread)}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate pr-2">
                                                {thread.message_count} messages • {formatDate(thread.updated_at)}
                                            </div>
                                        </button>
                                        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover/thread:opacity-100 transition-opacity">
                                            <TooltipIconButton
                                                onClick={() => handleEditStart(thread.id, thread.title)}
                                                className="hover:text-primary text-foreground size-6 p-0"
                                                variant="ghost"
                                                tooltip="Edit name"
                                            >
                                                <Edit3 className="h-3 w-3" />
                                            </TooltipIconButton>
                                            <TooltipIconButton
                                                onClick={() => handleDelete(thread.id)}
                                                className="hover:text-destructive text-foreground size-6 p-0"
                                                variant="ghost"
                                                tooltip="Delete thread"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </TooltipIconButton>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
