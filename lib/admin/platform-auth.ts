// Server-only — never import from client components.
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export const isPlatformAdmin = cache(async (clerkUserId: string | null): Promise<boolean> => {
  if (!clerkUserId) return false;
  const row = await db.platformAdmin.findUnique({
    where: { clerkUserId },
    select: { isActive: true },
  });
  return row?.isActive === true;
});

export async function requirePlatformAdmin(): Promise<{ clerkUserId: string; email: string }> {
  const { userId } = await auth();
  if (!userId || !(await isPlatformAdmin(userId))) {
    // 404 — don't reveal /admin exists to non-admins
    const { notFound } = await import("next/navigation");
    notFound();
  }

  const row = await db.platformAdmin.findUnique({
    where: { clerkUserId: userId! },
    select: { email: true },
  });

  return { clerkUserId: userId!, email: row?.email ?? "" };
}

export async function logAdminAction(opts: {
  clerkUserId: string;
  email: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.adminAuditLog.create({
    data: {
      clerkUserId: opts.clerkUserId,
      email:       opts.email,
      action:      opts.action,
      targetType:  opts.targetType  ?? undefined,
      targetId:    opts.targetId    ?? undefined,
      metadata:    opts.metadata    ? (opts.metadata as object) : undefined,
    },
  });
}
