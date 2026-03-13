"use client";

import { usePathname } from "next/navigation";
import { PortalShell } from "@/components/portal-shell";
import { SidebarLink } from "@/components/portal-sidebar";

export function OeeShell({ 
  children, 
  userEmail, 
  userName, 
  links 
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  userName?: string | null;
  links: SidebarLink[];
}) {
  const pathname = usePathname();
  
  // Conditionally show links only if we are NOT exactly on the root page
  const showLinks = pathname !== "/oee-teep";

  return (
    <PortalShell
      userEmail={userEmail}
      userName={userName}
      links={showLinks ? links : []}
      fullWidth
    >
      {children}
    </PortalShell>
  );
}
