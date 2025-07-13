"use client";

import { useState } from "react";
import { RuntimeProvider } from "@/app/RuntimeProvider"
import { Thread } from "@/components/assistant-ui/thread";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ModelSelector } from "@/components/model-selector";

export const Assistant = () => {
  const [selectedModel, setSelectedModel] = useState("openai");

  return (
    <RuntimeProvider modelProvider={selectedModel}>
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
                    Current Chat
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="ml-auto">
              <ModelSelector
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
