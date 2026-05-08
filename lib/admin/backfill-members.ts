import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clerkRoleToOurRole } from "./permissions";

export async function backfillMembers(organizationId: string, clerkOrgId: string): Promise<void> {
  const client = await clerkClient();

  // Fetch org to find the creator
  const clerkOrg = await client.organizations.getOrganization({ organizationId: clerkOrgId });
  const creatorUserId = clerkOrg.createdBy;

  // Fetch all memberships
  const { data: memberships } = await client.organizations.getOrganizationMembershipList({
    organizationId: clerkOrgId,
    limit: 100,
  });

  for (const m of memberships) {
    const { userId, firstName, lastName, imageUrl, identifier } = m.publicUserData ?? {};
    if (!userId || !identifier) continue;

    const isOwner = userId === creatorUserId;
    const role = clerkRoleToOurRole(m.role, isOwner);

    await db.organizationMember.upsert({
      where: {
        organizationId_clerkUserId: { organizationId, clerkUserId: userId },
      },
      create: {
        organizationId,
        clerkUserId: userId,
        email: identifier,
        firstName: firstName ?? null,
        lastName:  lastName  ?? null,
        imageUrl:  imageUrl  ?? null,
        role,
        joinedAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      },
      update: {
        firstName: firstName ?? null,
        lastName:  lastName  ?? null,
        imageUrl:  imageUrl  ?? null,
        // Only promote to owner if that's what Clerk says; don't demote an existing owner
        ...(isOwner ? { role: "owner" } : {}),
      },
    });
  }
}
