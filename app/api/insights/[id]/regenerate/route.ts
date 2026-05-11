import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { buildMessageContext, getAgentFirstName } from "@/lib/insights/generate";
import { generateSuggestedMessage } from "@/lib/insights/message-generator";
import { getAccessControl, ownerFilter } from "@/lib/access";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { orgId: clerkOrgId, userId } = await auth();
  if (!userId || !clerkOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 403 });

  const { id } = await params;
  const { visibleUserIds } = await getAccessControl(org.id);
  const insight = await db.aiInsight.findFirst({
    where: { id, organizationId: org.id, ...ownerFilter(visibleUserIds) },
    select: { id: true, type: true, contactId: true },
  });
  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = Date.now();
  try {
    const agentFirstName = await getAgentFirstName(org.id);
    const ctx = await buildMessageContext(insight, agentFirstName);
    const suggestedMessage = await generateSuggestedMessage(ctx);

    await db.aiInsight.update({
      where: { id },
      data: { suggestedMessage, manuallyEdited: false, generationAttempts: 0 },
    });

    const durationMs = Date.now() - start;
    console.log(JSON.stringify({ source: "regenerate", insightId: id, type: insight.type, durationMs, success: true }));

    return NextResponse.json({ suggestedMessage });
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error(JSON.stringify({ source: "regenerate", insightId: id, type: insight.type, durationMs, success: false, error: String(err) }));
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
