import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateInsightsForOrg } from "@/lib/insights/generate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const start = Date.now();

  const auth = req.headers.get("authorization") ?? "";
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orgs = await db.organization.findMany({
      where: { isSuspended: false },
      select: { id: true, name: true },
    });

    const breakdown: Array<{
      orgId: string;
      orgName: string;
      rules: Awaited<ReturnType<typeof generateInsightsForOrg>>;
    }> = [];

    for (const org of orgs) {
      const rules = await generateInsightsForOrg(org.id);
      breakdown.push({ orgId: org.id, orgName: org.name, rules });
    }

    const allRules = breakdown.flatMap((b) => b.rules);
    const totalCreated = allRules.reduce((s, r) => s + r.created, 0);
    const totalSkipped = allRules.reduce((s, r) => s + r.skipped, 0);

    return NextResponse.json({
      orgsProcessed: orgs.length,
      totalCreated,
      totalSkipped,
      durationMs: Date.now() - start,
      breakdown,
    });
  } catch (err) {
    console.error("[generate-insights cron]", err);
    return NextResponse.json(
      { error: "Internal server error", message: String(err) },
      { status: 500 },
    );
  }
}
