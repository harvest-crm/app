import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { WorkspaceTasksView } from "@/components/workspace-tasks-view";
import type { SerializedTask } from "@/app/actions/tasks";

export default async function TasksPage({
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
    select: { id: true, name: true, color: true, slug: true },
  });
  if (!workspace) notFound();

  const rawTasks = await db.task.findMany({
    where: { workspaceId: workspace.id, organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const tasks: SerializedTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    taskType: t.taskType,
    dueAt: t.dueAt?.toISOString() ?? null,
    reminderAt: t.reminderAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    contactId: t.contactId,
    dealId: t.dealId,
    workspaceId: t.workspaceId,
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <WorkspaceTasksView
      workspace={{ id: workspace.id, name: workspace.name, color: workspace.color }}
      initialTasks={tasks}
    />
  );
}
