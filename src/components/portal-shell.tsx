
"use client";

import { PortalSidebar, SidebarLink } from "@/components/portal-sidebar";
import { PortalMobileNav } from "@/components/portal-mobile-nav";
import { DynamicBreadcrumb } from "@/components/dynamic-breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

interface PortalShellProps {
    children: React.ReactNode;
    userEmail?: string | null;
    userName?: string | null;
    links?: SidebarLink[];
    defaultOpen?: boolean;
    hideHeader?: boolean; // Hide the top header bar
}

import { UserNav } from "@/components/user-nav";

export function PortalShell({ children, userEmail, userName, links, defaultOpen = true, hideHeader = false }: PortalShellProps) {
    return (
        <SidebarProvider defaultOpen={defaultOpen}>
            <PortalSidebar
                userEmail={userEmail}
                userName={userName}
                links={links}
            />
            <SidebarInset>
                {!hideHeader && (
                    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-transparent px-4">
                        <SidebarTrigger className="lg:hidden" />
                        <div className="ml-auto flex items-center gap-2">
                            <UserNav userEmail={userEmail} userName={userName} />
                        </div>
                    </header>
                )}
                <main className={`flex-1 ${hideHeader ? 'p-0' : 'p-4 md:p-8'} overflow-y-auto bg-muted/20 relative z-0 pb-20 lg:pb-0`}>
                    {children}
                </main>
            </SidebarInset>
            <PortalMobileNav links={links} />
        </SidebarProvider>
    );
}

