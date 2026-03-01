import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { SidebarLink } from "@/components/portal-sidebar";

export default async function ApontRubberPrensaLayout({
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

  // Obter perfil para nome, e checar se é admin para ver a gestão
  const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, is_super_admin")
      .eq("id", user.id)
      .single();

  const isAdmin = profile?.is_super_admin || false;

  // Montar Links da Sidebar
  const links: SidebarLink[] = [
      {
          label: "Máquinas",
          href: "/apont-rubber-prensa/operador",
          icon: "gauge"
      }
  ];

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
