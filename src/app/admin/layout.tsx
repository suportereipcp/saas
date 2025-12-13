import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Fetch profile to check admin status
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, is_super_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_super_admin) {
        return redirect("/portal"); // Kick non-admins back to portal
    }

    // Fetch all apps for the sidebar navigation
    const { data: apps } = await supabase.from("apps").select("*").order("name");

    const systemLinks = [
        { label: "Geral do Sistema", href: "/admin", icon: "settings" }
    ];

    const appLinks = apps?.filter(app => app.code !== 'admin').map(app => ({
        label: app.name,
        href: `/admin/${app.code}`,
        icon: "box"
    })) || [];

    const adminLinks = [...systemLinks, ...appLinks];

    return (
        <PortalShell userEmail={user.email} userName={profile.full_name} links={adminLinks}>
            {children}
        </PortalShell>
    );
}
