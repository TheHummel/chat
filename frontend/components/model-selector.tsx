"use client"

import * as React from "react"
import { Brain } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const models = [
    { value: "openai", label: "OpenAI GPT-4", provider: "OpenAI" },
    { value: "anthropic", label: "Claude 3 Sonnet", provider: "Anthropic" },
    { value: "gemini", label: "Gemini Pro", provider: "Google" },
]

interface ModelSelectorProps {
    selectedModel: string;
    onModelChange: (model: string) => void;
}

export function ModelSelector({ selectedModel, onModelChange }: ModelSelectorProps) {
    return (
        <div className="flex items-center gap-2">
            <Brain className="size-4" />
            <Select value={selectedModel} onValueChange={onModelChange}>
                <SelectTrigger className="w-40 h-8 bg-background border">
                    <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                    {models.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{model.label}</span>
                                <span className="text-xs text-muted-foreground">{model.provider}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
