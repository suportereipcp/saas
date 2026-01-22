
"use client";

import { PortalSidebar, SidebarLink } from "@/components/portal-sidebar";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface PortalShellProps {
    children: React.ReactNode;
    userEmail?: string | null;
    userName?: string | null;
    links?: SidebarLink[];
}

import { UserNav } from "@/components/user-nav";

export function PortalShell({ children, userEmail, userName, links }: PortalShellProps) {
    return (
        <SidebarProvider>
            <PortalSidebar
                userEmail={userEmail}
                userName={userName}
                links={links}
            />
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-transparent px-4">
                    <SidebarTrigger className="lg:hidden" />
                    <div className="ml-auto flex items-center gap-2">

                        <UserNav userEmail={userEmail} userName={userName} />
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-muted/20">
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}

