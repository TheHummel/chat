"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useThreadStore } from "@/lib/thread-store"

interface Model {
    id: string
    name: string
    full_name: string
}

interface ModelsData {
    providers: Record<string, Model[]>
    default_models: Record<string, string>
}

const providerDisplayNames = {
    openai: "OpenAI",
    gemini: "Google Gemini",
    groq: "Groq",
    azure: "Azure OpenAI",
    azure_ai: "Azure AI",
    ollama: "Ollama",
    mistral: "Mistral AI",
    other: "Other"
}

export function SmartModelSelector() {
    const { selectedModel, setSelectedModel } = useThreadStore()
    const [modelsData, setModelsData] = useState<ModelsData | null>(null)
    const [selectedProvider, setSelectedProvider] = useState("mistral")
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
            // fetch Mistral models
            const response = await fetch('/api/models')
            if (response.ok) {
                const data = await response.json()
                setModelsData(data)
                
                // set default model if none selected
                if (!selectedModel && data.default_models.mistral) {
                    setSelectedProvider('mistral')
                    setSelectedModel(data.default_models.mistral)
                }
            } else {
                console.error('Failed to fetch Mistral models:', await response.text())
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
            setSelectedModel(modelsData.default_models[provider])
        } else if (modelsData?.providers[provider]?.[0]) {
            setSelectedModel(modelsData.providers[provider][0].id)
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
            <div className="flex flex-col gap-2">
                <div className="w-full h-6 bg-muted animate-pulse rounded" />
                <div className="w-full h-6 bg-muted animate-pulse rounded" />
            </div>
        )
    }

    const currentModel = getCurrentModel()
    const availableModels = getAvailableModels()

    return (
        <div className="flex flex-col gap-3 mt-2">
            {/* Provider Selector */}
            <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-full h-9 text-sm">
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
            <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="Select model">
                        {currentModel ? (
                            <span className="font-medium truncate">
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
    )
}
