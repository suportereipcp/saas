import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, Settings, Box, Home, PanelLeftClose, PanelLeft, ChevronRight } from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import iconParams from "../app/icon.png";

export interface SidebarLink {
    label: string;
    href: string;
    icon?: string;
}

interface PortalSidebarProps {
    userEmail?: string | null;
    userName?: string | null;
    className?: string;
    onClose?: () => void;
    links?: SidebarLink[];
    isCollapsed?: boolean;
    onToggle?: () => void;
}

const getIcon = (name?: string) => {
    switch (name) {
        case 'grid': return LayoutGrid;
        case 'settings': return Settings;
        case 'box': return Box;
        case 'home': return Home;
        default: return Box;
    }
}

export function PortalSidebar({ userEmail, userName, className, onClose, links, isCollapsed = false, onToggle }: PortalSidebarProps) {
    const pathname = usePathname();

    const navLinks = links || [
        { label: "Seus Aplicativos", href: "/portal", icon: "grid" }
    ];

    return (
        <aside className={cn(
            "bg-white border-r border-grey-light flex flex-col h-full transition-all duration-300 ease-in-out relative",
            isCollapsed ? "w-20" : "w-64",
            className
        )}>
            {/* Header / Toggle */}
            <div className={cn("p-4 border-b border-grey-light flex items-center h-[73px]", isCollapsed ? "justify-center" : "justify-between")}>
                {!isCollapsed && (
                    <div className="flex items-center gap-3 text-[#2B4964] overflow-hidden">
                        <Image
                            src={iconParams}
                            alt="SaaS Logo"
                            width={32}
                            height={32}
                            className="rounded-lg shadow-sm shrink-0"
                        />
                        <h2 className="text-xl font-bold tracking-wide uppercase select-none whitespace-nowrap">
                            SaaS PCP
                        </h2>
                    </div>
                )}

                {/* When collapsed, maybe just show the icon? Or the toggle? */}
                {isCollapsed && (
                    <Image
                        src={iconParams}
                        alt="SaaS Logo"
                        width={32}
                        height={32}
                        className="rounded-lg shadow-sm shrink-0 cursor-pointer"
                        onClick={onToggle}
                    />
                )}

                {/* Desktop Toggle Button */}
                {!isCollapsed && onToggle && (
                    <button
                        onClick={onToggle}
                        className="p-1.5 text-grey-darker hover:text-primary hover:bg-grey-lighter rounded-md transition-colors hidden lg:block"
                        title="Recolher Menu"
                    >
                        <PanelLeftClose size={20} />
                    </button>
                )}
            </div>

            {/* Close Mobile Button - Only on mobile overlay mode */}
            <div className="lg:hidden absolute top-4 right-4">
                {/* This handles the 'onClose' for mobile overlay, relying on parent passing correct onClose */}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2 space-y-2 overflow-y-auto overflow-x-hidden">
                {navLinks.map((link) => {
                    const Icon = getIcon(link.icon);
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={onClose}
                            title={isCollapsed ? link.label : undefined}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-md transition-all font-medium min-h-[50px]",
                                isActive
                                    ? "bg-primary text-white shadow-md"
                                    : "text-[#2B4964] bg-grey-lighter hover:bg-gray-100",
                                isCollapsed && "justify-center"
                            )}
                        >
                            <Icon size={22} className="shrink-0" />
                            {!isCollapsed && <span className="leading-tight whitespace-nowrap">{link.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className={cn("p-4 border-t border-grey-light bg-zinc-50 flex items-center", isCollapsed ? "justify-center" : "justify-between gap-3")}>
                {!isCollapsed && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-[#2B4964] truncate">
                            {userName || "Usuário"}
                        </p>
                        <p className="text-xs text-grey-darker truncate">
                            {userEmail}
                        </p>
                    </div>
                )}
                <div className={cn(isCollapsed && "flex-1 flex justify-center")}>
                    <SignOutButton fullWidth={!isCollapsed} />
                </div>
            </div>

            {/* Toggle Button for Collapsed state (Optional: could be at bottom or handled differently) */}
            {isCollapsed && onToggle && (
                <button
                    onClick={onToggle}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 p-2 bg-white border border-gray-200 shadow-md rounded-full text-gray-500 hover:text-primary hover:bg-gray-50 hidden lg:flex"
                    title="Expandir"
                >
                    <ChevronRight size={16} />
                </button>
            )}
        </aside>
    );
}
