import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { TodayDashboard } from "@/components/today-dashboard";
import type { SerializedTask } from "@/app/actions/tasks";
import type { SerializedActivity } from "@/app/actions/activities";

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

  const firstName = user?.firstName ?? "there";

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
  ] = await Promise.all([
    // Overdue: dueAt < start-of-today AND not completed
    db.task.findMany({
      where: {
        organizationId: org.id,
        dueAt: { lt: startOfToday },
        completedAt: null,
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
      },
      orderBy: { reminderAt: "asc" },
      take: 20,
    }),

    // Recent activities with contact info joined
    db.activity.findMany({
      where: { organizationId: org.id, occurredAt: { gte: sevenDaysAgo } },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 20,
    }),

    // Stats: parallel sub-queries
    Promise.all([
      db.contact.count({
        where: { organizationId: org.id, createdAt: { gte: sevenDaysAgo } },
      }),
      db.deal.count({
        where: { organizationId: org.id, movedToStageAt: { gte: sevenDaysAgo } },
      }),
      db.task.count({
        where: { organizationId: org.id, completedAt: { gte: sevenDaysAgo } },
      }),
    ]),

    // Pipeline value sum of open deals
    db.deal.aggregate({
      where: { organizationId: org.id, status: "open" },
      _sum: { value: true },
    }),

    // Open deal count
    db.deal.count({ where: { organizationId: org.id, status: "open" } }),

    // Whether org has any contacts at all
    db.contact.count({ where: { organizationId: org.id } }),
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
    />
  );
}
