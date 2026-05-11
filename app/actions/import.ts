"use server";

import Papa from "papaparse";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CsvPreview = {
  headers: string[];
  rows: Record<string, string>[];
  total: number;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseDate(raw: string): Date | null {
  if (!raw?.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function parseCsvPreview(csvString: string): Promise<CsvPreview | { error: string }> {
  try {
    const result = Papa.parse<Record<string, string>>(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });
    return {
      headers: result.meta.fields ?? [],
      rows: result.data.slice(0, 10),
      total: result.data.length,
    };
  } catch {
    return { error: "Failed to parse CSV" };
  }
}

export async function checkEmailDuplicates(
  emails: string[],
): Promise<{ duplicateCount: number }> {
  const { organizationId } = await requireOrg();
  const normalized = [...new Set(emails.map((e) => e.toLowerCase().trim()).filter(Boolean))];
  if (normalized.length === 0) return { duplicateCount: 0 };

  // Fetch all org emails and compare client-side to avoid case-sensitivity issues
  const existing = await db.contact.findMany({
    where: { organizationId, email: { not: null } },
    select: { email: true },
  });
  const existingSet = new Set(existing.map((c) => c.email?.toLowerCase().trim()).filter(Boolean));
  const count = normalized.filter((e) => existingSet.has(e)).length;
  return { duplicateCount: count };
}

export async function importContacts(formData: FormData): Promise<ImportResult | { error: string }> {
  const { organizationId, userId } = await requireOrg();

  const csvString  = (formData.get("csvString")  as string) ?? "";
  const mappingsRaw = (formData.get("mappings")  as string) ?? "{}";
  const workspaceId = (formData.get("workspaceId") as string) || null;
  const tagIdsRaw   = (formData.get("tagIds")    as string) ?? "[]";
  const sourceOverride = (formData.get("source") as string) || null;
  const temperature    = (formData.get("temperature") as string) || "warm";

  let mappings: Record<string, string>;
  let tagIds: string[];
  try {
    mappings = JSON.parse(mappingsRaw);
    tagIds   = JSON.parse(tagIdsRaw);
  } catch {
    return { error: "Invalid mapping data" };
  }

  // Guard: mappings must have at least one non-skip field
  const usefulMappings = Object.values(mappings).filter((v) => v !== "skip");
  if (usefulMappings.length === 0) {
    return { error: "No column mappings provided — check that column mapping step was completed" };
  }

  // Helper: look up a CSV header by target field key, then read the row value
  function getField(row: Record<string, string>, fieldKey: string): string {
    const header = Object.keys(mappings).find((k) => mappings[k] === fieldKey);
    return header ? (row[header] ?? "").trim() : "";
  }

  // Server-side re-parse for safety
  const parsed = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const rows = parsed.data;

  // Fetch existing emails once for the whole import
  const existing = await db.contact.findMany({
    where: { organizationId, email: { not: null } },
    select: { email: true },
  });
  const existingEmails = new Set(existing.map((c) => c.email!.toLowerCase().trim()));
  const seenThisImport = new Set<string>();

  let imported = 0;
  let skipped  = 0;
  const errors: ImportResult["errors"] = [];
  const createdIds: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row     = rows[i];
    const rowNum  = i + 2; // 1-indexed + header row

    // Apply mappings — getField(row, fieldKey) finds the CSV header whose
    // value in the mappings map equals fieldKey, then reads that column
    const firstName      = getField(row, "firstName");
    const lastName       = getField(row, "lastName");
    const email          = getField(row, "email").toLowerCase();
    const phone          = getField(row, "phone");
    const source         = getField(row, "source");
    const notes          = getField(row, "notes");
    const birthdayRaw    = getField(row, "birthday");
    const anniversaryRaw = getField(row, "homeAnniversary");

    // Validate
    if (!firstName && !email) {
      errors.push({ row: rowNum, reason: "Missing both First Name and Email" });
      continue;
    }

    // Duplicate check
    if (email) {
      if (existingEmails.has(email) || seenThisImport.has(email)) {
        skipped++;
        continue;
      }
      seenThisImport.add(email);
    }

    // Create contact
    try {
      const contact = await db.contact.create({
        data: {
          organizationId,
          ownerClerkUserId: userId,
          firstName: firstName || "Unknown",
          lastName: lastName || null,
          email: email || null,
          phone: phone ? phone.replace(/\D/g, "") || null : null,
          source: sourceOverride || source || null,
          notes: notes || null,
          birthday: parseDate(birthdayRaw),
          homeAnniversary: parseDate(anniversaryRaw),
          temperature,
        },
      });
      createdIds.push(contact.id);
      imported++;
    } catch {
      errors.push({ row: rowNum, reason: "Database error creating contact" });
    }
  }

  // Attach to workspace
  if (workspaceId && createdIds.length > 0) {
    // Verify workspace belongs to org
    const ws = await db.workspace.findFirst({ where: { id: workspaceId, organizationId } });
    if (ws) {
      await db.contactWorkspace.createMany({
        data: createdIds.map((contactId) => ({ contactId, workspaceId })),
        skipDuplicates: true,
      });
    }
  }

  // Apply tags
  if (tagIds.length > 0 && createdIds.length > 0) {
    await db.contactTag.createMany({
      data: createdIds.flatMap((contactId) => tagIds.map((tagId) => ({ contactId, tagId }))),
      skipDuplicates: true,
    });
  }

  return { imported, skipped, errors };
}
