import { InsightStatus, InsightType } from "@/app/generated/prisma/client";
import { db } from "@/lib/db";
import {
  findAnniversaryCandidates,
  findPreapprovalExpiringCandidates,
  findReEngagementCandidates,
  type InsightCandidate,
} from "./rules";
import {
  generateSuggestedMessage,
  type MessageContext,
} from "./message-generator";
import { FAILED_STUB, PENDING_STUB } from "./constants";

// ── Return types ──────────────────────────────────────────────────────────────

export type RuleResult = {
  rule: string;
  evaluated: number;
  created: number;
  skipped: number;
};

export type GenerationResult = {
  insightId: string;
  type: string;
  durationMs: number;
  success: boolean;
  error?: string;
};

export type OrgInsightResult = {
  rules: RuleResult[];
  generation: GenerationResult[];
};

// ── Detection rules ───────────────────────────────────────────────────────────

const RULES: Array<{
  type: InsightType;
  name: string;
  fn: (orgId: string) => Promise<InsightCandidate[]>;
}> = [
  { type: InsightType.RE_ENGAGEMENT,       name: "re_engagement",        fn: findReEngagementCandidates },
  { type: InsightType.PREAPPROVAL_EXPIRING, name: "preapproval_expiring", fn: findPreapprovalExpiringCandidates },
  { type: InsightType.ANNIVERSARY,          name: "anniversary",          fn: findAnniversaryCandidates },
];

// ── Shared helpers (also used by the regenerate API route) ───────────────────

export async function getAgentFirstName(organizationId: string): Promise<string | null> {
  const owner = await db.organizationMember.findFirst({
    where: { organizationId, isActive: true },
    orderBy: { joinedAt: "asc" },
    select: { firstName: true },
  });
  return owner?.firstName ?? null;
}

export async function buildMessageContext(
  insight: { id: string; type: InsightType; contactId: string },
  agentFirstName: string | null,
): Promise<MessageContext> {
  const contact = await db.contact.findUnique({
    where: { id: insight.contactId },
    select: {
      firstName: true,
      lifecycleStage: true,
      notes: true,
      lastContactAt: true,
      homeAnniversary: true,
      buyerProfile: {
        select: {
          bedroomsMin: true,
          priceMinCents: true,
          priceMaxCents: true,
          neighborhoods: true,
          preApprovalLender: true,
          preApprovalAmountCents: true,
          preApprovalExpiresAt: true,
        },
      },
    },
  });

  if (!contact) throw new Error(`Contact not found: ${insight.contactId}`);

  const now = new Date();
  const ctx: MessageContext = {
    type: insight.type,
    firstName: contact.firstName,
    agentFirstName,
  };

  if (insight.type === InsightType.RE_ENGAGEMENT) {
    ctx.daysSinceContact = contact.lastContactAt
      ? Math.floor((now.getTime() - contact.lastContactAt.getTime()) / 86_400_000)
      : undefined;
    ctx.lifecycleStage = contact.lifecycleStage;
    ctx.notes = contact.notes;
    ctx.bedroomsMin = contact.buyerProfile?.bedroomsMin;
    ctx.priceMinCents = contact.buyerProfile?.priceMinCents;
    ctx.priceMaxCents = contact.buyerProfile?.priceMaxCents;
    ctx.neighborhoods = contact.buyerProfile?.neighborhoods;
    ctx.preApprovalLender = contact.buyerProfile?.preApprovalLender;
  }

  if (insight.type === InsightType.PREAPPROVAL_EXPIRING) {
    const expiresAt = contact.buyerProfile?.preApprovalExpiresAt;
    ctx.daysUntilExpiry = expiresAt
      ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
      : undefined;
    ctx.preApprovalLender = contact.buyerProfile?.preApprovalLender;
    ctx.preApprovalAmountCents = contact.buyerProfile?.preApprovalAmountCents;
  }

  if (insight.type === InsightType.ANNIVERSARY && contact.homeAnniversary) {
    const a = contact.homeAnniversary;
    const thisYear = new Date(now.getFullYear(), a.getMonth(), a.getDate());
    const next = thisYear >= now
      ? thisYear
      : new Date(now.getFullYear() + 1, a.getMonth(), a.getDate());
    ctx.daysUntilAnniversary = Math.round((next.getTime() - now.getTime()) / 86_400_000);
    ctx.homeAnniversaryYear = a.getFullYear();
  }

  return ctx;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export async function generateInsightsForOrg(
  organizationId: string,
): Promise<OrgInsightResult> {
  // Phase 1: detection + dedupe + insertion
  const rules: RuleResult[] = [];

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

      if (existing) { skipped++; continue; }

      const now = new Date();
      await db.aiInsight.create({
        data: {
          contactId: candidate.contactId,
          organizationId,
          type: rule.type,
          priority: candidate.priority,
          reason: candidate.reason,
          suggestedMessage: PENDING_STUB,
          status: InsightStatus.PENDING,
          ownerClerkUserId: candidate.ownerClerkUserId,
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 30 * 86_400_000),
        },
      });
      created++;
    }

    rules.push({ rule: rule.name, evaluated: candidates.length, created, skipped });
  }

  // Phase 2: message generation
  // Includes newly created rows (stub) + retry-eligible failed rows (attempts < 3)
  const toGenerate = await db.aiInsight.findMany({
    where: {
      organizationId,
      status: InsightStatus.PENDING,
      manuallyEdited: false,
      actedAt: null,
      OR: [
        { suggestedMessage: PENDING_STUB },
        { suggestedMessage: { startsWith: FAILED_STUB }, generationAttempts: { lt: 3 } },
      ],
    },
    select: { id: true, type: true, contactId: true, generationAttempts: true },
  });

  const agentFirstName = await getAgentFirstName(organizationId);

  const generation: GenerationResult[] = [];

  for (const insight of toGenerate) {
    const genStart = Date.now();
    try {
      const ctx = await buildMessageContext(insight, agentFirstName);
      const message = await generateSuggestedMessage(ctx);
      await db.aiInsight.update({
        where: { id: insight.id },
        data: { suggestedMessage: message },
      });
      generation.push({ insightId: insight.id, type: insight.type, durationMs: Date.now() - genStart, success: true });
    } catch (err) {
      console.error(`[generate] insight ${insight.id} failed:`, err);
      await db.aiInsight.update({
        where: { id: insight.id },
        data: {
          suggestedMessage: FAILED_STUB,
          generationAttempts: { increment: 1 },
        },
      });
      generation.push({
        insightId: insight.id,
        type: insight.type,
        durationMs: Date.now() - genStart,
        success: false,
        error: String(err),
      });
    }
  }

  return { rules, generation };
}
