"use client";

import { AppShell } from "@/components/layout/app-shell";
import { LayoutDashboard, Newspaper, Settings, Users } from "lucide-react";

const AGENT_NAV_ITEMS = [
    { label: "Dashboard", href: "/agenteprensa", icon: LayoutDashboard },
    { label: "Notícias", href: "/agenteprensa/news", icon: Newspaper },
    { label: "Equipe", href: "/agenteprensa/team", icon: Users },
    { label: "Configurações", href: "/agenteprensa/settings", icon: Settings },
];

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AppShell navItems={AGENT_NAV_ITEMS}>
            {children}
        </AppShell>
    );
}
