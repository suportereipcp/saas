"use client";

import { supabase } from "@/lib/supabase";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

interface SignOutButtonProps {
    fullWidth?: boolean;
}

export function SignOutButton({ fullWidth }: SignOutButtonProps) {
    const router = useRouter();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/login"); // Redirect to login page
        router.refresh(); // Refresh to clear any server component cache
    };

    return (
        <button
            onClick={handleSignOut}
            className={`flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-md transition-colors ${fullWidth ? "w-full justify-center" : ""
                }`}
            title="Sair do sistema"
        >
            <LogOut size={16} />
            <span>Sair</span>
        </button>
    );
}
