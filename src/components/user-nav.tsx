"use client";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "./sign-out-button";
import { User, CreditCard, Settings, LogOut } from "lucide-react";

interface UserNavProps {
    userEmail?: string | null;
    userName?: string | null;
}

export function UserNav({ userEmail, userName }: UserNavProps) {
    const initials = userName?.substring(0, 2).toUpperCase() || "U";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button id="user-nav-trigger" suppressHydrationWarning className="group flex items-center justify-end gap-3 w-full rounded-lg transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    {/* Name on the Left */}
                     <span className="text-sm font-medium text-slate-900 group-data-[collapsible=icon]:hidden truncate">
                        {userName || "Usuário"}
                    </span>
                    {/* Avatar on the Right */}
                    <Avatar className="h-9 w-9 border-2 border-white/20">
                        <AvatarImage src="" alt={userName || "User"} />
                        <AvatarFallback className="bg-purple-600 text-white font-bold">{initials}</AvatarFallback>
                    </Avatar>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{userName || "Usuário"}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {userEmail}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <div className="w-full cursor-pointer p-0">
                        <SignOutButton fullWidth />
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
