import "dotenv/config";
import { PrismaClient, LifecycleStage } from "../app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const org = await db.organization.findFirst({ select: { id: true, name: true } });
  if (!org) throw new Error("No org");
  console.log("Org:", org.name, org.id);

  // 1. Check seeded insight
  const insights = await db.aiInsight.findMany({
    where: { organizationId: org.id },
    select: { id: true, type: true, status: true, contactId: true, reason: true },
  });
  console.log("\nAiInsight rows:", insights.length);
  insights.forEach(i => console.log(" ", i.type, i.status, i.contactId.slice(0, 12), JSON.stringify(i.reason).slice(0, 60)));

  // 2. Check Thomas's contact fields
  const contact = await db.contact.findFirst({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, firstName: true, lastName: true, lifecycleStage: true, lastContactAt: true },
  });
  console.log("\nFirst contact:", contact?.firstName, contact?.lastName);
  console.log("  lifecycleStage:", contact?.lifecycleStage);
  console.log("  lastContactAt:", contact?.lastContactAt ?? "NULL");

  // 3. Count contacts matching the rule
  const now = new Date();
  const cutoffRecent = new Date(now.getTime() - 14 * 86_400_000);
  const cutoffStale  = new Date(now.getTime() - 90 * 86_400_000);
  const ACTIVE_STAGES = [LifecycleStage.LEAD, LifecycleStage.WORKING, LifecycleStage.ACTIVE_BUYER, LifecycleStage.ACTIVE_SELLER];

  const candidates = await db.contact.count({
    where: { organizationId: org.id, lifecycleStage: { in: ACTIVE_STAGES }, lastContactAt: { gte: cutoffStale, lte: cutoffRecent } },
  });
  console.log("\nRe-engagement rule matches (lastContactAt 14–90 days, active stage):", candidates);

  const nullLastContact = await db.contact.count({
    where: { organizationId: org.id, lifecycleStage: { in: ACTIVE_STAGES }, lastContactAt: null },
  });
  console.log("Active-stage contacts with NULL lastContactAt:", nullLastContact);
}

main().catch(console.error).finally(() => db.$disconnect());
