import { InsightPriority, LifecycleStage } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";

export type InsightCandidate = {
  contactId: string;
  firstName: string;
  reason: string;
  priority: InsightPriority;
};

// ── Rule 1: Re-engagement ─────────────────────────────────────────────────────
// Active-funnel contacts last touched between 14 and 90 days ago.

const ACTIVE_STAGES: LifecycleStage[] = [
  LifecycleStage.LEAD,
  LifecycleStage.WORKING,
  LifecycleStage.ACTIVE_BUYER,
  LifecycleStage.ACTIVE_SELLER,
];

export async function findReEngagementCandidates(
  organizationId: string,
): Promise<InsightCandidate[]> {
  const now = new Date();
  const cutoffRecent = new Date(now.getTime() - 14 * 86_400_000);
  const cutoffStale  = new Date(now.getTime() - 90 * 86_400_000);

  const contacts = await db.contact.findMany({
    where: {
      organizationId,
      lifecycleStage: { in: ACTIVE_STAGES },
      lastContactAt: { gte: cutoffStale, lte: cutoffRecent },
    },
    select: { id: true, firstName: true, lastContactAt: true },
  });

  return contacts.map((c) => {
    const days = Math.floor(
      (now.getTime() - c.lastContactAt!.getTime()) / 86_400_000,
    );
    return {
      contactId: c.id,
      firstName: c.firstName,
      reason: `${c.firstName} hasn't been contacted in ${days} days.`,
      priority: InsightPriority.NORMAL,
    };
  });
}

// ── Rule 2: Pre-approval expiring ─────────────────────────────────────────────
// Buyer profiles where pre-approval expires within the next 30 days.

export async function findPreapprovalExpiringCandidates(
  organizationId: string,
): Promise<InsightCandidate[]> {
  const now  = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  const profiles = await db.buyerProfile.findMany({
    where: {
      organizationId,
      preApproved: true,
      preApprovalExpiresAt: { gte: now, lte: in30 },
    },
    select: {
      contactId: true,
      preApprovalExpiresAt: true,
      contact: { select: { firstName: true } },
    },
  });

  return profiles.map((p) => {
    const days = Math.ceil(
      (p.preApprovalExpiresAt!.getTime() - now.getTime()) / 86_400_000,
    );
    return {
      contactId: p.contactId,
      firstName: p.contact.firstName,
      reason: `${p.contact.firstName}'s pre-approval expires in ${days} day${days === 1 ? "" : "s"}.`,
      priority: InsightPriority.HIGH,
    };
  });
}

// ── Rule 3: Home anniversary ──────────────────────────────────────────────────
// Contacts whose home anniversary falls within the next 30 days.
// Raw SQL handles year-wrap (e.g. Dec 28 → Jan 5 = 8 days away) and Feb 29
// anniversaries (clamped to Feb 28 in non-leap years via LEAST + last-of-month).

type AnniversaryRow = {
  id: string;
  firstName: string;
  days_until: number | string; // driver may return numeric or string
};

export async function findAnniversaryCandidates(
  organizationId: string,
): Promise<InsightCandidate[]> {
  const rows = await db.$queryRaw<AnniversaryRow[]>`
    WITH ann AS (
      SELECT
        id,
        "firstName",
        make_date(
          EXTRACT(YEAR FROM NOW())::int,
          EXTRACT(MONTH FROM "homeAnniversary")::int,
          -- clamp day to last day of month (handles Feb 29 on non-leap years)
          LEAST(
            EXTRACT(DAY FROM "homeAnniversary")::int,
            EXTRACT(DAY FROM (
              make_date(
                EXTRACT(YEAR FROM NOW())::int,
                EXTRACT(MONTH FROM "homeAnniversary")::int,
                1
              ) + interval '1 month' - interval '1 day'
            ))::int
          )
        ) AS this_year_date
      FROM "Contact"
      WHERE "organizationId" = ${organizationId}
        AND "homeAnniversary" IS NOT NULL
        AND "lifecycleStage"::text NOT IN ('TRASH', 'INACTIVE')
    ),
    next_ann AS (
      SELECT
        id,
        "firstName",
        CASE
          WHEN this_year_date >= CURRENT_DATE THEN this_year_date
          ELSE (this_year_date + interval '1 year')::date
        END AS next_date
      FROM ann
    )
    SELECT
      id,
      "firstName",
      (next_date - CURRENT_DATE)::int AS days_until
    FROM next_ann
    WHERE next_date <= CURRENT_DATE + interval '30 days'
    ORDER BY days_until ASC
  `;

  return rows.map((r) => {
    const days = Number(r.days_until);
    return {
      contactId: r.id,
      firstName: r.firstName,
      reason: `${r.firstName}'s home anniversary is in ${days} day${days === 1 ? "" : "s"}.`,
      priority: InsightPriority.NORMAL,
    };
  });
}
