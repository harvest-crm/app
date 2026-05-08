"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { blockIfImpersonating } from "@/lib/admin/impersonation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedTask = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  taskType: string | null;
  dueAt: string | null;       // ISO
  reminderAt: string | null;  // ISO
  completedAt: string | null; // ISO
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
  createdAt: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_PRIORITIES = ["low", "medium", "high"] as const;
const VALID_TASK_TYPES = [
  "call", "email", "meeting_prep", "follow_up", "document_review", "other",
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function serialize(t: {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  taskType: string | null;
  dueAt: Date | null;
  reminderAt: Date | null;
  completedAt: Date | null;
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
  createdAt: Date;
}): SerializedTask {
  return {
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
  };
}

// dueDate = YYYY-MM-DD, dueTime = HH:MM (24h) or ""
function parseDueAt(dueDate: string, dueTime: string): Date {
  if (dueTime) return new Date(`${dueDate}T${dueTime}:00Z`);
  return new Date(`${dueDate}T12:00:00Z`); // noon UTC default — avoids timezone day-shift
}

function calcReminderAt(
  reminderType: string,
  reminderCustom: string,
  dueAt: Date | null,
): Date | null {
  if (!reminderType || reminderType === "none") return null;
  if (reminderType === "custom") return reminderCustom ? new Date(reminderCustom) : null;
  if (!dueAt) return null;
  const offsets: Record<string, number> = {
    "15min": 15 * 60 * 1000,
    "1hr":   60 * 60 * 1000,
    "1day":  24 * 60 * 60 * 1000,
  };
  const ms = offsets[reminderType];
  return ms != null ? new Date(dueAt.getTime() - ms) : null;
}

function extractTaskData(formData: FormData) {
  const dueDate = (formData.get("dueDate") as string) || "";
  const dueTime = (formData.get("dueTime") as string) || "";
  const dueAt = dueDate ? parseDueAt(dueDate, dueTime) : null;

  const reminderType   = (formData.get("reminderType")   as string) || "none";
  const reminderCustom = (formData.get("reminderCustom") as string) || "";
  const reminderAt = calcReminderAt(reminderType, reminderCustom, dueAt);

  const priority = (formData.get("priority") as string) || "medium";
  const taskType = (formData.get("taskType") as string) || null;

  return {
    title:       ((formData.get("title")       as string) ?? "").trim(),
    description: ((formData.get("description") as string) || "").trim() || null,
    priority,
    taskType:    taskType && taskType !== "" ? taskType : null,
    dueAt,
    reminderAt,
    contactId:   (formData.get("contactId")   as string) || null,
    dealId:      (formData.get("dealId")      as string) || null,
    workspaceId: (formData.get("workspaceId") as string) || null,
  };
}

function validateEnums(priority: string, taskType: string | null): string | null {
  if (!VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])) {
    return "Invalid priority";
  }
  if (taskType && !VALID_TASK_TYPES.includes(taskType as (typeof VALID_TASK_TYPES)[number])) {
    return "Invalid task type";
  }
  return null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createTask(
  formData: FormData
): Promise<{ task: SerializedTask } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  const data = extractTaskData(formData);

  if (!data.title) return { error: "Title is required" };
  const enumErr = validateEnums(data.priority, data.taskType);
  if (enumErr) return { error: enumErr };

  const task = await db.task.create({
    data: {
      organizationId,
      title:       data.title,
      description: data.description,
      priority:    data.priority,
      taskType:    data.taskType,
      dueAt:       data.dueAt,
      reminderAt:  data.reminderAt,
      contactId:   data.contactId,
      dealId:      data.dealId,
      workspaceId: data.workspaceId,
    },
  });

  if (data.contactId) revalidatePath(`/contacts/${data.contactId}`);

  return { task: serialize(task) };
}

export async function updateTask(
  id: string,
  formData: FormData
): Promise<{ task: SerializedTask } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };

  const data = extractTaskData(formData);
  if (!data.title) return { error: "Title is required" };
  const enumErr = validateEnums(data.priority, data.taskType);
  if (enumErr) return { error: enumErr };

  const task = await db.task.update({
    where: { id },
    data: {
      title:       data.title,
      description: data.description,
      priority:    data.priority,
      taskType:    data.taskType,
      dueAt:       data.dueAt,
      reminderAt:  data.reminderAt,
    },
  });

  return { task: serialize(task) };
}

export async function completeTask(
  id: string
): Promise<{ task: SerializedTask } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };
  const task = await db.task.update({ where: { id }, data: { completedAt: new Date() } });
  return { task: serialize(task) };
}

export async function reopenTask(
  id: string
): Promise<{ task: SerializedTask } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };
  const task = await db.task.update({ where: { id }, data: { completedAt: null } });
  return { task: serialize(task) };
}

export async function deleteTask(
  id: string
): Promise<{ success: true } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };
  await db.task.delete({ where: { id } });
  return { success: true };
}

export async function listTasksForContact(
  contactId: string
): Promise<SerializedTask[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.task.findMany({
    where: { contactId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(serialize);
}

export async function listTasksForDeal(
  dealId: string
): Promise<SerializedTask[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.task.findMany({
    where: { dealId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map(serialize);
}

export async function listTasksForWorkspace(
  workspaceId: string
): Promise<SerializedTask[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.task.findMany({
    where: { workspaceId, organizationId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(serialize);
}
