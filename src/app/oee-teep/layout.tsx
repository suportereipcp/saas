import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { OeeShell } from "./oee-shell";
import { SidebarLink } from "@/components/portal-sidebar";

export default async function OeeTeepLayout({
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
    .select("full_name, is_super_admin")
    .eq("id", user.id)
    .single();

  const links: SidebarLink[] = [
    {
      label: "Dashboards",
      href: "/oee-teep/prensa-rubber",
      icon: "layout-dashboard",
    },
    {
      label: "OEE",
      href: "/oee-teep/prensa-rubber/oee",
      icon: "bar-chart-3",
    },
    {
      label: "TEEP",
      href: "/oee-teep/prensa-rubber/teep",
      icon: "trending-up",
    },
    {
      label: "OEE Máquinas",
      href: "/oee-teep/prensa-rubber/oee-maquinas",
      icon: "activity",
    },
  ];

  return (
    <OeeShell
      userEmail={user.email}
      userName={profile?.full_name}
      links={links}
    >
      {children}
    </OeeShell>
  );
}
