"use client"

import { useEffect, useState } from "react"
import { DollarSign, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SpendData {
    total_spend: number
    total_tokens: number
    total_api_requests: number
    total_successful_requests: number
    total_failed_requests: number
}

export function SpendTracker() {
    const [spendData, setSpendData] = useState<SpendData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSpendData = async () => {
        setLoading(true)
        setError(null)

        try {
            const startDate = '2023-01-01'
            const today = new Date()
            const formattedToday = today.toISOString().split('T')[0]
            const endDate = formattedToday

            const response = await fetch(
                `http://localhost:8000/api/spend?start_date=${startDate}&end_date=${endDate}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch spend data: ${response.status}`)
            }

            const data = await response.json()
            setSpendData(data.metadata)
        } catch (err) {
            console.error('Error fetching spend data:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch spend data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSpendData()
        // refresh every 5 minutes
        const interval = setInterval(fetchSpendData, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const formatSpend = (spend: number) => {
        if (spend < 0.01) {
            return `${(spend * 1000).toFixed(2)}m¢`
        }
        return `$${spend.toFixed(4)}`
    }

    const getTooltipContent = () => {
        if (error) return `Error: ${error}`
        if (!spendData) return "Loading spend data..."

        return `Total Usage (All Time):
• Spend: ${formatSpend(spendData.total_spend)}
• Tokens: ${spendData.total_tokens.toLocaleString()}
• Requests: ${spendData.total_successful_requests}/${spendData.total_api_requests}
• Failed: ${spendData.total_failed_requests}`
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-200 cursor-pointer shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]"
                        onClick={fetchSpendData}
                    >
                        <div className="flex items-center gap-1">
                            <DollarSign className="size-4" />
                            <span className="text-xs text-muted-foreground">Total spent:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center h-6 min-w-[60px]">
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                ) : (
                                    <span className="text-sm font-medium text-foreground">
                                        {error ? 'Error' : spendData ? formatSpend(spendData.total_spend) : '...'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="whitespace-pre-line">{getTooltipContent()}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
