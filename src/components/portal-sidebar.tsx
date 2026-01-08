"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    LayoutGrid,
    Settings,
    Box,
    Home,
    Table,
    Database,
    Key,
    Server,
    FileText,
    Activity,
    Building2,
    Users,
    Info,
    MonitorPlay,
    Droplets,
    Sticker,
    History,
    Hammer,
    Truck,
    LayoutDashboard
} from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import iconParams from "../app/icon.png";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarRail,
    useSidebar,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarSeparator,
    SidebarTrigger,
} from "@/components/ui/sidebar"

export interface SidebarLink {
    label: string;
    href: string;
    icon?: string;
}

interface PortalSidebarProps extends React.ComponentProps<typeof Sidebar> {
    userEmail?: string | null;
    userName?: string | null;
    links?: SidebarLink[];
    onClose?: () => void;
}

const getIcon = (name?: string) => {
    switch (name) {
        case 'grid': return LayoutGrid;
        case 'settings': return Settings;
        case 'box': return Box;
        case 'home': return Home;
        case 'table': return Table;
        case 'database': return Database;
        case 'key': return Key;
        case 'server': return Server;
        case 'file': return FileText;
        case 'activity': return Activity;
        case 'users': return Users;
        case 'info': return Info;
        case 'monitor-play': return MonitorPlay;
        case 'droplets': return Droplets;
        case 'sticker': return Sticker;
        case 'history': return History;
        case 'hammer': return Hammer;
        case 'truck': return Truck;
        case 'layout-dashboard': return LayoutDashboard;
        default: return Box;
    }
}

export function PortalSidebar({ userEmail, userName, links, ...props }: PortalSidebarProps) {
    const pathname = usePathname();
    const navLinks = links || [
        { label: "Todos Aplicativos", href: "/portal", icon: "home" },
    ];

    // Helper for initials
    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="h-14 border-b p-0 group-data-[collapsible=icon]:h-auto">
                <div className="flex w-full h-full items-center gap-2 px-4 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
                    {/* Logo and Title Group */}
                    <div
                        className="flex flex-1 items-center gap-2"
                    >
                        <div className="h-6 w-6 relative shrink-0 group-data-[collapsible=icon]:hidden">
                            <Image
                                src={iconParams}
                                alt="SaaS Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <span className="font-semibold text-sm whitespace-nowrap group-data-[collapsible=icon]:hidden">
                            SaaS PCP
                        </span>
                    </div>

                    {/* Portal Icon / Action Button */}
                    <Link href="/portal" title="Portal">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                    </Link>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarMenu className="gap-2 mt-2">
                    {navLinks.map((link) => {
                        const Icon = getIcon(link.icon);
                        const searchParams = useSearchParams();

                        // Enhanced active state detection
                        let isActive = false;
                        if (link.href.includes('?')) {
                            const [linkPath, linkQuery] = link.href.split('?');
                            const linkParams = new URLSearchParams(linkQuery);

                            if (pathname === linkPath) {
                                // Check if all params in link match current params
                                isActive = true;
                                linkParams.forEach((value, key) => {
                                    if (searchParams.get(key) !== value) {
                                        isActive = false;
                                    }
                                });
                            }
                        } else {
                            // Default behavior for path-only links
                            isActive = link.href === "/portal"
                                ? pathname === link.href
                                : pathname?.startsWith(link.href);

                            // Special case: If we are in the module but have a 'view' param, 
                            // the root module link (Dashboard) should NOT be active unless explicitly handled.
                            // But usually base links shouldn't be active if a more specific "view" is active using query params.
                            // We'll check if any search params exist when the link has none, BUT this might affect other apps.
                            // For this specific module, let's keep it safe:
                            if (isActive && pathname?.includes('controle-prazo-qualidade') && searchParams.toString().length > 0 && link.href === '/controle-prazo-qualidade') {
                                isActive = false;
                            }
                        }

                        return (
                            <SidebarMenuItem key={link.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={link.label}
                                    className="group-data-[collapsible=icon]:mx-auto relative overflow-hidden"
                                >
                                    <Link
                                        href={link.href}
                                        className={cn(
                                            "flex items-center gap-2 select-none",
                                            isActive && "font-bold"
                                        )}
                                    >
                                        {isActive && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full" />
                                        )}
                                        <Icon />
                                        <span>{link.label}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarTrigger
                className="absolute -right-3 bottom-0 w-6 h-6 p-0 rounded-full border bg-sidebar border-sidebar-border shadow-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground z-20 [&>svg]:w-3 [&>svg]:h-3"
            />
            <SidebarRail />
        </Sidebar >
    );
}
