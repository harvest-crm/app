import { InsightStatus, InsightType } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import {
  findAnniversaryCandidates,
  findPreapprovalExpiringCandidates,
  findReEngagementCandidates,
  type InsightCandidate,
} from "./rules";

export type RuleResult = {
  rule: string;
  evaluated: number;
  created: number;
  skipped: number;
};

const RULES: Array<{
  type: InsightType;
  name: string;
  fn: (orgId: string) => Promise<InsightCandidate[]>;
}> = [
  {
    type: InsightType.RE_ENGAGEMENT,
    name: "re_engagement",
    fn: findReEngagementCandidates,
  },
  {
    type: InsightType.PREAPPROVAL_EXPIRING,
    name: "preapproval_expiring",
    fn: findPreapprovalExpiringCandidates,
  },
  {
    type: InsightType.ANNIVERSARY,
    name: "anniversary",
    fn: findAnniversaryCandidates,
  },
];

export async function generateInsightsForOrg(
  organizationId: string,
): Promise<RuleResult[]> {
  const results: RuleResult[] = [];

  for (const rule of RULES) {
    const candidates = await rule.fn(organizationId);
    let created = 0;
    let skipped = 0;

    for (const candidate of candidates) {
      const existing = await db.aiInsight.findFirst({
        where: {
          contactId: candidate.contactId,
          organizationId,
          type: rule.type,
          status: InsightStatus.PENDING,
        },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const now = new Date();
      await db.aiInsight.create({
        data: {
          contactId: candidate.contactId,
          organizationId,
          type: rule.type,
          priority: candidate.priority,
          reason: candidate.reason,
          suggestedMessage: "Pending generation.",
          status: InsightStatus.PENDING,
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 86_400_000),
        },
      });

      created++;
    }

    results.push({ rule: rule.name, evaluated: candidates.length, created, skipped });
  }

  return results;
}
