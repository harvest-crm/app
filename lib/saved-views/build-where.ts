import type { Prisma } from "@/app/generated/prisma/client";
import type { ContactFilters, TaskFilters, DealFilters } from "./filter-types";

// ── Contacts ──────────────────────────────────────────────────────────────────

export function buildContactWhere(
  filters: ContactFilters,
  organizationId: string,
): Prisma.ContactWhereInput {
  const AND: Prisma.ContactWhereInput[] = [{ organizationId }];

  if (filters.q) {
    AND.push({
      OR: [
        { firstName: { contains: filters.q, mode: "insensitive" } },
        { lastName:  { contains: filters.q, mode: "insensitive" } },
        { email:     { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    AND.push({
      contactWorkspaces: {
        some: { workspaceId: { in: filters.workspaceIds } },
      },
    });
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    if (filters.tagsLogic === "and") {
      for (const tagId of filters.tagIds) {
        AND.push({ contactTags: { some: { tagId } } });
      }
    } else {
      AND.push({ contactTags: { some: { tagId: { in: filters.tagIds } } } });
    }
  }

  if (filters.temperature && filters.temperature.length > 0) {
    AND.push({ temperature: { in: filters.temperature } });
  }

  if (filters.hasOpenTasks === true) {
    AND.push({ tasks: { some: { completedAt: null } } });
  }

  if (filters.hasOpenDeals === true) {
    AND.push({ deals: { some: { status: "open" } } });
  }

  if (filters.createdAfter) {
    AND.push({ createdAt: { gte: new Date(filters.createdAfter) } });
  }

  if (filters.createdBefore) {
    AND.push({ createdAt: { lte: new Date(filters.createdBefore) } });
  }

  return { AND };
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export function buildTaskWhere(
  filters: TaskFilters,
  organizationId: string,
): Prisma.TaskWhereInput {
  const AND: Prisma.TaskWhereInput[] = [{ organizationId }];

  if (filters.q) {
    AND.push({ title: { contains: filters.q, mode: "insensitive" } });
  }

  if (filters.workspaceIds && filters.workspaceIds.length > 0) {
    AND.push({ workspaceId: { in: filters.workspaceIds } });
  }

  if (filters.taskTypes && filters.taskTypes.length > 0) {
    AND.push({ taskType: { in: filters.taskTypes } });
  }

  if (filters.priorities && filters.priorities.length > 0) {
    AND.push({ priority: { in: filters.priorities } });
  }

  if (!filters.status || filters.status === "open") {
    AND.push({ completedAt: null });
  } else if (filters.status === "completed") {
    AND.push({ completedAt: { not: null } });
  }

  if (filters.hasReminder === true) {
    AND.push({ reminderAt: { not: null } });
  }

  if (filters.dueWithin && filters.dueWithin !== "all") {
    const now = new Date();
    if (filters.dueWithin === "overdue") {
      AND.push({ dueAt: { lt: now }, completedAt: null });
    } else if (filters.dueWithin === "today") {
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
      AND.push({ dueAt: { gte: todayStart, lte: todayEnd } });
    } else if (filters.dueWithin === "this_week") {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
      weekEnd.setHours(23, 59, 59, 999);
      AND.push({ dueAt: { lte: weekEnd } });
    } else if (filters.dueWithin === "this_month") {
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      AND.push({ dueAt: { lte: monthEnd } });
    }
  }

  return { AND };
}

// ── Deals ─────────────────────────────────────────────────────────────────────

export function buildDealWhere(
  filters: DealFilters,
  organizationId: string,
  workspaceId?: string,
): Prisma.DealWhereInput {
  const AND: Prisma.DealWhereInput[] = [{ organizationId }];

  if (workspaceId) AND.push({ workspaceId });

  if (filters.q) {
    AND.push({ title: { contains: filters.q, mode: "insensitive" } });
  }

  if (filters.stageIds && filters.stageIds.length > 0) {
    AND.push({ stageId: { in: filters.stageIds } });
  }

  if (typeof filters.valueMin === "number") {
    AND.push({ value: { gte: filters.valueMin } });
  }

  if (typeof filters.valueMax === "number") {
    AND.push({ value: { lte: filters.valueMax } });
  }

  if (typeof filters.daysInStageMin === "number") {
    const cutoff = new Date(Date.now() - filters.daysInStageMin * 86_400_000);
    AND.push({ movedToStageAt: { lte: cutoff } });
  }

  if (filters.hasContact === true) {
    AND.push({ contactId: { not: null } });
  }

  if (filters.contactTagIds && filters.contactTagIds.length > 0) {
    AND.push({
      contact: {
        contactTags: { some: { tagId: { in: filters.contactTagIds } } },
      },
    });
  }

  if (filters.createdAfter) {
    AND.push({ createdAt: { gte: new Date(filters.createdAfter) } });
  }

  if (filters.createdBefore) {
    AND.push({ createdAt: { lte: new Date(filters.createdBefore) } });
  }

  return { AND };
}
