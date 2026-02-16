"use client";

import { Suspense, useState, useEffect } from "react";
import { PortalSidebar, SidebarLink } from "@/components/portal-sidebar";
import { PortalMobileNav } from "@/components/portal-mobile-nav";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentPrensaShellProps {
    children: React.ReactNode;
    userEmail?: string | null;
    userName?: string | null;
    links?: SidebarLink[];
    defaultOpen?: boolean;
}

function MobileTrigger() {
    const { toggleSidebar } = useSidebar();
    return (
         <Button onClick={toggleSidebar} variant="ghost" size="icon" className="-ml-1 lg:hidden border-2 border-[#68D9A6] text-[#68D9A6] hover:bg-[#68D9A6] hover:text-white rounded-md">
            <Menu className="h-8 w-8" />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    )
}

export function AgentPrensaShell({ children, userEmail, userName, links, defaultOpen = true }: AgentPrensaShellProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-screen w-full bg-slate-100 animate-pulse" />;
    }

    // Hardcoded NO PADDING for content, but STOCK SHELL STYLES for container
    return (
        <SidebarProvider defaultOpen={defaultOpen} className="bg-slate-100 p-2 md:p-3 gap-2 md:gap-3 h-screen overflow-hidden">
            <Suspense fallback={<div className="w-[--sidebar-width] bg-[#68D9A6] h-full" />}>
                <PortalSidebar
                    userEmail={userEmail}
                    userName={userName}
                    links={links}
                />
            </Suspense>

            <SidebarInset className="rounded-xl md:rounded-2xl bg-white shadow-sm md:shadow-md border-0 overflow-hidden flex flex-col h-full ring-0">
                <header className="flex h-16 shrink-0 items-center gap-2 bg-white px-4 lg:hidden">
                    <MobileTrigger />
                </header>
                <div className="flex-1 overflow-y-auto pb-20 lg:pb-0 p-0">
                    {children}
                </div>
            </SidebarInset>
            <PortalMobileNav links={links} />
        </SidebarProvider>
    );
}
