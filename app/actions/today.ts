"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export async function snoozeReminder(
  taskId: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.task.findFirst({ where: { id: taskId, organizationId } });
  if (!existing) return { error: "Task not found" };

  await db.task.update({ where: { id: taskId }, data: { reminderAt: null } });

  return { success: true };
}
