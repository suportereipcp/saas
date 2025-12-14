import { createClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Settings } from "lucide-react";
import { UserList } from "@/components/admin/user-list";

export default async function AdminGlobalSettings() {
    const supabase = await createClient();

    // In a real app, we would fetch system settings from a 'settings' table here
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // List users for management - USE ADMIN CLIENT to bypass RLS
    const { data: usersData, error: usersError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (usersError) console.error("Admin Page: Error fetching users", usersError);

    // Fetch available apps
    const { data: appsData, error: appsError } = await supabaseAdmin
        .from("apps")
        .select("*")
        .eq("active", true) // Only list active apps for assignment
        .order("name");

    if (appsError) console.error("Admin Page: Error fetching apps", appsError);

    // Fetch all permissions to map to users
    const { data: permissionsData, error: permsError } = await supabaseAdmin
        .from("permissions")
        .select("user_id, app_code");

    if (permsError) console.error("Admin Page: Error fetching permissions", permsError);
    // console.log("Admin Page: Permissions Data", permissionsData);

    // Attach authorized_apps to each user
    const users = (usersData || []).map(user => {
        const userPerms = (permissionsData || [])
            .filter(p => p.user_id === user.id)
            .map(p => p.app_code);

        return {
            ...user,
            authorized_apps: userPerms
        };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-grey-lighter rounded-full text-[#2B4964]">
                    <Settings size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#2B4964]">Geral do Sistema</h2>
                    <p className="text-sm text-grey-darker">Configurações globais e gerenciamento de usuários.</p>
                </div>
            </div>

            <UserList users={users} currentUserId={user?.id} allApps={appsData || []} />

            <div className="bg-white rounded-lg border border-grey-light shadow-sm p-6 text-grey-darker mt-8">
                <h4 className="font-semibold mb-2">Outras Configurações</h4>
                <p className="text-sm mb-4">
                    Opções globais adicionais (Manutenção, SMTP, etc.) serão implementadas futuramente.
                </p>
                <div className="text-xs opacity-50">v0.1.0</div>
            </div>
        </div>
    );
}

