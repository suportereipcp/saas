import { createClient } from "@/lib/supabase-server";
import { PortalShell } from "@/components/portal-shell";
import { redirect } from "next/navigation";
import { SidebarLink } from "@/components/portal-sidebar";

export const metadata = {
  title: 'ShiftApp - Dashboard',
  description: 'Gerenciamento de Mod. Fundido',
};

export default async function ShiftAppLayout({
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
    { label: "Painel", href: "/shift-app", icon: "layout-dashboard" },
    { label: "Alterações", href: "/shift-app/tickets", icon: "ticket" },
  ];

  return (
    <PortalShell userEmail={user.email} userName={profile?.full_name} links={sidebarLinks} fullWidth>
      <div className="flex-1 h-full overflow-hidden">
        {children}
      </div>
    </PortalShell>
  );
}
