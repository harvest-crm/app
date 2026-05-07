"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { REAL_ESTATE_RESIDENTIAL_STAGE_TEMPLATES } from "@/lib/profession-templates";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedAutomationTask = {
  id: string;
  automationId: string;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  dueOffsetDays: number;
  reminderOffsetMinutes: number | null;
  sortOrder: number;
};

export type SerializedAutomation = {
  id: string;
  stageId: string;
  isEnabled: boolean;
  tasks: SerializedAutomationTask[];
};

function serTask(t: {
  id: string; automationId: string; title: string; description: string | null;
  taskType: string; priority: string; dueOffsetDays: number;
  reminderOffsetMinutes: number | null; sortOrder: number;
}): SerializedAutomationTask {
  return {
    id: t.id, automationId: t.automationId, title: t.title,
    description: t.description, taskType: t.taskType, priority: t.priority,
    dueOffsetDays: t.dueOffsetDays, reminderOffsetMinutes: t.reminderOffsetMinutes,
    sortOrder: t.sortOrder,
  };
}

function serAutomation(a: {
  id: string; stageId: string; isEnabled: boolean;
  tasks: Parameters<typeof serTask>[0][];
}): SerializedAutomation {
  return {
    id: a.id, stageId: a.stageId, isEnabled: a.isEnabled,
    tasks: a.tasks.map(serTask),
  };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function listAutomationsForWorkspace(
  workspaceId: string,
): Promise<SerializedAutomation[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.stageAutomation.findMany({
    where: { workspaceId, organizationId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  return rows.map(serAutomation);
}

export async function toggleStageAutomation(
  stageId: string,
  isEnabled: boolean,
): Promise<{ automation: SerializedAutomation } | { error: string }> {
  const { organizationId } = await requireOrg();

  const stage = await db.stage.findFirst({
    where: { id: stageId },
    include: { workspace: true },
  });
  if (!stage || stage.workspace.organizationId !== organizationId) {
    return { error: "Stage not found" };
  }

  const automation = await db.stageAutomation.upsert({
    where: { stageId },
    create: { organizationId, workspaceId: stage.workspaceId, stageId, isEnabled },
    update: { isEnabled, updatedAt: new Date() },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });

  return { automation: serAutomation(automation) };
}

export async function createAutomationTask(
  automationId: string,
  data: {
    title: string;
    description?: string;
    taskType?: string;
    priority?: string;
    dueOffsetDays?: number;
    reminderOffsetMinutes?: number | null;
  },
): Promise<{ task: SerializedAutomationTask } | { error: string }> {
  const { organizationId } = await requireOrg();

  const automation = await db.stageAutomation.findFirst({
    where: { id: automationId, organizationId },
    include: { tasks: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!automation) return { error: "Automation not found" };

  if (!data.title?.trim()) return { error: "Title is required" };

  const maxSort = automation.tasks[0]?.sortOrder ?? -1;

  const task = await db.stageAutomationTask.create({
    data: {
      automationId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      taskType: data.taskType ?? "other",
      priority: data.priority ?? "medium",
      dueOffsetDays: data.dueOffsetDays ?? 0,
      reminderOffsetMinutes: data.reminderOffsetMinutes ?? null,
      sortOrder: maxSort + 1,
    },
  });

  return { task: serTask(task) };
}

export async function updateAutomationTask(
  taskId: string,
  data: Partial<{
    title: string;
    description: string | null;
    taskType: string;
    priority: string;
    dueOffsetDays: number;
    reminderOffsetMinutes: number | null;
  }>,
): Promise<{ task: SerializedAutomationTask } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.stageAutomationTask.findFirst({
    where: { id: taskId },
    include: { automation: true },
  });
  if (!existing || existing.automation.organizationId !== organizationId) {
    return { error: "Task not found" };
  }

  const task = await db.stageAutomationTask.update({
    where: { id: taskId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.taskType !== undefined ? { taskType: data.taskType } : {}),
      ...(data.priority !== undefined ? { priority: data.priority } : {}),
      ...(data.dueOffsetDays !== undefined ? { dueOffsetDays: data.dueOffsetDays } : {}),
      ...(data.reminderOffsetMinutes !== undefined ? { reminderOffsetMinutes: data.reminderOffsetMinutes } : {}),
    },
  });

  return { task: serTask(task) };
}

export async function deleteAutomationTask(
  taskId: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.stageAutomationTask.findFirst({
    where: { id: taskId },
    include: { automation: true },
  });
  if (!existing || existing.automation.organizationId !== organizationId) {
    return { error: "Task not found" };
  }

  await db.stageAutomationTask.delete({ where: { id: taskId } });
  return { success: true };
}

export async function reorderAutomationTasks(
  automationId: string,
  orderedIds: string[],
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const automation = await db.stageAutomation.findFirst({ where: { id: automationId, organizationId } });
  if (!automation) return { error: "Automation not found" };

  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.stageAutomationTask.update({ where: { id }, data: { sortOrder: idx } }),
    ),
  );

  return { success: true };
}

// ── Part G: Backfill for existing workspaces ──────────────────────────────────

export async function applyRealEstateTemplate(
  workspaceId: string,
): Promise<{ applied: number; stages: number } | { error: string }> {
  const { organizationId } = await requireOrg();

  const workspace = await db.workspace.findFirst({ where: { id: workspaceId, organizationId } });
  if (!workspace) return { error: "Workspace not found" };

  const stages = await db.stage.findMany({
    where: { workspaceId },
    orderBy: { sortOrder: "asc" },
  });

  // Templates with tasks (skip stages with empty task arrays)
  const templatesWithTasks = REAL_ESTATE_RESIDENTIAL_STAGE_TEMPLATES.filter(
    (t) => t.automationTasks.length > 0,
  );

  let applied = 0;

  for (const stage of stages) {
    const nameLower = stage.name.toLowerCase();

    // Find a matching template by substring
    const match = templatesWithTasks.find((tmpl) => {
      const key = tmpl.name.toLowerCase();
      // Check if stage name contains any significant word from the template
      return nameLower.includes(key) || key.includes(nameLower);
    });

    // Also try partial word matching for common abbreviations
    const partialMatch = !match && templatesWithTasks.find((tmpl) => {
      const words = tmpl.name.toLowerCase().split(" ");
      return words.some((w) => w.length > 4 && nameLower.includes(w));
    });

    const template = match ?? partialMatch;
    if (!template) continue;

    // Skip if already has an automation
    const existing = await db.stageAutomation.findUnique({ where: { stageId: stage.id } });
    if (existing) continue;

    await db.stageAutomation.create({
      data: {
        organizationId,
        workspaceId,
        stageId: stage.id,
        isEnabled: true,
        tasks: {
          create: template.automationTasks.map((t) => ({
            title: t.title,
            description: t.description ?? null,
            taskType: t.taskType,
            priority: t.priority,
            dueOffsetDays: t.dueOffsetDays,
            reminderOffsetMinutes: t.reminderOffsetMinutes ?? null,
            sortOrder: t.sortOrder,
          })),
        },
      },
    });

    applied++;
  }

  return { applied, stages: stages.length };
}
