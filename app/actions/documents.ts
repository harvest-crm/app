"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { getSignedUploadUrl, getSignedDownloadUrl, deleteR2Object } from "@/lib/r2";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SerializedDocument = {
  id: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  contactId: string | null;
  dealId: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function serialize(d: {
  id: string;
  r2Key: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Date;
  contactId: string | null;
  dealId: string | null;
}): SerializedDocument {
  return {
    id: d.id,
    r2Key: d.r2Key,
    fileName: d.fileName,
    mimeType: d.mimeType,
    fileSize: d.fileSize,
    uploadedAt: d.uploadedAt.toISOString(),
    contactId: d.contactId,
    dealId: d.dealId,
  };
}

// ── Actions ───────────────────────────────────────────────────────────────────

export async function prepareUpload(
  formData: FormData,
): Promise<{ uploadUrl: string; r2Key: string } | { error: string }> {
  const { organizationId } = await requireOrg();

  const filename  = ((formData.get("filename")  as string) ?? "").trim();
  const mimeType  = (formData.get("mimeType")   as string) || "application/octet-stream";
  const sizeBytes = parseInt((formData.get("sizeBytes") as string) ?? "0", 10);
  const contactId = (formData.get("contactId")  as string) || null;
  const dealId    = (formData.get("dealId")     as string) || null;

  if (!filename)               return { error: "Filename is required" };
  if (!contactId && !dealId)   return { error: "Contact or deal ID required" };
  if (sizeBytes > MAX_BYTES)   return { error: "File too large (max 50 MB)" };

  // Verify entity belongs to this org
  if (contactId) {
    const c = await db.contact.findFirst({ where: { id: contactId, organizationId } });
    if (!c) return { error: "Contact not found" };
  }
  if (dealId) {
    const d = await db.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!d) return { error: "Deal not found" };
  }

  const entityType = contactId ? "contact" : "deal";
  const entityId   = contactId ?? dealId!;
  const uid        = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const safeName   = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const r2Key      = `org_${organizationId}/${entityType}_${entityId}/${uid}_${safeName}`;

  try {
    const uploadUrl = await getSignedUploadUrl(r2Key, mimeType);
    return { uploadUrl, r2Key };
  } catch (err) {
    console.error("R2 sign error:", err);
    return { error: "Could not prepare upload. Check R2 configuration." };
  }
}

export async function confirmUpload(
  r2Key: string,
  fileName: string,
  mimeType: string,
  fileSize: number,
  contactId: string | null,
  dealId: string | null,
): Promise<{ doc: SerializedDocument } | { error: string }> {
  const { organizationId, userId } = await requireOrg();

  const existing = await db.document.findUnique({ where: { r2Key } });
  if (existing) return { error: "Document already recorded" };

  const doc = await db.document.create({
    data: {
      organizationId,
      r2Key,
      fileName,
      mimeType,
      fileSize,
      contactId,
      dealId,
      uploadedByClerkUserId: userId,
    },
  });

  return { doc: serialize(doc) };
}

export async function getDownloadUrl(
  documentId: string,
): Promise<{ url: string } | { error: string }> {
  const { organizationId } = await requireOrg();

  const doc = await db.document.findFirst({ where: { id: documentId, organizationId } });
  if (!doc) return { error: "Document not found" };

  try {
    const url = await getSignedDownloadUrl(doc.r2Key);
    return { url };
  } catch {
    return { error: "Could not generate download URL" };
  }
}

export async function deleteDocument(
  documentId: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId } = await requireOrg();

  const doc = await db.document.findFirst({ where: { id: documentId, organizationId } });
  if (!doc) return { error: "Document not found" };

  // R2 delete is best-effort — don't block DB cleanup if R2 fails
  try {
    await deleteR2Object(doc.r2Key);
  } catch (err) {
    console.error("R2 delete failed (proceeding with DB delete):", err);
  }

  await db.document.delete({ where: { id: documentId } });
  return { success: true };
}

export async function listDocumentsForContact(
  contactId: string,
): Promise<SerializedDocument[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.document.findMany({
    where: { contactId, organizationId },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(serialize);
}

export async function listDocumentsForDeal(
  dealId: string,
): Promise<SerializedDocument[]> {
  const { organizationId } = await requireOrg();
  const rows = await db.document.findMany({
    where: { dealId, organizationId },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(serialize);
}
