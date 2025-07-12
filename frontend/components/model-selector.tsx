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
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar"

const models = [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-haiku", label: "Claude 3 Haiku" },
]

export function ModelSelector() {
    const [selectedModel, setSelectedModel] = React.useState("gpt-4o")

    return (
        <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
                <Brain className="size-4" />
                AI Model
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-full h-8 bg-sidebar-background border-sidebar-border text-sidebar-foreground">
                        <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                        {models.map((model) => (
                            <SelectItem key={model.value} value={model.value}>
                                {model.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}
