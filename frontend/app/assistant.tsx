"use client";

import { useState } from "react";
import { RuntimeProvider } from "@/app/RuntimeProvider"
import { Thread } from "@/components/ui/thread";
import { SidebarInset, SidebarProvider, SidebarTrigger, DynamicSidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { useThreadStore } from "@/lib/thread-store";
import { SmartModelSelector } from "@/components/smart-model-selector";
import { SpendTracker } from "@/components/spend-tracker";

export const Assistant = () => {
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const { currentThreadId, threads } = useThreadStore();

  const currentThread = threads.find(t => t.id === currentThreadId);

  return (
    <RuntimeProvider modelProvider={selectedModel} selectedThreadId={currentThreadId}>
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
