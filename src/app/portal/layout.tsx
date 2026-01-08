import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";

export default async function PortalLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    // Safe to call getUser, if fails or no user, redirect.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    // Fetch profile for name display
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

    return (
        <PortalShell userEmail={user.email} userName={profile?.full_name}>
            {children}
        </PortalShell>
    );
}
