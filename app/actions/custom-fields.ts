"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { hasRole } from "@/lib/admin/server-permissions";
import { Prisma } from "@/app/generated/prisma/client";
import { labelToKey } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedFieldDef = {
  id: string;
  workspaceId: string | null;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
  sortOrder: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function serializeDef(d: {
  id: string;
  workspaceId: string | null;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  options: unknown;
  isRequired: boolean;
  sortOrder: number;
}): SerializedFieldDef {
  const opts = d.options as { choices?: string[] } | null;
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    entityType: d.entityType,
    fieldKey: d.fieldKey,
    fieldLabel: d.fieldLabel,
    fieldType: d.fieldType,
    options: opts?.choices ?? [],
    isRequired: d.isRequired,
    sortOrder: d.sortOrder,
  };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function listDefinitionsForWorkspace(
  workspaceId: string,
  entityType: string,
): Promise<SerializedFieldDef[]> {
  const { organizationId } = await requireOrg();
  const defs = await db.customFieldDefinition.findMany({
    where: { workspaceId, entityType, organizationId },
    orderBy: { sortOrder: "asc" },
  });
  return defs.map(serializeDef);
}

export async function createDefinition(
  formData: FormData,
): Promise<{ def: SerializedFieldDef } | { error: string }> {
  const { organizationId } = await requireOrg();

  const fieldLabel = ((formData.get("fieldLabel") as string) ?? "").trim();
  const fieldType  = (formData.get("fieldType")  as string) || "text";
  const workspaceId = (formData.get("workspaceId") as string) || null;
  const entityType  = (formData.get("entityType")  as string) || "contact";
  const isRequired  = formData.get("isRequired") === "true";
  const optionsRaw  = (formData.get("options") as string) || "";

  if (!fieldLabel) return { error: "Label is required" };

  const fieldKey = labelToKey(fieldLabel);
  if (!fieldKey) return { error: "Label cannot produce a valid key" };

  const conflict = await db.customFieldDefinition.findFirst({
    where: { organizationId, workspaceId, entityType, fieldKey },
  });
  if (conflict) return { error: `Key "${fieldKey}" already exists in this workspace` };

  const choices = optionsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const agg = await db.customFieldDefinition.aggregate({
    where: { workspaceId, entityType, organizationId },
    _max: { sortOrder: true },
  });
  const sortOrder = (agg._max.sortOrder ?? -1) + 1;

  const def = await db.customFieldDefinition.create({
    data: {
      organizationId,
      workspaceId,
      entityType,
      fieldKey,
      fieldLabel,
      fieldType,
      options: choices.length > 0 ? ({ choices } as Prisma.InputJsonValue) : Prisma.DbNull,
      isRequired,
      sortOrder,
    },
  });

  return { def: serializeDef(def) };
}

export async function updateDefinition(
  id: string,
  formData: FormData,
): Promise<{ def: SerializedFieldDef } | { error: string }> {
  const { organizationId } = await requireOrg();

  const existing = await db.customFieldDefinition.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Not found" };

  const fieldLabel = ((formData.get("fieldLabel") as string) ?? "").trim();
  const fieldType  = (formData.get("fieldType")  as string) || existing.fieldType;
  const isRequired = formData.get("isRequired") === "true";
  const optionsRaw = (formData.get("options") as string) || "";

  if (!fieldLabel) return { error: "Label is required" };

  const choices = optionsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const def = await db.customFieldDefinition.update({
    where: { id },
    data: {
      fieldLabel,
      fieldType,
      options: choices.length > 0 ? ({ choices } as Prisma.InputJsonValue) : Prisma.DbNull,
      isRequired,
    },
  });

  return { def: serializeDef(def) };
}

export async function deleteDefinition(
  id: string,
): Promise<{ success: true; affected: number } | { error: string }> {
  const { organizationId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required to delete custom fields." };

  const existing = await db.customFieldDefinition.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Not found" };

  const affected = await db.customFieldValue.count({ where: { definitionId: id } });

  // onDelete: Cascade handles the values automatically
  await db.customFieldDefinition.delete({ where: { id } });

  return { success: true, affected };
}

export async function reorderDefinitions(
  workspaceId: string,
  entityType: string,
  orderedIds: string[],
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const owned = await db.customFieldDefinition.count({
    where: { id: { in: orderedIds }, workspaceId, entityType, organizationId },
  });
  if (owned !== orderedIds.length) return { error: "Invalid field IDs" };

  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.customFieldDefinition.update({ where: { id }, data: { sortOrder: idx } }),
    ),
  );

  return { success: true };
}

export async function getValuesForEntity(
  entityType: string,
  entityId: string,
): Promise<Record<string, unknown>> {
  await requireOrg();

  const rows = await db.customFieldValue.findMany({ where: { entityType, entityId } });
  const result: Record<string, unknown> = {};
  for (const r of rows) result[r.definitionId] = r.value;
  return result;
}

export async function upsertFieldValue(
  formData: FormData,
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const definitionId = (formData.get("definitionId") as string) || "";
  const entityType   = (formData.get("entityType")   as string) || "";
  const entityId     = (formData.get("entityId")     as string) || "";
  const valueRaw     = (formData.get("value")        as string) ?? "";

  if (!definitionId || !entityType || !entityId) return { error: "Missing required params" };

  const def = await db.customFieldDefinition.findFirst({ where: { id: definitionId, organizationId } });
  if (!def) return { error: "Field not found" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(valueRaw);
  } catch {
    parsed = valueRaw;
  }

  // Type coercion + validation
  if (def.fieldType === "number") {
    parsed = parsed === "" || parsed === null ? null : Number(parsed);
    if (parsed !== null && Number.isNaN(parsed as number)) return { error: "Invalid number" };
  } else if (def.fieldType === "multiselect") {
    if (!Array.isArray(parsed)) parsed = [];
  } else if (def.fieldType === "date") {
    if (typeof parsed === "string" && parsed && !/^\d{4}-\d{2}-\d{2}$/.test(parsed)) {
      return { error: "Invalid date" };
    }
  } else {
    parsed = typeof parsed === "string" ? parsed : String(parsed ?? "");
  }

  const isEmpty =
    parsed === null ||
    parsed === "" ||
    (Array.isArray(parsed) && parsed.length === 0);

  if (isEmpty) {
    await db.customFieldValue.deleteMany({ where: { definitionId, entityId } });
    return { success: true };
  }

  await db.customFieldValue.upsert({
    where: { definitionId_entityId: { definitionId, entityId } },
    create: { definitionId, entityType, entityId, value: parsed as Prisma.InputJsonValue },
    update: { value: parsed as Prisma.InputJsonValue },
  });

  return { success: true };
}
