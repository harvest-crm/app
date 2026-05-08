"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePlatformAdmin, logAdminAction } from "@/lib/admin/platform-auth";
import { setImpersonationCookie, clearImpersonationCookie, getImpersonationContext } from "@/lib/admin/impersonation";

// ── System metrics ─────────────────────────────────────────────────────────────

export async function getSystemMetrics() {
  await requirePlatformAdmin();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [
    totalOrgs, totalActiveUsers, newOrgsThisWeek, newUsersThisWeek,
    suspendedOrgs, totalContacts, totalDeals,
    recentOrgs,
  ] = await Promise.all([
    db.organization.count(),
    db.organizationMember.count({ where: { isActive: true } }),
    db.organization.count({ where: { createdAt: { gte: weekAgo } } }),
    db.organizationMember.count({ where: { isActive: true, joinedAt: { gte: weekAgo } } }),
    db.organization.count({ where: { isSuspended: true } }),
    db.contact.count(),
    db.deal.count(),
    db.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true, name: true, createdAt: true,
        _count: { select: { members: { where: { isActive: true } } } },
      },
    }),
  ]);

  const recentAudit = await db.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    totalOrgs, totalActiveUsers, newOrgsThisWeek, newUsersThisWeek,
    suspendedOrgs, totalContacts, totalDeals,
    recentOrgs: recentOrgs.map((o) => ({
      id: o.id, name: o.name,
      memberCount: o._count.members,
      createdAt: o.createdAt.toISOString(),
    })),
    recentAudit: recentAudit.map((a) => ({
      id: a.id, email: a.email, action: a.action,
      targetType: a.targetType, targetId: a.targetId,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

// ── Organizations ─────────────────────────────────────────────────────────────

export async function listAllOrganizations(filters?: {
  search?: string;
  status?: "all" | "active" | "suspended";
  limit?: number;
  offset?: number;
}) {
  await requirePlatformAdmin();

  const { search, status = "all", limit = 50, offset = 0 } = filters ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (status === "active")    where.isSuspended = false;
  if (status === "suspended") where.isSuspended = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { members: { some: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [orgs, total] = await Promise.all([
    db.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            members: { where: { isActive: true } },
            contacts: true,
            deals: true,
          },
        },
      },
    }),
    db.organization.count({ where }),
  ]);

  return {
    orgs: orgs.map((o) => ({
      id: o.id, name: o.name, clerkOrgId: o.clerkOrgId,
      isSuspended: o.isSuspended,
      suspendedAt: o.suspendedAt?.toISOString() ?? null,
      suspensionReason: o.suspensionReason,
      createdAt: o.createdAt.toISOString(),
      memberCount: o._count.members,
      contactCount: o._count.contacts,
      dealCount: o._count.deals,
    })),
    total,
  };
}

export async function getOrganizationDetail(orgId: string) {
  const admin = await requirePlatformAdmin();

  const [org, members, workspaces, stats, recentActivities] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true, name: true, clerkOrgId: true, plan: true,
        isSuspended: true, suspendedAt: true, suspendedBy: true, suspensionReason: true,
        createdAt: true,
      },
    }),
    db.organizationMember.findMany({
      where: { organizationId: orgId },
      orderBy: { role: "asc" },
    }),
    db.workspace.findMany({
      where: { organizationId: orgId },
      include: {
        _count: { select: { stages: true, deals: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    Promise.all([
      db.contact.count({ where: { organizationId: orgId } }),
      db.deal.count({ where: { organizationId: orgId } }),
      db.deal.count({ where: { organizationId: orgId, status: "open" } }),
      db.task.count({ where: { organizationId: orgId, completedAt: null } }),
      db.task.count({ where: { organizationId: orgId, completedAt: { not: null } } }),
      db.activity.count({ where: { organizationId: orgId } }),
      db.document.count({ where: { organizationId: orgId } }),
    ]),
    db.activity.findMany({
      where: { organizationId: orgId },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: {
        id: true, type: true, body: true,
        occurredAt: true, contactId: true, dealId: true,
      },
    }),
  ]);

  if (!org) return null;

  await logAdminAction({
    clerkUserId: admin.clerkUserId,
    email: admin.email,
    action: "view_org",
    targetType: "organization",
    targetId: orgId,
  });

  const [contacts, deals, openDeals, openTasks, completedTasks, activities, documents] = stats;

  return {
    org: {
      ...org,
      createdAt: org.createdAt.toISOString(),
      suspendedAt: org.suspendedAt?.toISOString() ?? null,
    },
    members: members.map((m) => ({
      id: m.id, clerkUserId: m.clerkUserId, email: m.email,
      firstName: m.firstName, lastName: m.lastName, role: m.role,
      joinedAt: m.joinedAt.toISOString(), isActive: m.isActive,
      lastActiveAt: m.lastActiveAt?.toISOString() ?? null,
    })),
    workspaces: workspaces.map((w) => ({
      id: w.id, name: w.name, slug: w.slug,
      stageCount: w._count.stages, dealCount: w._count.deals,
      createdAt: w.createdAt.toISOString(),
    })),
    stats: { contacts, deals, openDeals, openTasks, completedTasks, activities, documents },
    recentActivities: recentActivities.map((a) => ({
      id: a.id, type: a.type, body: a.body,
      occurredAt: a.occurredAt.toISOString(),
      contactId: a.contactId, dealId: a.dealId,
    })),
  };
}

// ── Suspend / unsuspend ───────────────────────────────────────────────────────

export async function suspendOrganization(
  orgId: string,
  reason: string,
): Promise<{ success: true } | { error: string }> {
  const admin = await requirePlatformAdmin();
  if (!reason.trim()) return { error: "Suspension reason is required." };

  await db.organization.update({
    where: { id: orgId },
    data: {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedBy: admin.clerkUserId,
      suspensionReason: reason.trim(),
    },
  });

  await logAdminAction({
    clerkUserId: admin.clerkUserId, email: admin.email,
    action: "suspend_org", targetType: "organization", targetId: orgId,
    metadata: { reason: reason.trim() },
  });

  revalidatePath(`/admin/organizations/${orgId}`);
  return { success: true };
}

export async function unsuspendOrganization(
  orgId: string,
): Promise<{ success: true } | { error: string }> {
  const admin = await requirePlatformAdmin();

  await db.organization.update({
    where: { id: orgId },
    data: {
      isSuspended: false,
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
    },
  });

  await logAdminAction({
    clerkUserId: admin.clerkUserId, email: admin.email,
    action: "unsuspend_org", targetType: "organization", targetId: orgId,
  });

  revalidatePath(`/admin/organizations/${orgId}`);
  return { success: true };
}

// ── Impersonation ─────────────────────────────────────────────────────────────

export async function startImpersonation(
  orgId: string,
): Promise<{ success: true } | { error: string }> {
  const admin = await requirePlatformAdmin();

  const org = await db.organization.findUnique({ where: { id: orgId }, select: { id: true } });
  if (!org) return { error: "Organization not found." };

  await setImpersonationCookie({ orgId, adminUserId: admin.clerkUserId, startedAt: Date.now() });

  await logAdminAction({
    clerkUserId: admin.clerkUserId, email: admin.email,
    action: "impersonate", targetType: "organization", targetId: orgId,
  });

  return { success: true };
}

export async function endImpersonation(): Promise<{ success: true }> {
  const ctx = await getImpersonationContext();
  if (ctx) {
    const admin = await requirePlatformAdmin().catch(() => null);
    if (admin) {
      await logAdminAction({
        clerkUserId: admin.clerkUserId, email: admin.email,
        action: "end_impersonation", targetType: "organization", targetId: ctx.orgId,
      });
    }
    await clearImpersonationCookie();
  }
  return { success: true };
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function searchUsers(query: string) {
  const admin = await requirePlatformAdmin();

  if (!query.trim()) return { users: [] };

  await logAdminAction({
    clerkUserId: admin.clerkUserId, email: admin.email,
    action: "search_user", metadata: { query },
  });

  const members = await db.organizationMember.findMany({
    where: {
      OR: [
        { email: { contains: query, mode: "insensitive" } },
        { firstName: { contains: query, mode: "insensitive" } },
        { lastName: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      organization: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: "desc" },
    take: 50,
  });

  // Group by clerkUserId
  const byUser = new Map<string, typeof members>();
  for (const m of members) {
    const arr = byUser.get(m.clerkUserId) ?? [];
    arr.push(m);
    byUser.set(m.clerkUserId, arr);
  }

  return {
    users: [...byUser.entries()].map(([clerkUserId, rows]) => ({
      clerkUserId,
      email: rows[0].email,
      firstName: rows[0].firstName,
      lastName: rows[0].lastName,
      memberships: rows.map((r) => ({
        orgId: r.organization.id,
        orgName: r.organization.name,
        role: r.role,
        isActive: r.isActive,
        joinedAt: r.joinedAt.toISOString(),
        lastActiveAt: r.lastActiveAt?.toISOString() ?? null,
      })),
    })),
  };
}

// ── Audit log ─────────────────────────────────────────────────────────────────

export async function listAuditLog(filters?: {
  adminId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}) {
  await requirePlatformAdmin();
  const { adminId, action, limit = 50, offset = 0 } = filters ?? {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (adminId) where.clerkUserId = adminId;
  if (action)  where.action      = action;

  const [rows, total] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.adminAuditLog.count({ where }),
  ]);

  return {
    rows: rows.map((r) => ({
      id: r.id, email: r.email, action: r.action,
      targetType: r.targetType, targetId: r.targetId,
      metadata: r.metadata,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
  };
}
