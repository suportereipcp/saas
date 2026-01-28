"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, PieChart, Menu, X, Calendar, Target } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    { name: "Painel Principal", path: "/dashboards", icon: LayoutDashboard },
    { name: "Produção", path: "/dashboards/producao", icon: BarChart3 },
    { name: "Financeiro", path: "/dashboards/financeiro", icon: PieChart },
    { name: "Calendário", path: "/dashboards/calendario", icon: Calendar },
    { name: "Metas", path: "/dashboards/metas", icon: Target },
];

export function Sidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false); // Collapsed by default on small screens, expanded on TV? 
    // Always visible on TV usually.

    return (
        <aside className="fixed bottom-0 left-0 xl:top-0 z-40 w-full h-16 xl:h-screen xl:w-20 flex flex-row xl:flex-col items-center justify-between xl:justify-start py-2 xl:py-8 bg-card/95 backdrop-blur-xl border-t xl:border-r xl:border-t-0 border-border/50 transition-all duration-300 xl:hover:w-64 group shadow-lg xl:shadow-none">
            <div className="hidden xl:block mb-10 text-primary">
                <LayoutDashboard className="w-8 h-8" />
            </div>

            <nav className="flex-1 w-full flex flex-row xl:flex-col gap-1 xl:gap-4 px-2 justify-around xl:justify-start">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    // Hide Calendar and Metas on Mobile (block on xl, hidden by default if not xl? No, we want to hide specifically on mobile)
                    // Actually, we can just use `hidden xl:flex` for those items if we want to remove them completely from DOM or layout.
                    const isMobileHidden = item.name === "Calendário" || item.name === "Metas";

                    if (isMobileHidden) {
                        return (
                            <Link
                                key={item.path}
                                href={item.path}
                                className={clsx(
                                    "hidden xl:flex items-center gap-0 group-hover:gap-4 px-4 py-3 rounded-xl transition-all duration-300 group-hover:justify-start justify-center overflow-hidden whitespace-nowrap",
                                    isActive
                                        ? "bg-primary/20 text-primary shadow-sm border border-primary/30"
                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                )}
                            >
                                <item.icon className="w-6 h-6 min-w-[24px]" />
                                <span className="opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto max-w-0 group-hover:max-w-xs transition-all duration-300 text-sm font-medium overflow-hidden">
                                    {item.name}
                                </span>
                            </Link>
                        );
                    }

                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={clsx(
                                "flex flex-col xl:flex-row items-center gap-1 xl:gap-0 xl:group-hover:gap-4 px-2 xl:px-4 py-1 xl:py-3 rounded-xl transition-all duration-300 xl:group-hover:justify-start justify-center overflow-hidden whitespace-nowrap",
                                isActive
                                    ? "text-primary xl:bg-primary/20 xl:shadow-sm xl:border border-primary/30"
                                    : "text-muted-foreground xl:text-muted-foreground hover:text-foreground xl:hover:bg-muted/50"
                            )}
                        >
                            <item.icon className="w-6 h-6 xl:w-6 xl:h-6 min-w-[24px]" />
                            {/* Label for Mobile (Optional, often bottom nav has labels, but user wants clean? Let's keep icons mostly, maybe small label) */}
                            {/* User didn't specify showing labels on mobile, but typical bottom nav has them. The original code had them hidden until hover. 
                                Let's keep them hidden on mobile to save space or just icons? 
                                User Request: "o sidebar lateral, deixe ele na barra inferior, para ganhar espaço" -> suggests compact.
                                Let's keep just icons on mobile for now, or very small labels? 
                                Original: opacity-0 group-hover:opacity-100.
                                Let's keep the desktop hover behavior. 
                            */}
                            <span className="hidden xl:block opacity-0 group-hover:opacity-100 w-0 group-hover:w-auto max-w-0 group-hover:max-w-xs transition-all duration-300 text-sm font-medium overflow-hidden">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
