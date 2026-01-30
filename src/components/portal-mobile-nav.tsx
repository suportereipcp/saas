"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getIcon, SidebarLink } from "./portal-sidebar";

export function PortalMobileNav({ links }: { links?: SidebarLink[] }) {
    const pathname = usePathname();
    const navLinks = (pathname === '/dashboards') ? [] : (links || [
        { label: "Todos Aplicativos", href: "/portal", icon: "home" },
    ]).filter(link => ["/dashboards/pcp", "/dashboards/producao", "/dashboards/financeiro"].includes(link.href));

    if (!navLinks.length) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-950 border-t border-border flex justify-around items-center h-16 px-2 lg:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            {navLinks.map((link) => {
                const Icon = getIcon(link.icon);
                const isActive = pathname === link.href || pathname?.startsWith(link.href);

                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-full h-full text-xs font-medium transition-colors",
                            isActive
                                ? "text-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <div className={cn("p-1.5 rounded-xl transition-all", isActive && "bg-primary/10")}>
                            {Icon && <Icon className="w-5 h-5" />}
                        </div>
                        <span className="text-[10px] leading-none truncate max-w-[64px]">{link.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}
