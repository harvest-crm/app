"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { hasRole } from "@/lib/admin/server-permissions";
import { backfillMembers } from "@/lib/admin/backfill-members";
import type { Role } from "@/lib/admin/permissions";

// ── Serialized types ──────────────────────────────────────────────────────────

export type SerializedMember = {
  id: string;
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: string;
  joinedAt: string;
  lastActiveAt: string | null;
  isActive: boolean;
  isSelf: boolean;
};

export type SerializedInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string | null;
};

// ── Get team data (with lazy backfill) ───────────────────────────────────────

export async function getTeamData(): Promise<{
  members: SerializedMember[];
  invites: SerializedInvite[];
  currentUserRole: string;
  currentUserId: string;
} | { error: string }> {
  const { organizationId, clerkOrgId, userId } = await requireOrg();

  // Lazy backfill: if no members recorded yet, pull from Clerk
  const count = await db.organizationMember.count({ where: { organizationId } });
  if (count === 0) {
    await backfillMembers(organizationId, clerkOrgId).catch(console.error);
  }

  const [rawMembers, rawInvites, me] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    }),
    db.organizationInvite.findMany({
      where: { organizationId, status: "pending" },
      orderBy: { createdAt: "desc" },
    }),
    db.organizationMember.findUnique({
      where: { organizationId_clerkUserId: { organizationId, clerkUserId: userId } },
    }),
  ]);

  const currentUserRole = me?.role ?? "member";

  const members: SerializedMember[] = rawMembers.map((m) => ({
    id:          m.id,
    clerkUserId: m.clerkUserId,
    email:       m.email,
    firstName:   m.firstName,
    lastName:    m.lastName,
    imageUrl:    m.imageUrl,
    role:        m.role,
    joinedAt:    m.joinedAt.toISOString(),
    lastActiveAt: m.lastActiveAt?.toISOString() ?? null,
    isActive:    m.isActive,
    isSelf:      m.clerkUserId === userId,
  }));

  const invites: SerializedInvite[] = rawInvites.map((i) => ({
    id:        i.id,
    email:     i.email,
    role:      i.role,
    status:    i.status,
    invitedBy: i.invitedBy,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt?.toISOString() ?? null,
  }));

  return { members, invites, currentUserRole, currentUserId: userId };
}

// ── Invite member ─────────────────────────────────────────────────────────────

export async function inviteMember(
  email: string,
  role: "admin" | "member",
): Promise<{ success: true } | { error: string }> {
  const { organizationId, clerkOrgId, userId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required to invite members." };

  const normalized = email.toLowerCase().trim();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { error: "Invalid email address." };
  }

  // Check if already a member
  const existing = await db.organizationMember.findFirst({
    where: { organizationId, email: normalized, isActive: true },
  });
  if (existing) return { error: "This person is already a team member." };

  // Upsert the invite row (handles re-invites after expiry)
  const clerkRole = role === "admin" ? "org:admin" : "org:member";
  let clerkInviteId: string | undefined;

  try {
    const client = await clerkClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const inv = await client.organizations.createOrganizationInvitation({
      organizationId: clerkOrgId,
      emailAddress: normalized,
      role: clerkRole,
      inviterUserId: userId,
      redirectUrl: `${appUrl}/sign-in`,
    });
    clerkInviteId = inv.id;
  } catch (err) {
    console.error("Clerk invite error:", err);
    // Don't block if Clerk invite fails — still record invite locally
  }

  await db.organizationInvite.upsert({
    where: { organizationId_email: { organizationId, email: normalized } },
    create: {
      organizationId,
      invitedBy: userId,
      email: normalized,
      role,
      status: "pending",
      clerkInviteId: clerkInviteId ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    update: {
      invitedBy: userId,
      role,
      status: "pending",
      clerkInviteId: clerkInviteId ?? null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/settings/team");
  return { success: true };
}

// ── Revoke invite ─────────────────────────────────────────────────────────────

export async function revokeInvite(
  inviteId: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId, clerkOrgId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required." };

  const invite = await db.organizationInvite.findFirst({
    where: { id: inviteId, organizationId },
  });
  if (!invite) return { error: "Invite not found." };

  // Also revoke in Clerk if we have the ID
  if (invite.clerkInviteId) {
    try {
      const client = await clerkClient();
      await client.organizations.revokeOrganizationInvitation({
        organizationId: clerkOrgId,
        invitationId: invite.clerkInviteId,
        requestingUserId: (await requireOrg()).userId,
      });
    } catch (err) {
      console.error("Clerk revoke error:", err);
    }
  }

  await db.organizationInvite.update({
    where: { id: inviteId },
    data: { status: "revoked" },
  });

  revalidatePath("/settings/team");
  return { success: true };
}

// ── Update member role ────────────────────────────────────────────────────────

export async function updateMemberRole(
  memberId: string,
  newRole: Role,
): Promise<{ success: true } | { error: string }> {
  const { organizationId, clerkOrgId, userId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required." };

  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId },
  });
  if (!member) return { error: "Member not found." };
  if (member.clerkUserId === userId) return { error: "You cannot change your own role." };
  if (member.role === "owner") return { error: "Cannot change the owner's role." };

  // Only owners can promote to admin
  if (newRole === "owner") return { error: "Transfer ownership is not supported through this UI." };

  // Sync role to Clerk
  try {
    const client = await clerkClient();
    await client.organizations.updateOrganizationMembership({
      organizationId: clerkOrgId,
      userId: member.clerkUserId,
      role: newRole === "admin" ? "org:admin" : "org:member",
    });
  } catch (err) {
    console.error("Clerk role update error:", err);
  }

  await db.organizationMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });

  revalidatePath("/settings/team");
  return { success: true };
}

// ── Remove member ─────────────────────────────────────────────────────────────

export async function removeMember(
  memberId: string,
): Promise<{ success: true } | { error: string }> {
  const { organizationId, clerkOrgId, userId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required." };

  const member = await db.organizationMember.findFirst({
    where: { id: memberId, organizationId },
  });
  if (!member) return { error: "Member not found." };
  if (member.clerkUserId === userId) return { error: "You cannot remove yourself." };
  if (member.role === "owner") return { error: "The owner cannot be removed." };

  // Remove from Clerk
  try {
    const client = await clerkClient();
    await client.organizations.deleteOrganizationMembership({
      organizationId: clerkOrgId,
      userId: member.clerkUserId,
    });
  } catch (err) {
    console.error("Clerk remove error:", err);
  }

  // Soft-delete — preserves activity attribution
  await db.organizationMember.update({
    where: { id: memberId },
    data: { isActive: false },
  });

  revalidatePath("/settings/team");
  return { success: true };
}
