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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <MessagesSquare className="size-6" />
          <span className="font-semibold text-lg">Chat Assistant</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <ThreadList />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="https://github.com/TheHummel/chat" target="_blank">
                <Github className="size-4" />
                <span>GitHub</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
