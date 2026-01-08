"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href: string;
        title: string;
    }[];
}

export function AdminNav({ className, items, ...props }: AdminNavProps) {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                "flex items-center space-x-2 overflow-x-auto py-1",
                className
            )}
            {...props}
        >
            {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "text-sm font-medium transition-colors whitespace-nowrap px-4 py-2 rounded-lg",
                            isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                    >
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
