import { fetchSettings } from "@/actions/settings";
import { SettingsForm } from "@/components/admin/settings-form";
import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Fetch existing settings
    const settings = await fetchSettings();

    // --- User Management Data Fetching ---

    // List users for management
    const { data: usersData, error: usersError } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

    if (usersError) console.error("Settings Page: Error fetching users", usersError);

    // Fetch available apps
    const { data: appsData, error: appsError } = await supabaseAdmin
        .from("apps")
        .select("*")
        .eq("active", true)
        .order("name");

    if (appsError) console.error("Settings Page: Error fetching apps", appsError);

    // Fetch all permissions
    const { data: permissionsData, error: permsError } = await supabaseAdmin
        .from("permissions")
        .select("user_id, app_code");

    if (permsError) console.error("Settings Page: Error fetching permissions", permsError);

    // Attach authorized_apps to each user
    const users = (usersData || []).map(u => {
        const userPerms = (permissionsData || [])
            .filter(p => p.user_id === u.id)
            .map(p => p.app_code);

        return {
            ...u,
            authorized_apps: userPerms
        };
    });

    return (
        <div className="space-y-2">
            <SettingsForm
                initialSettings={settings}
                users={users}
                currentUserId={user.id}
                allApps={appsData || []}
            />
        </div>
    );
}
