"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FunnelRow = {
  stageId: string;
  stageName: string;
  sortOrder: number;
  currentCount: number;
  everEnteredCount: number;   // from stage_change activities
  conversionRatePct: number | null;
  isTerminal: boolean;
  terminalOutcome: string | null;
  maxCurrentCount: number;    // denominator for bar width
};

export type VelocityRow = {
  stageId: string;
  stageName: string;
  sortOrder: number;
  avgDays: number | null;     // from activity pairs
  currentCount: number;
  hasOverdueDeal: boolean;
};

export type StuckDeal = {
  id: string;
  title: string;
  stageName: string;
  daysInStage: number;
  contactName: string | null;
  value: number | null;
  lastActivityDate: string | null;
};

export type WeekBucket = {
  weekStart: string;   // YYYY-MM-DD
  weekLabel: string;   // "Apr 14"
  count: number;
};

export type AnalyticsData = {
  workspaceName: string;
  workspaceSlug: string;
  range: string;
  kpis: {
    openPipelineValue: number;
    dealsWon: number;
    dealsLost: number;
    winRate: number | null;        // 0–1
    avgDealCycleDays: number | null;
  };
  funnel: FunnelRow[];
  velocity: VelocityRow[];
  stuckDeals: StuckDeal[];
  stuckDealsTotal: number;
  activityByWeek: WeekBucket[];
  hasActivityHistory: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseStageName(body: string): string {
  const m = body.match(/^Moved to (.+?)(?:\.|$)/);
  return m ? m[1].trim() : "";
}

function getWeekStart(d: Date): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - out.getDay()); // Sunday
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weekLabel(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function getWorkspaceAnalytics(
  workspaceId: string,
  range: string,
): Promise<AnalyticsData> {
  const { organizationId } = await requireOrg();

  const validRange = ["30", "90", "365", "all"].includes(range) ? range : "90";
  const rangeStart: Date | null =
    validRange === "all"
      ? null
      : new Date(Date.now() - parseInt(validRange, 10) * 86_400_000);

  const now = new Date();

  // Single parallel fetch
  const [workspace, stages, allDeals, allStageChanges, rangedActivities] =
    await Promise.all([
      db.workspace.findFirst({
        where: { id: workspaceId, organizationId },
        select: { name: true, slug: true },
      }),

      db.stage.findMany({
        where: { workspaceId },
        orderBy: { sortOrder: "asc" },
      }),

      db.deal.findMany({
        where: { workspaceId, organizationId },
        include: {
          stage: { select: { isTerminal: true, terminalOutcome: true, name: true, sortOrder: true } },
          contact: { select: { firstName: true, lastName: true } },
        },
      }),

      // All-time stage_change activities (no range filter) — used for velocity + stuck thresholds
      db.activity.findMany({
        where: { workspaceId, type: "stage_change" },
        orderBy: { createdAt: "asc" },
        select: { id: true, dealId: true, body: true, createdAt: true },
      }),

      // Range-filtered ALL activities — used for weekly chart + last-touch per deal
      db.activity.findMany({
        where: {
          workspaceId,
          ...(rangeStart ? { createdAt: { gte: rangeStart } } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, dealId: true, createdAt: true, type: true },
      }),
    ]);

  if (!workspace) {
    return emptyResult(workspaceId, validRange);
  }

  const stageNameToId = new Map(stages.map((s) => [s.name.toLowerCase(), s.id]));

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const wonDeals = allDeals.filter(
    (d) =>
      d.stage.isTerminal &&
      d.stage.terminalOutcome === "won" &&
      (!rangeStart || d.movedToStageAt >= rangeStart),
  );
  const lostDeals = allDeals.filter(
    (d) =>
      d.stage.isTerminal &&
      d.stage.terminalOutcome === "lost" &&
      (!rangeStart || d.movedToStageAt >= rangeStart),
  );
  const openDeals = allDeals.filter((d) => !d.stage.isTerminal);

  const openPipelineValue = openDeals.reduce(
    (s, d) => s + (d.value ? Number(d.value) : 0),
    0,
  );

  const wl = wonDeals.length + lostDeals.length;
  const winRate = wl > 0 ? wonDeals.length / wl : null;

  const avgDealCycleDays =
    wonDeals.length > 0
      ? wonDeals.reduce(
          (s, d) =>
            s + (d.movedToStageAt.getTime() - d.createdAt.getTime()) / 86_400_000,
          0,
        ) / wonDeals.length
      : null;

  // ── Velocity (from all-time stage_change activities) ───────────────────────

  // Group by dealId, build (stageId → durations[]) pairs
  const actsByDeal = new Map<string, typeof allStageChanges>();
  for (const a of allStageChanges) {
    if (!a.dealId) continue;
    const arr = actsByDeal.get(a.dealId) ?? [];
    arr.push(a);
    actsByDeal.set(a.dealId, arr);
  }

  const stageDurationMap = new Map<string, number[]>(); // stageId → completed durations

  for (const [, acts] of actsByDeal) {
    for (let i = 0; i < acts.length - 1; i++) {
      const stageName = parseStageName(acts[i].body);
      const stageId   = stageNameToId.get(stageName.toLowerCase());
      if (!stageId) continue;
      const dur =
        (acts[i + 1].createdAt.getTime() - acts[i].createdAt.getTime()) /
        86_400_000;
      const arr = stageDurationMap.get(stageId) ?? [];
      arr.push(Math.max(0, dur));
      stageDurationMap.set(stageId, arr);
    }
  }

  const hasActivityHistory = allStageChanges.length > 0;

  // Current deal count per stage
  const dealsByStage = new Map<string, typeof allDeals>();
  for (const d of allDeals) {
    const arr = dealsByStage.get(d.stageId) ?? [];
    arr.push(d);
    dealsByStage.set(d.stageId, arr);
  }

  const velocity: VelocityRow[] = stages.map((stage) => {
    const durs = stageDurationMap.get(stage.id) ?? [];
    const avgDays =
      durs.length > 0 ? durs.reduce((a, b) => a + b, 0) / durs.length : null;
    const currentDeals = dealsByStage.get(stage.id) ?? [];
    const threshold = avgDays != null ? avgDays * 1.5 : 14;
    const hasOverdueDeal =
      !stage.isTerminal &&
      currentDeals.some(
        (d) =>
          (now.getTime() - d.movedToStageAt.getTime()) / 86_400_000 > threshold,
      );
    return {
      stageId: stage.id,
      stageName: stage.name,
      sortOrder: stage.sortOrder,
      avgDays,
      currentCount: currentDeals.length,
      hasOverdueDeal,
    };
  });

  // ── Funnel (current counts + activity-based ever-entered) ──────────────────

  const everEnteredStage = new Map<string, Set<string>>();
  const rangedStageChanges = rangeStart
    ? allStageChanges.filter((a) => a.createdAt >= rangeStart)
    : allStageChanges;

  for (const a of rangedStageChanges) {
    if (!a.dealId) continue;
    const stageName = parseStageName(a.body);
    const stageId   = stageNameToId.get(stageName.toLowerCase());
    if (!stageId) continue;
    const set = everEnteredStage.get(stageId) ?? new Set();
    set.add(a.dealId);
    everEnteredStage.set(stageId, set);
  }

  const maxCurrentCount = Math.max(
    1,
    ...stages.map((s) => (dealsByStage.get(s.id) ?? []).length),
  );

  const funnel: FunnelRow[] = stages.map((stage) => {
    const currentCount  = (dealsByStage.get(stage.id) ?? []).length;
    const everEntered   = everEnteredStage.get(stage.id) ?? new Set();

    let conversionRatePct: number | null = null;
    if (hasActivityHistory && !stage.isTerminal) {
      const nextStage = stages.find(
        (s) => s.sortOrder === stage.sortOrder + 1,
      );
      if (nextStage && everEntered.size > 0) {
        const nextEntered = everEnteredStage.get(nextStage.id) ?? new Set();
        const both = [...everEntered].filter((id) => nextEntered.has(id)).length;
        conversionRatePct = Math.round((both / everEntered.size) * 100);
      }
    }

    return {
      stageId:          stage.id,
      stageName:        stage.name,
      sortOrder:        stage.sortOrder,
      currentCount,
      everEnteredCount: everEntered.size,
      conversionRatePct,
      isTerminal:       stage.isTerminal,
      terminalOutcome:  stage.terminalOutcome,
      maxCurrentCount,
    };
  });

  // ── Stuck deals ───────────────────────────────────────────────────────────

  // Last activity date per deal (from ranged activities, any type)
  const lastActByDeal = new Map<string, string>();
  for (const a of rangedActivities) {
    if (a.dealId && !lastActByDeal.has(a.dealId)) {
      lastActByDeal.set(a.dealId, a.createdAt.toISOString());
    }
  }

  const allStuck: StuckDeal[] = [];
  for (const stage of stages) {
    if (stage.isTerminal) continue;
    const stageVel     = velocity.find((v) => v.stageId === stage.id);
    const threshold    = stageVel?.avgDays != null ? stageVel.avgDays * 1.5 : 14;
    const currentDeals = dealsByStage.get(stage.id) ?? [];

    for (const deal of currentDeals) {
      const daysInStage =
        (now.getTime() - deal.movedToStageAt.getTime()) / 86_400_000;
      if (daysInStage <= threshold) continue;
      allStuck.push({
        id:               deal.id,
        title:            deal.title,
        stageName:        stage.name,
        daysInStage:      Math.floor(daysInStage),
        contactName: deal.contact
          ? [deal.contact.firstName, deal.contact.lastName]
              .filter(Boolean)
              .join(" ")
          : null,
        value:            deal.value ? Number(deal.value) : null,
        lastActivityDate: lastActByDeal.get(deal.id) ?? null,
      });
    }
  }
  allStuck.sort((a, b) => b.daysInStage - a.daysInStage);

  // ── Activity by week (all types, range-filtered) ───────────────────────────

  const weekMap = new Map<string, number>();
  for (const a of rangedActivities) {
    const key = isoDate(getWeekStart(a.createdAt));
    weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
  }

  const activityByWeek: WeekBucket[] = [];
  if (rangeStart) {
    const cursor  = getWeekStart(rangeStart);
    const endCur  = getWeekStart(now);
    endCur.setDate(endCur.getDate() + 7);
    while (cursor <= endCur) {
      const key = isoDate(cursor);
      activityByWeek.push({
        weekStart: key,
        weekLabel: weekLabel(cursor),
        count:     weekMap.get(key) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const keys = [...weekMap.keys()].sort();
    for (const key of keys) {
      activityByWeek.push({
        weekStart: key,
        weekLabel: weekLabel(new Date(key)),
        count:     weekMap.get(key) ?? 0,
      });
    }
  }

  return {
    workspaceName:      workspace.name,
    workspaceSlug:      workspace.slug,
    range:              validRange,
    kpis: {
      openPipelineValue,
      dealsWon:         wonDeals.length,
      dealsLost:        lostDeals.length,
      winRate,
      avgDealCycleDays,
    },
    funnel,
    velocity,
    stuckDeals:         allStuck.slice(0, 10),
    stuckDealsTotal:    allStuck.length,
    activityByWeek,
    hasActivityHistory,
  };
}

function emptyResult(slug: string, range: string): AnalyticsData {
  return {
    workspaceName:    "",
    workspaceSlug:    slug,
    range,
    kpis:             { openPipelineValue: 0, dealsWon: 0, dealsLost: 0, winRate: null, avgDealCycleDays: null },
    funnel:           [],
    velocity:         [],
    stuckDeals:       [],
    stuckDealsTotal:  0,
    activityByWeek:   [],
    hasActivityHistory: false,
  };
}
