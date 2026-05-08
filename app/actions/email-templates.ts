"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { seedRealEstateEmailTemplates } from "@/lib/email-templates/seed-real-estate-templates";
import { blockIfImpersonating } from "@/lib/admin/impersonation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedEmailTemplate = {
  id: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  appliesTo: string;
  sortOrder: number;
  workspaceId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

function serialize(t: {
  id: string; name: string; description: string | null; subject: string; body: string;
  appliesTo: string; sortOrder: number; workspaceId: string | null; createdBy: string;
  createdAt: Date; updatedAt: Date;
}): SerializedEmailTemplate {
  return {
    id: t.id, name: t.name, description: t.description, subject: t.subject, body: t.body,
    appliesTo: t.appliesTo, sortOrder: t.sortOrder, workspaceId: t.workspaceId,
    createdBy: t.createdBy, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
  };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listEmailTemplates(
  context?: "contact" | "deal",
): Promise<SerializedEmailTemplate[]> {
  const { organizationId } = await requireOrg();

  const templates = await db.emailTemplate.findMany({
    where: {
      organizationId,
      ...(context
        ? { appliesTo: { in: [context, "both"] } }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return templates.map(serialize);
}

// ── Get ───────────────────────────────────────────────────────────────────────

export async function getEmailTemplate(
  id: string,
): Promise<SerializedEmailTemplate | { error: string }> {
  const { organizationId } = await requireOrg();
  const t = await db.emailTemplate.findFirst({ where: { id, organizationId } });
  if (!t) return { error: "Template not found" };
  return serialize(t);
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createEmailTemplate(input: {
  name: string;
  description?: string;
  subject: string;
  body: string;
  appliesTo: "contact" | "deal" | "both";
  workspaceId?: string | null;
}): Promise<SerializedEmailTemplate | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const t = await db.emailTemplate.create({
    data: {
      organizationId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      subject: input.subject.trim(),
      body: input.body,
      appliesTo: input.appliesTo,
      workspaceId: input.workspaceId ?? null,
      createdBy: userId,
    },
  });

  revalidatePath("/settings/email-templates");
  return serialize(t);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateEmailTemplate(
  id: string,
  partial: Partial<{
    name: string;
    description: string | null;
    subject: string;
    body: string;
    appliesTo: "contact" | "deal" | "both";
    workspaceId: string | null;
    sortOrder: number;
  }>,
): Promise<SerializedEmailTemplate | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();

  const existing = await db.emailTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Template not found" };

  const t = await db.emailTemplate.update({
    where: { id },
    data: {
      ...(partial.name        !== undefined ? { name: partial.name.trim() }         : {}),
      ...(partial.description !== undefined ? { description: partial.description }   : {}),
      ...(partial.subject     !== undefined ? { subject: partial.subject.trim() }   : {}),
      ...(partial.body        !== undefined ? { body: partial.body }                : {}),
      ...(partial.appliesTo   !== undefined ? { appliesTo: partial.appliesTo }      : {}),
      ...(partial.workspaceId !== undefined ? { workspaceId: partial.workspaceId }  : {}),
      ...(partial.sortOrder   !== undefined ? { sortOrder: partial.sortOrder }      : {}),
    },
  });

  revalidatePath("/settings/email-templates");
  revalidatePath(`/settings/email-templates/${id}`);
  return serialize(t);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteEmailTemplate(
  id: string,
): Promise<{ success: true } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  const existing = await db.emailTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Template not found" };
  await db.emailTemplate.delete({ where: { id } });
  revalidatePath("/settings/email-templates");
  return { success: true };
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateEmailTemplate(
  id: string,
): Promise<SerializedEmailTemplate | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();
  const existing = await db.emailTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Template not found" };

  const copy = await db.emailTemplate.create({
    data: {
      organizationId,
      name: `${existing.name} (copy)`,
      description: existing.description,
      subject: existing.subject,
      body: existing.body,
      appliesTo: existing.appliesTo,
      workspaceId: existing.workspaceId,
      createdBy: userId,
      sortOrder: existing.sortOrder + 1,
    },
  });

  revalidatePath("/settings/email-templates");
  return serialize(copy);
}

// ── Reorder ───────────────────────────────────────────────────────────────────

export async function reorderEmailTemplates(
  ids: string[],
): Promise<{ success: true }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();
  await Promise.all(
    ids.map((id, idx) =>
      db.emailTemplate.updateMany({ where: { id, organizationId }, data: { sortOrder: idx } }),
    ),
  );
  revalidatePath("/settings/email-templates");
  return { success: true };
}

// ── Seed real estate pack ─────────────────────────────────────────────────────

export async function seedRealEstateEmailPack(): Promise<{ templatesCreated: number } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();
  const result = await seedRealEstateEmailTemplates({ organizationId, workspaceId: null, userId });
  revalidatePath("/settings/email-templates");
  return result;
}
