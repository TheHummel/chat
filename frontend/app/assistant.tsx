"use client";

import { RuntimeProvider } from "@/app/RuntimeProvider"
import { Thread } from "@/components/ui/thread";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export const Assistant = () => {

  return (
    <RuntimeProvider>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex h-dvh w-full pr-0.5">
          <SidebarInset className="p-5 bg-gray-100 flex flex-col overflow-hidden">
            <div className="flex-1 rounded-lg shadow-md overflow-hidden relative">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </RuntimeProvider>
  );
};
