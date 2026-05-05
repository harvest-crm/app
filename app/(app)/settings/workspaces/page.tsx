import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { WorkspaceList } from "@/components/workspace-list";

export default async function WorkspacesSettingsPage() {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (!org) return null;

  const workspaces = await db.workspace.findMany({
    where: { organizationId: org.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Workspaces</h1>
      <p className="mb-6 text-sm text-slate-500">
        Each workspace is a pipeline with its own stages, templates, and settings.
      </p>
      <WorkspaceList workspaces={workspaces} />
    </div>
  );
}
