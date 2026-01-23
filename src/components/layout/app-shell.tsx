"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

interface AppShellProps {
    children: React.ReactNode;
    navItems: NavItem[];
}

export function AppShell({ children, navItems }: AppShellProps) {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-grey-lighter text-grey-darkest font-sans">
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-grey-light transition-transform duration-300 ease-in-out lg:translate-x-0",
                    isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Sidebar Header */}
                    <div className="flex h-16 items-center px-6 border-b border-grey-light">
                        <Logo className="scale-75 origin-left" />
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-4 py-6">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-primary/10 text-primary border border-primary/20"
                                            : "text-grey-darker hover:bg-grey-light hover:text-black"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-grey group-hover:text-grey-darker")} />
                                        <span>{item.label}</span>
                                    </div>
                                    {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-grey-light">
                        <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-grey-darker rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors">
                            <LogOut className="h-5 w-5" />
                            <span>Sair</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="lg:pl-72 flex flex-col min-h-screen">
                {/* Topbar (Mobile Only mostly, or global actions) */}
                <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-grey-light bg-white/80 backdrop-blur-md px-6 shadow-sm">
                    <button
                        className="lg:hidden text-grey-darker hover:text-black"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex-1" />

                    {/* User Profile / Actions Placeholder */}
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-grey-light border border-grey flex items-center justify-center text-xs font-bold text-grey-darker">
                            US
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-10">
                    <div className="mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
