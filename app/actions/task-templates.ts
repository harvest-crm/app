"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { hasRole } from "@/lib/admin/server-permissions";
import { seedRealEstateTemplates } from "@/lib/task-templates/seed-real-estate-templates";
import { applyTaskTemplate } from "@/lib/task-templates/apply-template";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedTemplate = {
  id: string;
  name: string;
  description: string | null;
  appliesTo: string;
  sortOrder: number;
  workspaceId: string | null;
  itemCount: number;
};

export type SerializedTemplateItem = {
  id: string;
  templateId: string;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  dueOffsetDays: number;
  reminderOffsetMinutes: number | null;
  sortOrder: number;
};

export type SerializedTemplateWithItems = SerializedTemplate & {
  items: SerializedTemplateItem[];
};

function serTemplate(t: {
  id: string; name: string; description: string | null; appliesTo: string;
  sortOrder: number; workspaceId: string | null;
  tasks?: { id: string }[];
}): SerializedTemplate {
  return {
    id: t.id, name: t.name, description: t.description,
    appliesTo: t.appliesTo, sortOrder: t.sortOrder,
    workspaceId: t.workspaceId, itemCount: t.tasks?.length ?? 0,
  };
}

function serItem(i: {
  id: string; templateId: string; title: string; description: string | null;
  taskType: string; priority: string; dueOffsetDays: number;
  reminderOffsetMinutes: number | null; sortOrder: number;
}): SerializedTemplateItem {
  return {
    id: i.id, templateId: i.templateId, title: i.title,
    description: i.description, taskType: i.taskType, priority: i.priority,
    dueOffsetDays: i.dueOffsetDays, reminderOffsetMinutes: i.reminderOffsetMinutes,
    sortOrder: i.sortOrder,
  };
}

// ── List / Get ────────────────────────────────────────────────────────────────

export async function listTemplates(): Promise<SerializedTemplate[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.taskTemplate.findMany({
    where: { organizationId },
    include: { tasks: { select: { id: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(serTemplate);
}

export async function getTemplate(id: string): Promise<SerializedTemplateWithItems | null> {
  const { organizationId } = await requireOrg();
  const t = await db.taskTemplate.findFirst({
    where: { id, organizationId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!t) return null;
  return { ...serTemplate({ ...t, tasks: t.tasks }), items: t.tasks.map(serItem) };
}

export async function listApplicableTemplates(
  entityType: "contact" | "deal",
): Promise<SerializedTemplate[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.taskTemplate.findMany({
    where: { organizationId, appliesTo: { in: [entityType, "both"] } },
    include: { tasks: { select: { id: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(serTemplate);
}

// ── Create / Update / Delete ──────────────────────────────────────────────────

export async function createTemplate(data: {
  name: string; description?: string; appliesTo?: string; workspaceId?: string | null;
}): Promise<{ template: SerializedTemplate } | { error: string }> {
  const { organizationId, userId } = await requireOrg();
  if (!data.name.trim()) return { error: "Name is required" };

  const maxSort = await db.taskTemplate.aggregate({
    where: { organizationId }, _max: { sortOrder: true },
  });

  const t = await db.taskTemplate.create({
    data: {
      organizationId,
      workspaceId: data.workspaceId ?? null,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      appliesTo: data.appliesTo ?? "both",
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      createdBy: userId,
    },
    include: { tasks: { select: { id: true } } },
  });
  return { template: serTemplate(t) };
}

export async function updateTemplate(
  id: string,
  data: Partial<{ name: string; description: string | null; appliesTo: string }>,
): Promise<{ template: SerializedTemplate } | { error: string }> {
  const { organizationId } = await requireOrg();
  const existing = await db.taskTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Template not found" };

  const t = await db.taskTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.appliesTo !== undefined ? { appliesTo: data.appliesTo } : {}),
      updatedAt: new Date(),
    },
    include: { tasks: { select: { id: true } } },
  });
  return { template: serTemplate(t) };
}

export async function deleteTemplate(
  id: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required to delete templates." };
  const existing = await db.taskTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Template not found" };
  await db.taskTemplate.delete({ where: { id } });
  return { success: true };
}

export async function duplicateTemplate(
  id: string,
): Promise<{ template: SerializedTemplate } | { error: string }> {
  const { organizationId, userId } = await requireOrg();
  const src = await db.taskTemplate.findFirst({
    where: { id, organizationId },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!src) return { error: "Template not found" };

  const maxSort = await db.taskTemplate.aggregate({
    where: { organizationId }, _max: { sortOrder: true },
  });

  const copy = await db.taskTemplate.create({
    data: {
      organizationId,
      workspaceId: src.workspaceId,
      name: `${src.name} (copy)`,
      description: src.description,
      appliesTo: src.appliesTo,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      createdBy: userId,
      tasks: {
        create: src.tasks.map((item) => ({
          title: item.title, description: item.description,
          taskType: item.taskType, priority: item.priority,
          dueOffsetDays: item.dueOffsetDays,
          reminderOffsetMinutes: item.reminderOffsetMinutes,
          sortOrder: item.sortOrder,
        })),
      },
    },
    include: { tasks: { select: { id: true } } },
  });
  return { template: serTemplate(copy) };
}

// ── Template items ─────────────────────────────────────────────────────────────

export async function createTemplateItem(
  templateId: string,
  data: { title: string; description?: string; taskType?: string; priority?: string; dueOffsetDays?: number; reminderOffsetMinutes?: number | null },
): Promise<{ item: SerializedTemplateItem } | { error: string }> {
  const { organizationId } = await requireOrg();
  const tmpl = await db.taskTemplate.findFirst({
    where: { id: templateId, organizationId },
    include: { tasks: { select: { sortOrder: true }, orderBy: { sortOrder: "desc" }, take: 1 } },
  });
  if (!tmpl) return { error: "Template not found" };
  if (!data.title?.trim()) return { error: "Title is required" };

  const maxSort = tmpl.tasks[0]?.sortOrder ?? -1;
  const item = await db.taskTemplateItem.create({
    data: {
      templateId,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      taskType: data.taskType ?? "other",
      priority: data.priority ?? "medium",
      dueOffsetDays: data.dueOffsetDays ?? 0,
      reminderOffsetMinutes: data.reminderOffsetMinutes ?? null,
      sortOrder: maxSort + 1,
    },
  });
  return { item: serItem(item) };
}

export async function updateTemplateItem(
  itemId: string,
  data: Partial<{ title: string; description: string | null; taskType: string; priority: string; dueOffsetDays: number; reminderOffsetMinutes: number | null }>,
): Promise<{ item: SerializedTemplateItem } | { error: string }> {
  const { organizationId } = await requireOrg();
  const existing = await db.taskTemplateItem.findFirst({
    where: { id: itemId }, include: { template: true },
  });
  if (!existing || existing.template.organizationId !== organizationId) {
    return { error: "Item not found" };
  }
  const item = await db.taskTemplateItem.update({
    where: { id: itemId },
    data: {
      ...(data.title !== undefined      ? { title: data.title }                           : {}),
      ...(data.description !== undefined? { description: data.description }               : {}),
      ...(data.taskType !== undefined   ? { taskType: data.taskType }                     : {}),
      ...(data.priority !== undefined   ? { priority: data.priority }                     : {}),
      ...(data.dueOffsetDays !== undefined ? { dueOffsetDays: data.dueOffsetDays }        : {}),
      ...(data.reminderOffsetMinutes !== undefined ? { reminderOffsetMinutes: data.reminderOffsetMinutes } : {}),
    },
  });
  return { item: serItem(item) };
}

export async function deleteTemplateItem(
  itemId: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();
  const existing = await db.taskTemplateItem.findFirst({
    where: { id: itemId }, include: { template: true },
  });
  if (!existing || existing.template.organizationId !== organizationId) {
    return { error: "Item not found" };
  }
  await db.taskTemplateItem.delete({ where: { id: itemId } });
  return { success: true };
}

export async function reorderTemplateItems(
  templateId: string,
  orderedIds: string[],
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();
  const tmpl = await db.taskTemplate.findFirst({ where: { id: templateId, organizationId } });
  if (!tmpl) return { error: "Template not found" };
  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.taskTemplateItem.update({ where: { id }, data: { sortOrder: idx } }),
    ),
  );
  return { success: true };
}

// ── Seed + Apply ──────────────────────────────────────────────────────────────

export async function seedRealEstatePack(): Promise<{ templatesCreated: number } | { error: string }> {
  const { organizationId, userId } = await requireOrg();
  // Check if templates already exist
  const existing = await db.taskTemplate.count({ where: { organizationId } });
  if (existing > 0) return { error: "Templates already exist" };
  return seedRealEstateTemplates({ organizationId, workspaceId: null, userId });
}

export async function applyTemplateToEntity(
  templateId: string,
  entityType: "contact" | "deal",
  entityId: string,
): Promise<{ tasksCreated: number } | { error: string }> {
  const { organizationId, userId } = await requireOrg();
  const result = await applyTaskTemplate({
    templateId,
    attachTo: { type: entityType, id: entityId },
    organizationId,
    userId,
  });
  return result.tasksCreated > 0 || true ? result : { error: "Failed to apply template" };
}
