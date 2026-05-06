"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedTask = {
  id: string;
  title: string;
  dueAt: string | null; // ISO
  completedAt: string | null; // ISO
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
  createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function serialize(t: {
  id: string;
  title: string;
  dueAt: Date | null;
  completedAt: Date | null;
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
  createdAt: Date;
}): SerializedTask {
  return {
    id: t.id,
    title: t.title,
    dueAt: t.dueAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    contactId: t.contactId,
    dealId: t.dealId,
    workspaceId: t.workspaceId,
    createdAt: t.createdAt.toISOString(),
  };
}

// Parse YYYY-MM-DD from a date input at noon UTC to avoid timezone day-shift
function parseDueDate(raw: string): Date {
  return new Date(raw + "T12:00:00Z");
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createTask(
  formData: FormData
): Promise<{ task: SerializedTask } | { error: string }> {
  const { organizationId } = await requireOrg();

  const title = ((formData.get("title") as string) ?? "").trim();
  const dueAtRaw = (formData.get("dueAt") as string) || "";
  const contactId = (formData.get("contactId") as string) || null;
  const dealId = (formData.get("dealId") as string) || null;
  const workspaceId = (formData.get("workspaceId") as string) || null;

  if (!title) return { error: "Title is required" };

  const task = await db.task.create({
    data: {
      organizationId,
      title,
      dueAt: dueAtRaw ? parseDueDate(dueAtRaw) : null,
      contactId,
      dealId,
      workspaceId,
    },
  });

  if (contactId) revalidatePath(`/contacts/${contactId}`);
  if (workspaceId) revalidatePath(`/workspaces`);

  return { task: serialize(task) };
}

export async function updateTask(
  id: string,
  formData: FormData
): Promise<{ task: SerializedTask } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };

  const title = ((formData.get("title") as string) ?? "").trim();
  const dueAtRaw = (formData.get("dueAt") as string) || "";

  if (!title) return { error: "Title is required" };

  const task = await db.task.update({
    where: { id },
    data: {
      title,
      dueAt: dueAtRaw ? parseDueDate(dueAtRaw) : null,
    },
  });

  return { task: serialize(task) };
}

export async function completeTask(
  id: string
): Promise<{ task: SerializedTask } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };

  const task = await db.task.update({
    where: { id },
    data: { completedAt: new Date() },
  });

  return { task: serialize(task) };
}

export async function reopenTask(
  id: string
): Promise<{ task: SerializedTask } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.task.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Task not found" };

  const task = await db.task.update({
    where: { id },
    data: { completedAt: null },
  });

  return { task: serialize(task) };
}

export async function deleteTask(
  id: string
): Promise<{ success: true } | { error: string }> {
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
