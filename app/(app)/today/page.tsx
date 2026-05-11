import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAccessControl, ownerFilter, assigneeFilter } from "@/lib/access";
import { TodayDashboard } from "@/components/today-dashboard";
import type { SerializedTask } from "@/app/actions/tasks";
import type { SerializedActivity } from "@/app/actions/activities";

export const metadata: Metadata = { title: "Today" };

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function serTask(t: {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  taskType: string | null;
  dueAt: Date | null;
  reminderAt: Date | null;
  completedAt: Date | null;
  contactId: string | null;
  dealId: string | null;
  workspaceId: string | null;
  createdAt: Date;
}): SerializedTask {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    taskType: t.taskType,
    dueAt: t.dueAt?.toISOString() ?? null,
    reminderAt: t.reminderAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    contactId: t.contactId,
    dealId: t.dealId,
    workspaceId: t.workspaceId,
    createdAt: t.createdAt.toISOString(),
  };
}

export default async function TodayPage() {
  const { orgId: clerkOrgId } = await auth();
  const user = await currentUser();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const email = user?.emailAddresses?.[0]?.emailAddress ?? "";
  const firstName = titleCase(user?.firstName || email.split("@")[0] || "there");
  const { visibleUserIds } = await getAccessControl(org.id);

  const now = new Date();
  const startOfToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const endOfToday   = new Date(startOfToday.getTime() + 86_400_000 - 1);
  const in24h        = new Date(now.getTime() + 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  const [
    rawOverdue,
    rawToday,
    rawReminders,
    rawActivities,
    [newContacts, dealsMovedThisWeek, tasksCompletedThisWeek],
    pipelineSum,
    openDealCount,
    contactCount,
    firstWorkspace,
  ] = await Promise.all([
    // Overdue: dueAt < start-of-today AND not completed
    db.task.findMany({
      where: {
        organizationId: org.id,
        dueAt: { lt: startOfToday },
        completedAt: null,
        ...assigneeFilter(visibleUserIds),
      },
      orderBy: { dueAt: "asc" },
      take: 50,
    }),

    // Today: dueAt within today AND not completed
    db.task.findMany({
      where: {
        organizationId: org.id,
        dueAt: { gte: startOfToday, lte: endOfToday },
        completedAt: null,
        ...assigneeFilter(visibleUserIds),
      },
      orderBy: { dueAt: "asc" },
      take: 50,
    }),

    // Reminders: reminderAt in next 24 hours AND not completed
    db.task.findMany({
      where: {
        organizationId: org.id,
        completedAt: null,
        reminderAt: { gte: now, lte: in24h },
        ...assigneeFilter(visibleUserIds),
      },
      orderBy: { reminderAt: "asc" },
      take: 20,
    }),

    // Recent activities — visibility inherited from parent contact/deal ownership
    db.activity.findMany({
      where: {
        organizationId: org.id,
        occurredAt: { gte: sevenDaysAgo },
        OR: [
          { contact: { ...ownerFilter(visibleUserIds) } },
          { contactId: null, deal: { ...ownerFilter(visibleUserIds) } },
          { contactId: null, dealId: null },
        ],
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 20,
    }),

    // Stats: parallel sub-queries
    Promise.all([
      db.contact.count({
        where: { organizationId: org.id, createdAt: { gte: sevenDaysAgo }, ...ownerFilter(visibleUserIds) },
      }),
      db.deal.count({
        where: { organizationId: org.id, movedToStageAt: { gte: sevenDaysAgo }, ...ownerFilter(visibleUserIds) },
      }),
      db.task.count({
        where: { organizationId: org.id, completedAt: { gte: sevenDaysAgo }, ...assigneeFilter(visibleUserIds) },
      }),
    ]),

    // Pipeline value sum of open deals
    db.deal.aggregate({
      where: { organizationId: org.id, status: "open", ...ownerFilter(visibleUserIds) },
      _sum: { value: true },
    }),

    // Open deal count
    db.deal.count({ where: { organizationId: org.id, status: "open", ...ownerFilter(visibleUserIds) } }),

    // Whether org has any contacts at all
    db.contact.count({ where: { organizationId: org.id, ...ownerFilter(visibleUserIds) } }),

    // First workspace for "visit workspace" CTA
    db.workspace.findFirst({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { slug: true },
    }),
  ]);

  // Build contact name map for activities
  const activityContacts: Record<string, { name: string; id: string }> = {};
  for (const a of rawActivities) {
    if (a.contact && a.contactId) {
      activityContacts[a.contactId] = {
        id: a.contact.id,
        name: [a.contact.firstName, a.contact.lastName].filter(Boolean).join(" "),
      };
    }
  }

  const activities: SerializedActivity[] = rawActivities.map((a) => ({
    id: a.id,
    type: a.type,
    body: a.body,
    occurredAt: a.occurredAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    contactId: a.contactId,
    dealId: a.dealId,
    workspaceId: a.workspaceId,
  }));

  return (
    <TodayDashboard
      firstName={firstName}
      initialOverdue={rawOverdue.map(serTask)}
      initialToday={rawToday.map(serTask)}
      initialReminders={rawReminders.map(serTask)}
      activities={activities}
      activityContacts={activityContacts}
      pipeline={{
        totalValue: Number(pipelineSum._sum.value ?? 0),
        openDealsCount: openDealCount,
      }}
      stats={{ newContacts, dealsMovedThisWeek, tasksCompletedThisWeek }}
      hasContacts={contactCount > 0}
      firstWorkspaceSlug={firstWorkspace?.slug}
    />
  );
}
