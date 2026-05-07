import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AppShell } from "@/components/app-shell";
import { SearchProvider, SearchModal } from "@/components/search-modal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { orgId: clerkOrgId } = await auth();

  let workspaces: Awaited<ReturnType<typeof db.workspace.findMany>> = [];

  if (clerkOrgId) {
    const org = await db.organization.findUnique({
      where: { clerkOrgId },
      select: { id: true },
    });

    if (org) {
      workspaces = await db.workspace.findMany({
        where: { organizationId: org.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
    }
  }

  return (
    <SearchProvider>
      <AppShell workspaces={workspaces}>
        {children}
      </AppShell>
      <SearchModal />
    </SearchProvider>
  );
}
