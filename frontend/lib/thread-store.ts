import { create } from 'zustand'

export interface ThreadItem {
    id: string
    title: string
    created_at: string
    updated_at: string
    message_count: number
}

interface ThreadStore {
    threads: ThreadItem[]
    currentThreadId: string | null
    isLoading: boolean

    // actions
    setThreads: (threads: ThreadItem[]) => void
    addThread: (thread: ThreadItem) => void
    updateThread: (id: string, updates: Partial<ThreadItem>) => void
    deleteThread: (id: string) => void
    setCurrentThread: (id: string | null) => void
    setLoading: (loading: boolean) => void

    // API calls
    fetchThreads: () => Promise<void>
    createNewThread: () => Promise<ThreadItem>
    updateThreadTitle: (id: string, title: string) => Promise<void>
    removeThread: (id: string) => Promise<void>
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
    threads: [],
    currentThreadId: null,
    isLoading: false,

    setThreads: (threads) => set({ threads }),
    addThread: (thread) => set((state) => ({
        threads: [thread, ...state.threads]
    })),
    updateThread: (id, updates) => set((state) => ({
        threads: state.threads.map(thread =>
            thread.id === id ? { ...thread, ...updates } : thread
        )
    })),
    deleteThread: (id) => set((state) => ({
        threads: state.threads.filter(thread => thread.id !== id),
        currentThreadId: state.currentThreadId === id ? null : state.currentThreadId
    })),
    setCurrentThread: (id) => set({ currentThreadId: id }),
    setLoading: (loading) => set({ isLoading: loading }),

    // API calls
    fetchThreads: async () => {
        try {
            set({ isLoading: true })
            const response = await fetch('http://localhost:8000/api/threads')
            if (!response.ok) throw new Error('Failed to fetch threads')

            const threads = await response.json()
            set({ threads })
        } catch (error) {
            console.error('Error fetching threads:', error)
        } finally {
            set({ isLoading: false })
        }
    },

    createNewThread: async () => {
        try {
            const response = await fetch('http://localhost:8000/api/threads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: null })
            })

            if (!response.ok) throw new Error('Failed to create thread')

            const newThread = await response.json()
            const threadItem: ThreadItem = {
                id: newThread.id,
                title: newThread.title || 'New Chat',
                created_at: newThread.created_at,
                updated_at: newThread.updated_at,
                message_count: 0
            }

            get().addThread(threadItem)
            return threadItem
        } catch (error) {
            console.error('Error creating thread:', error)
            throw error
        }
    },

    updateThreadTitle: async (id, title) => {
        try {
            const response = await fetch(`http://localhost:8000/api/threads/${id}/title`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            })

            if (!response.ok) throw new Error('Failed to update thread title')

            get().updateThread(id, { title })
        } catch (error) {
            console.error('Error updating thread title:', error)
            throw error
        }
    },

    removeThread: async (id) => {
        try {
            const response = await fetch(`http://localhost:8000/api/threads/${id}`, {
                method: 'DELETE'
            })

            if (!response.ok) throw new Error('Failed to delete thread')

            get().deleteThread(id)
        } catch (error) {
            console.error('Error deleting thread:', error)
            throw error
        }
    }
}))
