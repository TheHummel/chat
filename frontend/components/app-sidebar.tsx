import * as React from "react"
import { Github, MessagesSquare } from "lucide-react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { ThreadList } from "./thread-list"
import { SmartModelSelector } from "./smart-model-selector"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  selectedModel: string
  onModelChange: (model: string) => void
}

export function AppSidebar({ selectedModel, onModelChange, ...props }: AppSidebarProps) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="p-2">
          <SmartModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ThreadList />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
