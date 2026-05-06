"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import type { SerializedDeal } from "@/components/deals/types";

// ── Helpers ─────────────────────────────────────────────────────────────────

function serializeDeal(deal: {
  id: string;
  title: string;
  stageId: string;
  workspaceId: string;
  organizationId: string;
  contactId: string | null;
  contact: { id: string; firstName: string; lastName: string | null } | null;
  value: { toNumber: () => number } | null;
  status: string;
  notes: string | null;
  movedToStageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): SerializedDeal {
  return {
    id: deal.id,
    title: deal.title,
    stageId: deal.stageId,
    workspaceId: deal.workspaceId,
    organizationId: deal.organizationId,
    contactId: deal.contactId,
    contact: deal.contact ?? null,
    value: deal.value ? Number(deal.value) : null,
    status: deal.status,
    notes: deal.notes ?? null,
    movedToStageAt: deal.movedToStageAt.toISOString(),
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

const dealSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  contactId: z.string().optional().nullable(),
  stageId: z.string().min(1),
  workspaceId: z.string().min(1),
  value: z.number().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function extractDealData(formData: FormData) {
  const valueStr = (formData.get("value") as string) ?? "";
  return {
    title: formData.get("title") as string,
    contactId: (formData.get("contactId") as string) || null,
    stageId: formData.get("stageId") as string,
    workspaceId: formData.get("workspaceId") as string,
    value: valueStr && !isNaN(Number(valueStr)) && Number(valueStr) > 0
      ? Number(valueStr)
      : null,
    notes: (formData.get("notes") as string) || null,
  };
}

const contactInclude = {
  contact: { select: { id: true, firstName: true, lastName: true } },
} as const;

// ── Actions ──────────────────────────────────────────────────────────────────

export async function createDeal(
  formData: FormData
): Promise<{ deal: SerializedDeal } | { error: string }> {
  const { organizationId } = await requireOrg();

  const raw = extractDealData(formData);
  const parsed = dealSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data: " + parsed.error.issues[0]?.message };

  const { title, contactId, stageId, workspaceId, value, notes } = parsed.data;

  const [workspace, stage] = await Promise.all([
    db.workspace.findFirst({ where: { id: workspaceId, organizationId } }),
    db.stage.findFirst({ where: { id: stageId, workspaceId } }),
  ]);
  if (!workspace) return { error: "Workspace not found" };
  if (!stage) return { error: "Stage not found" };

  const deal = await db.deal.create({
    data: {
      organizationId,
      workspaceId,
      stageId,
      contactId: contactId || null,
      title,
      value: value ?? null,
      notes: notes || null,
      status: stage.isTerminal ? (stage.terminalOutcome ?? "open") : "open",
      movedToStageAt: new Date(),
    },
    include: contactInclude,
  });

  revalidatePath(`/workspaces/${workspace.slug}/deals`);
  return { deal: serializeDeal(deal) };
}

export async function updateDeal(
  id: string,
  formData: FormData
): Promise<{ deal: SerializedDeal } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.deal.findFirst({
    where: { id, organizationId },
    include: { workspace: true },
  });
  if (!existing) return { error: "Deal not found" };

  const raw = extractDealData(formData);
  raw.workspaceId = existing.workspaceId; // workspace is immutable via edit
  const parsed = dealSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid data: " + parsed.error.issues[0]?.message };

  const { title, contactId, stageId, value, notes } = parsed.data;

  const stage = await db.stage.findFirst({
    where: { id: stageId, workspaceId: existing.workspaceId },
  });
  if (!stage) return { error: "Stage not found in this workspace" };

  const deal = await db.deal.update({
    where: { id },
    data: {
      title,
      contactId: contactId || null,
      stageId,
      value: value ?? null,
      notes: notes || null,
      status: stage.isTerminal ? (stage.terminalOutcome ?? "open") : "open",
      ...(stageId !== existing.stageId ? { movedToStageAt: new Date() } : {}),
    },
    include: contactInclude,
  });

  revalidatePath(`/workspaces/${existing.workspace.slug}/deals`);
  return { deal: serializeDeal(deal) };
}

export async function moveDealToStage(
  dealId: string,
  stageId: string
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const deal = await db.deal.findFirst({
    where: { id: dealId, organizationId },
    include: { workspace: true },
  });
  if (!deal) return { error: "Deal not found" };

  const stage = await db.stage.findFirst({
    where: { id: stageId, workspaceId: deal.workspaceId },
  });
  if (!stage) return { error: "Stage not found in this workspace" };

  await db.deal.update({
    where: { id: dealId },
    data: {
      stageId,
      movedToStageAt: new Date(),
      status: stage.isTerminal ? (stage.terminalOutcome ?? "open") : "open",
    },
  });

  revalidatePath(`/workspaces/${deal.workspace.slug}/deals`);
  return { success: true };
}

export async function deleteDeal(
  id: string
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const deal = await db.deal.findFirst({
    where: { id, organizationId },
    include: { workspace: true },
  });
  if (!deal) return { error: "Deal not found" };

  await db.deal.delete({ where: { id } });

  revalidatePath(`/workspaces/${deal.workspace.slug}/deals`);
  return { success: true };
}
