import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";

export default async function AgentePrensaLayout({
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

    // Fetch profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

    const appLinks = [
        { label: "Dashboard", href: "/agenteprensa", icon: "home" },
        // Add more links here as features are added
    ];

    return (
        <PortalShell userEmail={user.email} userName={profile?.full_name} links={appLinks}>
            {children}
        </PortalShell>
    );
}
