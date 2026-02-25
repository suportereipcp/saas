import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";
import { SidebarLink } from "@/components/portal-sidebar";

export default async function InventarioLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch Profile for Name/Email and Admin Status
    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, is_super_admin")
        .eq("id", user.id)
        .single();

    // Define Links
    const links: SidebarLink[] = [
        {
            label: "Contagens",
            href: "/inventario-rotativo",
            icon: "clipboard-list"
        }
    ];

    // Only add Acompanhamento for Admins
    if (profile?.is_super_admin) {
        links.push({
            label: "Acompanhamento",
            href: "/inventario-rotativo/acompanhamento",
            icon: "activity" // Using Activity/LineChart equivalent
        });
    }

    return (
        <PortalShell
            userEmail={user.email}
            userName={profile?.full_name}
            links={links}
            fullWidth
        >
            {children}
        </PortalShell>
    );
}
