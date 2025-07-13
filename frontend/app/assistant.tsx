"use client";

import { useState } from "react";
import { RuntimeProvider } from "@/app/RuntimeProvider"
import { Thread } from "@/components/assistant-ui/thread";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
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
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    <span className="font-medium">Assistant</span>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {currentThread?.title || "New Chat"}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto flex items-center gap-2">
              <SpendTracker />
              <SmartModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
              />
            </div>
          </header>
          <Thread />
        </SidebarInset>
      </SidebarProvider>
    </RuntimeProvider>
  );
};
