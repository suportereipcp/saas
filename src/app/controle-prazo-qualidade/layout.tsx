import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";
import { SidebarLink } from "@/components/portal-sidebar";

export default async function ControleQualidadeLayout({
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

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

    const sidebarLinks: SidebarLink[] = [
        { label: "Dashboard", href: "/controle-prazo-qualidade", icon: "layout-dashboard" },
        { label: "Painel TV", href: "/controle-prazo-qualidade?view=TV_DASHBOARD", icon: "monitor-play" },
        { label: "Lavagem", href: "/controle-prazo-qualidade?view=WASHING_STATION", icon: "droplets" },
        { label: "Adesivo", href: "/controle-prazo-qualidade?view=ADHESIVE_STATION", icon: "sticker" },
        { label: "Relatórios", href: "/controle-prazo-qualidade?view=HISTORY", icon: "history" },
        { label: "Transferência", href: "/controle-prazo-qualidade/transferencia", icon: "arrow-right-left" },
        { label: "Almox. Perfil", href: "/controle-prazo-qualidade?view=PROFILE_WAREHOUSE", icon: "box" },
        { label: "Solic. Ferragem", href: "/controle-prazo-qualidade?view=HARDWARE_REQUEST", icon: "hammer" },
    ];

    return (
        <PortalShell userEmail={user.email} userName={profile?.full_name} links={sidebarLinks}>
            <div className="flex-1 h-full overflow-hidden">
                {children}
            </div>
        </PortalShell>
    );
}
