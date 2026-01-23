'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotebookPen, Archive, ArrowLeft, Bot, Tag, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function NotesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const menuItems = [
        {
            title: "Caderno",
            icon: NotebookPen,
            href: "/anotacoes",
            active: pathname === "/anotacoes"
        },
        {
            title: "Minhas Anotações",
            icon: Archive,
            href: "/anotacoes/memory",
            active: pathname === "/anotacoes/memory"
        },
        {
            title: "Inteligência Artificial",
            icon: Bot,
            href: "/anotacoes/assistant",
            active: pathname === "/anotacoes/assistant"
        },
        {
            title: "Marcadores",
            icon: Tag,
            href: "/anotacoes/tags",
            active: pathname.startsWith("/anotacoes/tags")
        },
        {
            title: "Calendário",
            icon: Calendar,
            href: "/anotacoes/calendar",
            active: pathname.startsWith("/anotacoes/calendar")
        }
    ];

    return (
        <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden">
            {/* Minimal Sidebar for Tablet */}
            <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-6 gap-6 shadow-sm z-50">
                <Link href="/portal">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 mb-4">
                        <ArrowLeft size={24} />
                    </Button>
                </Link>

                <div className="flex-1 flex flex-col gap-4 w-full px-2">
                    {menuItems.map((item) => (
                        <Link key={item.href} href={item.href} className="w-full relative group">
                            <div className={cn(
                                "aspect-square w-full rounded-2xl flex flex-col items-center justify-center transition-all duration-300",
                                item.active
                                    ? "bg-emerald-50 text-emerald-600 shadow-sm scale-100 ring-2 ring-emerald-100"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/50 scale-90"
                            )}>
                                <item.icon size={28} strokeWidth={item.active ? 2.5 : 2} />
                            </div>

                        </Link>
                    ))}
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 relative h-full w-full overflow-hidden">
                {children}
            </main>
        </div>
    );
}
