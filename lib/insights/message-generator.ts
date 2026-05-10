import Anthropic from "@anthropic-ai/sdk";
import { InsightType, LifecycleStage } from "@/app/generated/prisma/client";

export const MODEL = "claude-haiku-4-5-20251001" as const;

const SYSTEM_PROMPT = `You are drafting a short message for a real estate agent to send to a client or prospect. Write exactly one message, 2 to 4 sentences. Voice: warm, direct, conversational. First person from the agent. Never use em dashes, hyphens, or semicolons. Never use any of these phrases or anything similar: "I hope this finds you well," "I wanted to reach out," "just checking in," "circling back," "touching base," "just wanted to reach out," "the market is hot," "in this competitive market," "as your trusted agent," or anything that sounds like a template or mass communication. Do not add a subject line or sign-off. Output only the message text, nothing else.`;

const STAGE_LABEL: Partial<Record<LifecycleStage, string>> = {
  LEAD:          "lead",
  WORKING:       "working lead",
  ACTIVE_BUYER:  "active buyer",
  ACTIVE_SELLER: "active seller",
};

export type MessageContext = {
  type: InsightType;
  firstName: string;
  agentFirstName: string | null;
  // RE_ENGAGEMENT
  daysSinceContact?: number;
  lifecycleStage?: LifecycleStage;
  notes?: string | null;
  bedroomsMin?: number | null;
  priceMinCents?: bigint | null;
  priceMaxCents?: bigint | null;
  neighborhoods?: string[];
  preApprovalLender?: string | null;
  // PREAPPROVAL_EXPIRING
  daysUntilExpiry?: number;
  preApprovalAmountCents?: bigint | null;
  // ANNIVERSARY
  daysUntilAnniversary?: number;
  homeAnniversaryYear?: number | null;
};

function buildUserPrompt(ctx: MessageContext): string {
  const agentLine = ctx.agentFirstName
    ? `You are drafting a message that will be sent by ${ctx.agentFirstName}.`
    : "";

  const lines: string[] = agentLine ? [agentLine] : [];

  switch (ctx.type) {
    case InsightType.RE_ENGAGEMENT: {
      lines.push(`Contact first name: ${ctx.firstName}`);
      lines.push(`Days since last contact: ${ctx.daysSinceContact}`);
      if (ctx.lifecycleStage) {
        lines.push(`Lifecycle stage: ${STAGE_LABEL[ctx.lifecycleStage] ?? ctx.lifecycleStage}`);
      }
      if (ctx.bedroomsMin) lines.push(`Looking for: ${ctx.bedroomsMin}+ bedrooms`);
      if (ctx.priceMinCents && ctx.priceMaxCents) {
        const minK = Math.round(Number(ctx.priceMinCents) / 100_000);
        const maxK = Math.round(Number(ctx.priceMaxCents) / 100_000);
        lines.push(`Budget: $${minK}K to $${maxK}K`);
      }
      if (ctx.neighborhoods?.length) {
        lines.push(`Preferred areas: ${ctx.neighborhoods.slice(0, 3).join(", ")}`);
      }
      if (ctx.preApprovalLender) lines.push(`Pre-approved through: ${ctx.preApprovalLender}`);
      if (ctx.notes) {
        const snippet = ctx.notes.length <= 200 ? ctx.notes : ctx.notes.slice(0, 200) + "...";
        lines.push(`Recent context: ${snippet}`);
      }
      lines.push(`\nDraft a message to re-engage this contact after ${ctx.daysSinceContact} days of no contact.`);
      break;
    }

    case InsightType.PREAPPROVAL_EXPIRING: {
      lines.push(`Contact first name: ${ctx.firstName}`);
      lines.push(`Pre-approval expires in: ${ctx.daysUntilExpiry} days`);
      if (ctx.preApprovalLender) lines.push(`Lender: ${ctx.preApprovalLender}`);
      if (ctx.preApprovalAmountCents) {
        const amount = Math.round(Number(ctx.preApprovalAmountCents) / 100);
        lines.push(`Approved amount: $${amount.toLocaleString()}`);
      }
      lines.push(`\nDraft a message prompting this contact to renew or discuss their pre-approval before it expires.`);
      break;
    }

    case InsightType.ANNIVERSARY: {
      lines.push(`Contact first name: ${ctx.firstName}`);
      lines.push(`Home anniversary: ${ctx.daysUntilAnniversary} days away`);
      if (ctx.homeAnniversaryYear) {
        const years = new Date().getFullYear() - ctx.homeAnniversaryYear + 1;
        if (years > 0) lines.push(`This will be year ${years} in their home`);
      }
      lines.push(`\nDraft a warm, brief message acknowledging their upcoming home anniversary.`);
      break;
    }

    default: {
      lines.push(`Contact first name: ${ctx.firstName}`);
      lines.push(`\nDraft a brief outreach message.`);
    }
  }

  return lines.join("\n");
}

export async function generateSuggestedMessage(ctx: MessageContext): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(ctx) }],
    },
    { timeout: 15_000 },
  );

  const block = response.content[0];
  if (block.type !== "text" || !block.text.trim()) {
    throw new Error("Empty response from model");
  }

  return block.text.trim();
}
