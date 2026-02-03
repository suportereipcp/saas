import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";
import { SidebarLink } from "@/components/portal-sidebar";

// Dashboard links
const sidebarLinks: SidebarLink[] = [
  { label: "Painel 1 TV PCP", href: "/dashboards/pcp", icon: "layout-dashboard" },
  { label: "Painel 2 TV PCP", href: "/dashboards/producao", icon: "activity" },
  { label: "Faturamento", href: "/dashboards/financeiro", icon: "file" },
  { label: "Cal. Produção", href: "/dashboards/calendario-prod", icon: "calendar" },
  { label: "Cal. Faturamento", href: "/dashboards/calendario-fatur", icon: "calendar-check" },
  { label: "Metas", href: "/dashboards/metas", icon: "box" },
];

export default async function DashboardsLayout({
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

  // Permission Check
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    // Check specific permission
    const { data: permission } = await supabase
      .from("permissions")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_code", "dashboards")
      .single();

    if (!permission) {
      return redirect("/portal"); // Access Denied
    }
  }

  return (
    <PortalShell
      userEmail={user.email}
      userName={profile?.full_name}
      links={sidebarLinks}
      defaultOpen={true}
      hideHeader={true}
      fullWidth={true}
    >
      <div className="h-full w-full overflow-auto font-sans">
        {children}
      </div>
    </PortalShell>
  );
}
