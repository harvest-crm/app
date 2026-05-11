import { auth } from "@clerk/nextjs/server";
import { db } from "./db";

// ── Role normalization ────────────────────────────────────────────────────────
// Clerk stores roles as "org:admin", "org:member", "basic_member", etc.
// Normalize to "admin", "owner", or "member".

function normalizeRole(raw: string): "admin" | "owner" | "member" {
  const s = raw.toLowerCase().replace(/^org:/, "");
  if (s === "owner") return "owner";
  if (s === "admin") return "admin";
  return "member";
}

function isPrivileged(role: string): boolean {
  const r = normalizeRole(role);
  return r === "admin" || r === "owner";
}

// ── Core visibility logic ─────────────────────────────────────────────────────
// Returns the array of clerkUserIds the caller may see, or null (no filter).
// null is only reachable for privileged users in Phase B (viewAsParam = "all").

export function getVisibleUserIds(
  role: string,
  currentUserId: string,
  viewAsParam?: string,
): string[] | null {
  if (!isPrivileged(role)) {
    // Members always see only their own records.
    return [currentUserId];
  }
  // Admin / Owner
  if (viewAsParam === undefined) return [currentUserId]; // Phase A default
  if (viewAsParam === "all") return null;               // Phase B: see everything
  return [viewAsParam];                                 // Phase B: view as specific user
}

// ── Convenience: resolves auth + org + member in one call ─────────────────────
// Use this in server-rendered pages that need a list-level user filter.

export type AccessControl = {
  currentUserId: string;
  visibleUserIds: string[] | null;
};

export async function getAccessControl(
  organizationId: string,
  viewAsParam?: string,
): Promise<AccessControl> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const member = await db.organizationMember.findUnique({
    where: { organizationId_clerkUserId: { organizationId, clerkUserId: userId } },
    select: { role: true },
  });

  // Graceful fallback if member record is missing (org not yet synced).
  const role = member?.role ?? "member";

  return {
    currentUserId: userId,
    visibleUserIds: getVisibleUserIds(role, userId, viewAsParam),
  };
}

// ── Where-clause helpers ──────────────────────────────────────────────────────
// Spread these directly into Prisma where objects.

export function ownerFilter(visibleUserIds: string[] | null) {
  return visibleUserIds ? { ownerClerkUserId: { in: visibleUserIds } } : {};
}

export function assigneeFilter(visibleUserIds: string[] | null) {
  return visibleUserIds ? { assignedToClerkUserId: { in: visibleUserIds } } : {};
}
