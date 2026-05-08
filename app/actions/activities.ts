"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { blockIfImpersonating } from "@/lib/admin/impersonation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedActivity = {
  id: string;
  type: string;
  body: string;
  occurredAt: string; // ISO
  createdAt: string;
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_TYPES = ["call", "email", "meeting", "note", "sms"] as const;

function serialize(a: {
  id: string;
  type: string;
  body: string;
  occurredAt: Date;
  createdAt: Date;
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
}): SerializedActivity {
  return {
    id: a.id,
    type: a.type,
    body: a.body,
    occurredAt: a.occurredAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    contactId: a.contactId,
    dealId: a.dealId,
    workspaceId: a.workspaceId,
  };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function createActivity(
  formData: FormData
): Promise<{ activity: SerializedActivity } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const type = (formData.get("type") as string) ?? "";
  const body = ((formData.get("body") as string) ?? "").trim();
  const contactId = (formData.get("contactId") as string) || null;
  const dealId = (formData.get("dealId") as string) || null;
  const workspaceId = (formData.get("workspaceId") as string) || null;
  const occurredAtRaw = (formData.get("occurredAt") as string) || "";

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return { error: "Invalid activity type" };
  }
  if (!body) return { error: "Body is required" };
  if (!contactId && !dealId) return { error: "A contact or deal is required" };

  if (contactId) {
    const c = await db.contact.findFirst({ where: { id: contactId, organizationId } });
    if (!c) return { error: "Contact not found" };
  }
  if (dealId) {
    const d = await db.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!d) return { error: "Deal not found" };
  }

  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : new Date();

  const activity = await db.activity.create({
    data: {
      organizationId,
      type,
      body,
      contactId,
      dealId,
      workspaceId,
      occurredAt,
      createdByClerkUserId: userId,
    },
  });

  if (contactId) revalidatePath(`/contacts/${contactId}`);

  return { activity: serialize(activity) };
}

export async function updateActivity(
  id: string,
  formData: FormData
): Promise<{ activity: SerializedActivity } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();

  const existing = await db.activity.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Activity not found" };

  const type = (formData.get("type") as string) || existing.type;
  const body = ((formData.get("body") as string) ?? "").trim();
  const occurredAtRaw = (formData.get("occurredAt") as string) || "";

  if (!body) return { error: "Body is required" };
  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return { error: "Invalid activity type" };
  }

  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : existing.occurredAt;

  const updated = await db.activity.update({
    where: { id },
    data: { type, body, occurredAt },
  });

  if (existing.contactId) revalidatePath(`/contacts/${existing.contactId}`);

  return { activity: serialize(updated) };
}

export async function deleteActivity(
  id: string
): Promise<{ success: true } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId } = await requireOrg();

  const existing = await db.activity.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Activity not found" };

  await db.activity.delete({ where: { id } });

  if (existing.contactId) revalidatePath(`/contacts/${existing.contactId}`);

  return { success: true };
}

export async function listActivitiesForContact(
  contactId: string
): Promise<SerializedActivity[]> {
  const { organizationId } = await requireOrg();

  const rows = await db.activity.findMany({
    where: { contactId, organizationId },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return rows.map(serialize);
}

export async function listActivitiesForDeal(
  dealId: string
): Promise<SerializedActivity[]> {
  const { organizationId } = await requireOrg();

  const rows = await db.activity.findMany({
    where: { dealId, organizationId },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return rows.map(serialize);
}
