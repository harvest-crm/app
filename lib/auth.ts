import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

export async function getOrganizationId(): Promise<string> {
  const { orgId: clerkOrgId } = await auth();

  if (!clerkOrgId) {
    throw new Error("No active organization");
  }

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (!org) {
    throw new Error("Organization not found in database");
  }

  return org.id;
}

export async function requireOrg() {
  const { orgId: clerkOrgId, userId } = await auth();

  if (!userId) {
    throw new Error("Unauthenticated");
  }

  if (!clerkOrgId) {
    throw new Error("No active organization");
  }

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true, name: true, plan: true },
  });

  if (!org) {
    throw new Error("Organization not synced yet");
  }

  return { organizationId: org.id, org, clerkOrgId, userId };
}
