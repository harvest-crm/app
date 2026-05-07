"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { applyTaskTemplate } from "@/lib/task-templates/apply-template";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function validateOwnership(contactIds: string[], organizationId: string): Promise<boolean> {
  if (contactIds.length === 0) return false;
  const count = await db.contact.count({
    where: { id: { in: contactIds }, organizationId },
  });
  return count === contactIds.length;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function bulkTagContacts(
  contactIds: string[],
  tagIds: string[],
): Promise<{ tagged: number } | { error: string }> {
  const { organizationId } = await requireOrg();

  if (contactIds.length === 0 || tagIds.length === 0) return { tagged: 0 };
  if (!(await validateOwnership(contactIds, organizationId))) {
    return { error: "Some contacts not found" };
  }

  // Verify tags belong to org
  const tagCount = await db.tag.count({ where: { id: { in: tagIds }, organizationId } });
  if (tagCount !== tagIds.length) return { error: "Some tags not found" };

  await db.contactTag.createMany({
    data: contactIds.flatMap((contactId) => tagIds.map((tagId) => ({ contactId, tagId }))),
    skipDuplicates: true,
  });

  revalidatePath("/contacts");
  return { tagged: contactIds.length };
}

export async function bulkAssignWorkspace(
  contactIds: string[],
  workspaceId: string,
  replace: boolean,
): Promise<{ assigned: number } | { error: string }> {
  const { organizationId } = await requireOrg();

  if (contactIds.length === 0) return { assigned: 0 };
  if (!(await validateOwnership(contactIds, organizationId))) {
    return { error: "Some contacts not found" };
  }
  const ws = await db.workspace.findFirst({ where: { id: workspaceId, organizationId } });
  if (!ws) return { error: "Workspace not found" };

  if (replace) {
    await db.contactWorkspace.deleteMany({ where: { contactId: { in: contactIds } } });
  }

  await db.contactWorkspace.createMany({
    data: contactIds.map((contactId) => ({ contactId, workspaceId })),
    skipDuplicates: true,
  });

  revalidatePath("/contacts");
  return { assigned: contactIds.length };
}

export async function bulkApplyTemplate(
  contactIds: string[],
  templateId: string,
): Promise<{ contactsProcessed: number; tasksCreated: number; errors: number } | { error: string }> {
  const { organizationId, userId } = await requireOrg();

  if (contactIds.length === 0) return { contactsProcessed: 0, tasksCreated: 0, errors: 0 };
  if (!(await validateOwnership(contactIds, organizationId))) {
    return { error: "Some contacts not found" };
  }
  const template = await db.taskTemplate.findFirst({ where: { id: templateId, organizationId } });
  if (!template) return { error: "Template not found" };

  let tasksCreated = 0;
  let errors = 0;

  for (const contactId of contactIds) {
    const result = await applyTaskTemplate({
      templateId,
      attachTo: { type: "contact", id: contactId },
      organizationId,
      userId,
    });
    if (result.tasksCreated > 0) {
      tasksCreated += result.tasksCreated;
    } else {
      errors++;
    }
  }

  revalidatePath("/contacts");
  return { contactsProcessed: contactIds.length, tasksCreated, errors };
}

export async function bulkDeleteContacts(
  contactIds: string[],
): Promise<{ deleted: number } | { error: string }> {
  const { organizationId } = await requireOrg();

  if (contactIds.length === 0) return { deleted: 0 };
  if (!(await validateOwnership(contactIds, organizationId))) {
    return { error: "Some contacts not found" };
  }

  // Delete documents first (avoid R2 key orphans in DB)
  await db.document.deleteMany({ where: { contactId: { in: contactIds } } });

  // Delete contacts — ContactTag + ContactWorkspace cascade; Task/Activity/Deal.contactId set to null
  await db.contact.deleteMany({ where: { id: { in: contactIds }, organizationId } });

  revalidatePath("/contacts");
  return { deleted: contactIds.length };
}
