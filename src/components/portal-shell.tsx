"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { PortalSidebar, SidebarLink } from "@/components/portal-sidebar";

interface PortalShellProps {
    children: React.ReactNode;
    userEmail?: string | null;
    userName?: string | null;
    links?: SidebarLink[];
}

export function PortalShell({ children, userEmail, userName, links }: PortalShellProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-grey-lighter font-sans">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar - Desktop & Mobile */}
            <div
                className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:static lg:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <PortalSidebar
                    userEmail={userEmail}
                    userName={userName}
                    onClose={() => setIsMobileMenuOpen(false)}
                    links={links}
                />
            </div>

            {/* Main Content Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header */}
                <header className="lg:hidden flex items-center h-16 px-4 bg-white border-b border-grey-light shadow-sm">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 -ml-2 text-grey-darker hover:text-primary rounded-md"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="ml-4 font-bold text-[#2B4964] uppercase tracking-wide">
                        SaaS PCP
                    </span>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
