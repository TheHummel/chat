"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Brain } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface Model {
    id: string
    name: string
    full_name: string
}

interface ModelsData {
    providers: Record<string, Model[]>
    default_models: Record<string, string>
}

interface SmartModelSelectorProps {
    selectedModel: string
    onModelChange: (model: string) => void
}

const providerDisplayNames = {
    openai: "OpenAI",
    gemini: "Google Gemini",
    groq: "Groq",
    azure: "Azure OpenAI",
    azure_ai: "Azure AI",
    ollama: "Ollama",
    other: "Other"
}

export function SmartModelSelector({ selectedModel, onModelChange }: SmartModelSelectorProps) {
    const [modelsData, setModelsData] = useState<ModelsData | null>(null)
    const [selectedProvider, setSelectedProvider] = useState("openai")
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchModels()
    }, [])

    useEffect(() => {
        // update provider when selected model changes
        if (modelsData && selectedModel) {
            for (const [provider, models] of Object.entries(modelsData.providers)) {
                if (models.some(model => model.id === selectedModel)) {
                    setSelectedProvider(provider)
                    break
                }
            }
        }
    }, [selectedModel, modelsData])

    const fetchModels = async () => {
        try {
            const response = await fetch('http://localhost:8000/api/models')
            if (response.ok) {
                const data = await response.json()
                setModelsData(data)

                if (!selectedModel && data.default_models.openai) {
                    onModelChange(data.default_models.openai)
                }
            }
        } catch (error) {
            console.error('Failed to fetch models:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleProviderChange = (provider: string) => {
        setSelectedProvider(provider)

        // auto-select default model for this provider
        if (modelsData?.default_models[provider]) {
            onModelChange(modelsData.default_models[provider])
        } else if (modelsData?.providers[provider]?.[0]) {
            onModelChange(modelsData.providers[provider][0].id)
        }
    }

    const getCurrentModel = () => {
        if (!modelsData || !selectedModel) return null

        for (const models of Object.values(modelsData.providers)) {
            const model = models.find(m => m.id === selectedModel)
            if (model) return model
        }
        return null
    }

    const getAvailableModels = () => {
        return modelsData?.providers[selectedProvider] || []
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-1">
                    <Brain className="size-4 animate-pulse" />
                    <span className="text-xs text-muted-foreground">Model:</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-32 h-6 bg-muted animate-pulse rounded" />
                    <div className="w-48 h-6 bg-muted animate-pulse rounded" />
                </div>
            </div>
        )
    }

    const currentModel = getCurrentModel()
    const availableModels = getAvailableModels()

    return (
        <div className="flex flex-col gap-1 px-3 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all duration-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1),0_10px_15px_-3px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-1">
                <Brain className="size-4" />
                <span className="text-xs text-muted-foreground">Model:</span>
            </div>
            <div className="flex items-center gap-2">
                {/* Provider Selector */}
                <Select value={selectedProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="w-32 h-6 min-w-[8rem] border-0 bg-transparent hover:bg-white/10 transition-all duration-200 data-[state=open]:bg-white/10 shadow-none text-sm">
                        <SelectValue>
                            {providerDisplayNames[selectedProvider as keyof typeof providerDisplayNames] || selectedProvider}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {modelsData && Object.keys(modelsData.providers).map((provider) => (
                            <SelectItem key={provider} value={provider}>
                                <span className="font-medium">
                                    {providerDisplayNames[provider as keyof typeof providerDisplayNames] || provider}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Model Selector */}
                <Select value={selectedModel} onValueChange={onModelChange}>
                    <SelectTrigger className="w-48 h-6 min-w-[12rem] border-0 bg-transparent hover:bg-white/10 transition-all duration-200 data-[state=open]:bg-white/10 shadow-none text-sm">
                        <SelectValue placeholder="Select model">
                            {currentModel ? (
                                <span className="text-sm font-medium truncate">
                                    {currentModel.name}
                                </span>
                            ) : (
                                "Select model"
                            )}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {availableModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col items-start">
                                    <span className="font-medium">{model.name}</span>
                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {model.full_name}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
