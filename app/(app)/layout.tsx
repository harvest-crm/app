import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { SearchProvider, SearchModal } from "@/components/search-modal";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { getImpersonationContext } from "@/lib/admin/impersonation";
import { isPlatformAdmin } from "@/lib/admin/platform-auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { orgId: clerkOrgId, userId } = await auth();

  // Check for impersonation cookie
  const impCtx = await getImpersonationContext();

  let workspaces: Awaited<ReturnType<typeof db.workspace.findMany>> = [];
  let impersonatedOrgName: string | null = null;
  let impersonatedOrgId: string | null = null;

  if (impCtx) {
    // Impersonation mode — load the impersonated org's workspaces
    const impOrg = await db.organization.findUnique({
      where: { id: impCtx.orgId },
      select: { id: true, name: true },
    });
    if (impOrg) {
      impersonatedOrgName = impOrg.name;
      impersonatedOrgId = impOrg.id;
      workspaces = await db.workspace.findMany({
        where: { organizationId: impOrg.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }
  } else if (clerkOrgId) {
    const org = await db.organization.findUnique({
      where: { clerkOrgId },
      select: { id: true, isSuspended: true, accessStatus: true },
    });

    if (org) {
      // Platform admins bypass all access gates
      const isAdmin = userId ? await isPlatformAdmin(userId) : false;

      if (org.isSuspended && !isAdmin) redirect("/suspended");
      if (org.accessStatus === "PENDING"  && !isAdmin) redirect("/pending");
      if (org.accessStatus === "REJECTED" && !isAdmin) redirect("/rejected");

      workspaces = await db.workspace.findMany({
        where: { organizationId: org.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }
  }

  return (
    <SearchProvider>
      {impersonatedOrgName && impersonatedOrgId && (
        <ImpersonationBanner orgName={impersonatedOrgName} orgId={impersonatedOrgId} />
      )}
      <AppShell workspaces={workspaces}>
        {children}
      </AppShell>
      <SearchModal />
    </SearchProvider>
  );
}
