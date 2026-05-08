// Server-only helpers — do NOT import from client components.
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ROLE_RANK } from "./permissions";
import type { Role } from "./permissions";
import type { OrganizationMember } from "@/app/generated/prisma/client";

export async function getCurrentMember(): Promise<OrganizationMember | null> {
  const { orgId: clerkOrgId, userId } = await auth();
  if (!clerkOrgId || !userId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  return db.organizationMember.findUnique({
    where: { organizationId_clerkUserId: { organizationId: org.id, clerkUserId: userId } },
  });
}

export async function requireRole(minimumRole: Role): Promise<OrganizationMember> {
  const member = await getCurrentMember();
  if (!member) throw new Error("Not authenticated");
  const userRank = ROLE_RANK[member.role as Role] ?? 0;
  if (userRank < ROLE_RANK[minimumRole]) {
    throw new Error(`Requires ${minimumRole} role`);
  }
  return member;
}

export async function hasRole(minimumRole: Role): Promise<boolean> {
  const member = await getCurrentMember();
  if (!member) return false;
  const userRank = ROLE_RANK[member.role as Role] ?? 0;
  return userRank >= ROLE_RANK[minimumRole];
}
