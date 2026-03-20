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
    Users,
    Info,
    MonitorPlay,
    Droplets,
    Sticker,
    History,
    Hammer,
    Truck,
    LayoutDashboard,
    BarChart3,
    TrendingUp,
    Layers,
    Calendar,
    CalendarCheck,
    ChevronLeft,
    ChevronRight,
    Ticket,
    ClipboardList,
} from "lucide-react";
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
    useSidebar,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";

// Internal component for the custom trigger logic
function CustomSidebarTrigger() {
    const { toggleSidebar, state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-[-12px] h-6 w-6 rounded-full border bg-white shadow-md flex z-50 text-slate-500 hover:text-slate-900 hover:bg-slate-50 items-center justify-center hidden lg:flex"
        >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
    );
}



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

export const getIcon = (name?: string) => {
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
        case 'bar-chart-3': return BarChart3;
        case 'trending-up': return TrendingUp;
        case 'layers': return Layers;
        case 'calendar': return Calendar;
        case 'calendar-check': return CalendarCheck;
        case 'ticket': return Ticket;
        case 'clipboard-list': return ClipboardList;
        default: return Box;
    }
}

export function PortalSidebar({ userEmail, userName, links, ...props }: PortalSidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams(); // Fixed: Moved hook to top level
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";

    let navLinks = links || [
        { label: "Todos Aplicativos", href: "/portal", icon: "home" },
    ];

    // Special case for Dashboard Hub: Show specific Hub menu instead of sub-menus
    if (pathname === '/dashboards') {
        navLinks = [
            { label: "Central de Dashboards", href: "/dashboards", icon: "layout-dashboard" }
        ];
    } else {
        navLinks = links || [
            { label: "Todos Aplicativos", href: "/portal", icon: "home" },
        ];
    }

    const linkMatchesCurrentRoute = (href: string) => {
        if (!pathname) return false;

        if (href.includes('?')) {
            const [linkPath, linkQuery] = href.split('?');
            const linkParams = new URLSearchParams(linkQuery);

            if (pathname !== linkPath) return false;

            let matches = true;
            linkParams.forEach((value, key) => {
                if (searchParams.get(key) !== value) {
                    matches = false;
                }
            });
            return matches;
        }

        if (href === "/portal" || href === "/inventario-rotativo") {
            return pathname === href;
        }

        if (
            href === "/controle-prazo-qualidade" &&
            pathname.includes("controle-prazo-qualidade") &&
            searchParams.toString().length > 0
        ) {
            return false;
        }

        return pathname === href || pathname.startsWith(`${href}/`);
    };

    const activeHref = [...navLinks]
        .filter((link) => linkMatchesCurrentRoute(link.href))
        .sort((a, b) => b.href.length - a.href.length)[0]?.href;

    // Helper for initials
    const getInitials = (name?: string | null) => {
        if (!name) return "U";
        return name.substring(0, 2).toUpperCase();
    }

    return (
        <Sidebar collapsible="icon" mode="relative" className="border-0 bg-[#68D9A6] rounded-xl md:rounded-2xl shadow-none md:shadow-md h-full ml-0 text-slate-900" {...props}>
            <SidebarHeader className="h-16 relative z-10 p-4 mb-2">
                <div className="flex w-full h-full items-center gap-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                    <Link href="/portal" className="flex items-center gap-3 transition-opacity hover:opacity-80">
                        <div className="h-8 w-8 relative shrink-0">
                            <Image
                                src={iconParams}
                                alt="SaaS Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        {!isCollapsed && (
                            <span className="font-bold text-lg text-slate-900 whitespace-nowrap">
                                SAAS PCP
                            </span>
                        )}
                    </Link>
                </div>
            </SidebarHeader>

            <SidebarContent className="relative z-10 px-3">
                <SidebarMenu className="gap-1">
                    {navLinks.map((link) => {
                        const Icon = getIcon(link.icon);
                        const isActive = link.href === activeHref;

                        return (
                            <SidebarMenuItem key={link.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={link.label}
                                    className={cn(
                                        "w-full justify-start gap-3 px-3 py-3 min-h-10 rounded-xl transition-all duration-200 overflow-hidden active:bg-[#18181B] active:text-white focus-visible:ring-0",
                                        "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!h-10",
                                        isActive
                                            ? "data-[active=true]:bg-[#18181B] data-[active=true]:text-white data-[active=true]:hover:bg-[#27272A] data-[active=true]:hover:text-white shadow-md data-[active=true]:font-semibold"
                                            : "text-black hover:bg-black/5 hover:text-black"
                                    )}
                                >
                                    <Link href={link.href} className="flex items-center gap-3 font-medium">
                                        <Icon className={cn("h-5 w-5")} />
                                        {!isCollapsed && <span>{link.label}</span>}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="relative z-10 p-4 mt-auto border-t border-black/10 bg-white/5">
                {/* Custom Toggle Button - Absolute Positioned on the Border Line */}
                <CustomSidebarTrigger />

                <div className="group-data-[collapsible=icon]:hidden">
                    <UserNav userEmail={userEmail} userName={userName} />
                </div>
                {/* Collapsed State: Just Avatar (handled by UserNav but forced to center/hide text via CSS/Group logic if needed, but UserNav handles 'group-data-[collapsible=icon]:hidden' on text) */}
                <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
                    <Avatar className="h-9 w-9 border-2 border-white/20">
                        <AvatarFallback className="bg-purple-600 text-white font-bold">{getInitials(userName)}</AvatarFallback>
                    </Avatar>
                </div>
            </SidebarFooter>



        </Sidebar >
    );
}
