import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AutomationManager } from "@/components/automations/automation-manager";
import type { SerializedAutomation } from "@/app/actions/automations";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { slug } = await params;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const workspace = await db.workspace.findFirst({
    where: { slug, organizationId: org.id },
    select: { id: true, name: true },
  });
  if (!workspace) notFound();

  const [stages, rawAutomations] = await Promise.all([
    db.stage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, sortOrder: true },
    }),
    db.stageAutomation.findMany({
      where: { workspaceId: workspace.id, organizationId: org.id },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  const automations: SerializedAutomation[] = rawAutomations.map((a) => ({
    id: a.id,
    stageId: a.stageId,
    isEnabled: a.isEnabled,
    tasks: a.tasks.map((t) => ({
      id: t.id,
      automationId: t.automationId,
      title: t.title,
      description: t.description,
      taskType: t.taskType,
      priority: t.priority,
      dueOffsetDays: t.dueOffsetDays,
      reminderOffsetMinutes: t.reminderOffsetMinutes,
      sortOrder: t.sortOrder,
    })),
  }));

  return (
    <div className="p-8">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">⚡</span>
        <h1 className="text-2xl font-semibold text-[#0F2540]">{workspace.name} · Automations</h1>
      </div>
      <p className="mb-8 text-sm text-[#3D5775]">
        When a deal moves to a stage, automatically create these tasks and log the stage change.
      </p>

      <AutomationManager
        workspaceId={workspace.id}
        stages={stages}
        initialAutomations={automations}
        hasAnyAutomation={automations.length > 0}
      />
    </div>
  );
}
