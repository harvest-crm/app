/**
 * One-off: seeds a test AiInsight on the first contact in the org.
 * Run with:  pnpm tsx scripts/seed-test-insight.ts
 */
import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const org = await db.organization.findFirst({ select: { id: true, name: true } });
  if (!org) throw new Error("No organization found");

  const contact = await db.contact.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, firstName: true, lastName: true, lastContactAt: true },
  });
  if (!contact) throw new Error("No contact found");

  const daysSinceContact = contact.lastContactAt
    ? Math.floor((Date.now() - contact.lastContactAt.getTime()) / 86_400_000)
    : 14;

  const insight = await db.aiInsight.upsert({
    where: {
      // use a stable ID so re-runs are idempotent
      id: `seed_insight_${contact.id}`,
    },
    create: {
      id: `seed_insight_${contact.id}`,
      contactId: contact.id,
      organizationId: org.id,
      type: "RE_ENGAGEMENT",
      priority: "HIGH",
      reason: `${contact.firstName} hasn't been contacted in ${daysSinceContact} days. They viewed 3 properties on the website last week and their pre-approval expires in 3 months.`,
      suggestedMessage: `Hey ${contact.firstName}, a few homes just hit the market in Memorial that match exactly what you're looking for. Want to tour this weekend?`,
      status: "PENDING",
    },
    update: {
      status: "PENDING",
    },
  });

  console.log(`Seeded insight ${insight.id} on ${contact.firstName} ${contact.lastName ?? ""} (org: ${org.name})`);
}

main().catch(console.error).finally(() => db.$disconnect());
