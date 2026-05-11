import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { InsightStatus } from "@/app/generated/prisma/client";
import { getAccessControl, ownerFilter } from "@/lib/access";

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("edit"), message: z.string().min(1, "Message can't be empty").max(2000) }),
  z.object({ action: z.literal("dismiss") }),
]);

export async function PATCH(
  req: Request,
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
    select: { id: true, status: true },
  });
  if (!insight) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const now = new Date();
  const { action } = parsed.data;

  const updated = await db.aiInsight.update({
    where: { id },
    data:
      action === "send"
        ? { actedAt: now, status: InsightStatus.SENT }
        : action === "edit"
        ? { suggestedMessage: parsed.data.message, manuallyEdited: true }
        : { dismissedAt: now, status: InsightStatus.SKIPPED },
  });

  return NextResponse.json({ insight: updated });
}
