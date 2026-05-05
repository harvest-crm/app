import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar workspaces={workspaces} />
      <main className="flex-1 overflow-y-auto bg-slate-50">
        {children}
      </main>
    </div>
  );
}
