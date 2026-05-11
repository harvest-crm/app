"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePlatformAdmin, logAdminAction } from "@/lib/admin/platform-auth";
import { AccessStatus, OrgTier } from "@/app/generated/prisma/client";

export async function approveOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const orgId = formData.get("orgId") as string;
  const tier = (formData.get("tier") as OrgTier) || OrgTier.STANDARD;

  if (!orgId) return;

  await db.organization.update({
    where: { id: orgId },
    data: { accessStatus: AccessStatus.APPROVED, tier },
  });

  await logAdminAction({ clerkUserId: admin.clerkUserId, email: admin.email, action: "approve_organization", targetType: "Organization", targetId: orgId, metadata: { tier } });
  revalidatePath("/admin/organizations/pending");
}

export async function rejectOrganizationAction(formData: FormData) {
  const admin = await requirePlatformAdmin();
  const orgId = formData.get("orgId") as string;

  if (!orgId) return;

  await db.organization.update({
    where: { id: orgId },
    data: { accessStatus: AccessStatus.REJECTED },
  });

  await logAdminAction({ clerkUserId: admin.clerkUserId, email: admin.email, action: "reject_organization", targetType: "Organization", targetId: orgId });
  revalidatePath("/admin/organizations/pending");
}

export async function getPendingOrgCount(): Promise<number> {
  await requirePlatformAdmin();
  return db.organization.count({ where: { accessStatus: AccessStatus.PENDING } });
}
