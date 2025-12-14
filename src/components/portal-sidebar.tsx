import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, LogOut, Settings, Box, Home } from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import iconParams from "../app/icon.png"; // Next.js imports images as objects

export interface SidebarLink {
    label: string;
    href: string;
    icon?: string; // 'grid', 'settings', 'box', 'home'
}

interface PortalSidebarProps {
    userEmail?: string | null;
    userName?: string | null;
    className?: string;
    onClose?: () => void;
    links?: SidebarLink[];
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

export function PortalSidebar({ userEmail, userName, className, onClose, links }: PortalSidebarProps) {
    const pathname = usePathname();

    // Default links if none provided
    const navLinks = links || [
        { label: "Seus Aplicativos", href: "/portal", icon: "grid" }
    ];

    return (
        <aside className={cn("w-64 bg-white border-r border-grey-light flex flex-col h-full", className)}>
            {/* Logo Area */}
            <div className="p-6 border-b border-grey-light flex items-center justify-between">
                <div className="flex items-center gap-3 text-[#2B4964]">
                    <Image
                        src={iconParams}
                        alt="SaaS Logo"
                        width={32}
                        height={32}
                        className="rounded-lg shadow-sm"
                    />
                    <h2 className="text-xl font-bold tracking-wide uppercase select-none">
                        SaaS PCP
                    </h2>
                </div>
                <Link
                    href="/portal"
                    onClick={onClose}
                    className="p-2 text-grey-darker hover:text-primary hover:bg-grey-lighter rounded-md transition-colors"
                    title="Início"
                >
                    <Home size={20} />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navLinks.map((link) => {
                    const Icon = getIcon(link.icon);
                    const isActive = pathname === link.href;

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-md transition-all font-medium min-h-[60px]",
                                isActive
                                    ? "bg-primary text-white shadow-md scale-[1.02]"
                                    : "text-[#2B4964] bg-grey-lighter hover:bg-gray-100"
                            )}
                        >
                            <Icon size={20} className="shrink-0" />
                            <span className="leading-tight">{link.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-grey-light bg-zinc-50">
                <div className="mb-4 px-2">
                    <p className="text-sm font-semibold text-[#2B4964] truncate">
                        {userName || "Usuário"}
                    </p>
                    <p className="text-xs text-grey-darker truncate" title={userEmail || ""}>
                        {userEmail}
                    </p>
                </div>
                <SignOutButton fullWidth />
            </div>
        </aside>
    );
}
