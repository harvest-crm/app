"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import type { AnyFilters, EntityType } from "@/lib/saved-views/filter-types";
import { blockIfImpersonating } from "@/lib/admin/impersonation";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedView = {
  id: string;
  name: string;
  entityType: string;
  scope: string;
  filters: AnyFilters;
  sortBy: string | null;
  sortDirection: string | null;
  workspaceId: string | null;
  createdBy: string;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
};

function serialize(v: {
  id: string; name: string; entityType: string; scope: string; filters: unknown;
  sortBy: string | null; sortDirection: string | null; workspaceId: string | null;
  createdBy: string; isPinned: boolean; sortOrder: number; createdAt: Date;
}): SerializedView {
  return {
    id: v.id, name: v.name, entityType: v.entityType, scope: v.scope,
    filters: v.filters as AnyFilters,
    sortBy: v.sortBy, sortDirection: v.sortDirection,
    workspaceId: v.workspaceId, createdBy: v.createdBy,
    isPinned: v.isPinned, sortOrder: v.sortOrder,
    createdAt: v.createdAt.toISOString(),
  };
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function listViews(
  entityType: EntityType,
): Promise<SerializedView[]> {
  const { organizationId, userId } = await requireOrg();

  const views = await db.savedView.findMany({
    where: {
      organizationId,
      entityType,
      OR: [{ scope: "shared" }, { createdBy: userId }],
    },
    orderBy: [
      { isPinned: "desc" },
      { sortOrder:  "asc" },
      { name:       "asc" },
    ],
  });

  return views.map(serialize);
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getView(
  id: string,
): Promise<SerializedView | { error: string }> {
  const { organizationId, userId } = await requireOrg();

  const view = await db.savedView.findFirst({
    where: {
      id,
      organizationId,
      OR: [{ scope: "shared" }, { createdBy: userId }],
    },
  });

  if (!view) return { error: "View not found" };
  return serialize(view);
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createView(input: {
  entityType: EntityType;
  name: string;
  scope: "personal" | "shared";
  filters: AnyFilters;
  sortBy?: string;
  sortDirection?: string;
  workspaceId?: string | null;
}): Promise<SerializedView | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const view = await db.savedView.create({
    data: {
      organizationId,
      entityType: input.entityType,
      name: input.name.trim(),
      scope: input.scope,
      filters: input.filters as object,
      sortBy: input.sortBy ?? null,
      sortDirection: input.sortDirection ?? null,
      workspaceId: input.workspaceId ?? null,
      createdBy: userId,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/tasks");
  return serialize(view);
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateView(
  id: string,
  partial: Partial<{
    name: string;
    scope: "personal" | "shared";
    filters: AnyFilters;
    sortBy: string | null;
    sortDirection: string | null;
    workspaceId: string | null;
  }>,
): Promise<SerializedView | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const existing = await db.savedView.findFirst({
    where: { id, organizationId },
  });
  if (!existing) return { error: "View not found" };
  if (existing.createdBy !== userId && existing.scope !== "shared")
    return { error: "Not authorized" };

  const view = await db.savedView.update({
    where: { id },
    data: {
      ...(partial.name        !== undefined ? { name: partial.name.trim() } : {}),
      ...(partial.scope       !== undefined ? { scope: partial.scope }      : {}),
      ...(partial.filters     !== undefined ? { filters: partial.filters as object } : {}),
      ...(partial.sortBy      !== undefined ? { sortBy: partial.sortBy }    : {}),
      ...(partial.sortDirection !== undefined ? { sortDirection: partial.sortDirection } : {}),
      ...(partial.workspaceId !== undefined ? { workspaceId: partial.workspaceId } : {}),
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/tasks");
  return serialize(view);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteView(
  id: string,
): Promise<{ success: true } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const view = await db.savedView.findFirst({ where: { id, organizationId } });
  if (!view) return { error: "View not found" };
  if (view.createdBy !== userId) return { error: "Only the creator can delete this view" };

  await db.savedView.delete({ where: { id } });
  revalidatePath("/contacts");
  revalidatePath("/tasks");
  return { success: true };
}

// ── Toggle pin ────────────────────────────────────────────────────────────────

export async function togglePin(
  id: string,
): Promise<SerializedView | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const view = await db.savedView.findFirst({
    where: { id, organizationId, OR: [{ scope: "shared" }, { createdBy: userId }] },
  });
  if (!view) return { error: "View not found" };

  const updated = await db.savedView.update({
    where: { id },
    data: { isPinned: !view.isPinned },
  });

  return serialize(updated);
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateView(
  id: string,
): Promise<SerializedView | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const view = await db.savedView.findFirst({
    where: { id, organizationId, OR: [{ scope: "shared" }, { createdBy: userId }] },
  });
  if (!view) return { error: "View not found" };

  const copy = await db.savedView.create({
    data: {
      organizationId,
      entityType: view.entityType,
      name: `${view.name} (copy)`,
      scope: "personal",
      filters: view.filters as object,
      sortBy: view.sortBy,
      sortDirection: view.sortDirection,
      workspaceId: view.workspaceId,
      createdBy: userId,
    },
  });

  revalidatePath("/contacts");
  revalidatePath("/tasks");
  return serialize(copy);
}

// ── Reorder ───────────────────────────────────────────────────────────────────

export async function reorderViews(
  ids: string[],
): Promise<{ success: true } | { error: string }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  await Promise.all(
    ids.map((id, idx) =>
      db.savedView.updateMany({
        where: { id, organizationId, createdBy: userId },
        data: { sortOrder: idx },
      }),
    ),
  );

  return { success: true };
}

// ── Create suggested views ────────────────────────────────────────────────────

export async function createSuggestedViews(
  entityType: EntityType,
): Promise<{ created: number }> {
  await blockIfImpersonating();
  const { organizationId, userId } = await requireOrg();

  const SUGGESTIONS: Array<{
    entityType: EntityType;
    name: string;
    filters: AnyFilters;
  }> = [
    // Contacts
    { entityType: "contact", name: "Hot leads",              filters: { temperature: ["hot"] } },
    { entityType: "contact", name: "No follow-up scheduled", filters: { hasOpenTasks: false } as never },
    { entityType: "contact", name: "Recent contacts",        filters: { createdAfter: new Date(Date.now() - 30 * 86_400_000).toISOString().split("T")[0] } },
    // Tasks
    { entityType: "task",    name: "Overdue",               filters: { dueWithin: "overdue", status: "open" } },
    { entityType: "task",    name: "This week",             filters: { dueWithin: "this_week", status: "open" } },
    { entityType: "task",    name: "High priority open",    filters: { priorities: ["high"], status: "open" } },
    // Deals
    { entityType: "deal",    name: "Stuck deals",           filters: { daysInStageMin: 14 } },
    { entityType: "deal",    name: "High value",            filters: { valueMin: 500000 } },
  ];

  const toCreate = SUGGESTIONS.filter((s) => s.entityType === entityType);

  await db.savedView.createMany({
    data: toCreate.map((s, i) => ({
      organizationId,
      entityType: s.entityType,
      name: s.name,
      scope: "personal",
      filters: s.filters as object,
      createdBy: userId,
      sortOrder: i,
    })),
  });

  revalidatePath("/contacts");
  revalidatePath("/tasks");
  return { created: toCreate.length };
}
