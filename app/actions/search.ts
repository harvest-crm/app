"use server";

import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SearchResultItem = {
  id: string;
  type: "contact" | "deal" | "task" | "activity";
  title: string;
  subtitle: string;
  href: string;
};

export type SearchResults = {
  contacts: SearchResultItem[];
  deals: SearchResultItem[];
  tasks: SearchResultItem[];
  activities: SearchResultItem[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDue(d: Date): string {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart   = new Date(d.getFullYear(),   d.getMonth(),   d.getDate());
  const diff = Math.round((dueStart.getTime() - todayStart.getTime()) / 86_400_000);
  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function globalSearch(query: string): Promise<SearchResults> {
  const empty: SearchResults = { contacts: [], deals: [], tasks: [], activities: [] };

  const q = query.trim();
  if (q.length < 2) return empty;

  const { organizationId } = await requireOrg();
  const mode = "insensitive" as const;

  // Strip non-digits for phone search (DB stores digits only)
  const phoneQ = q.replace(/\D/g, "");

  const [contacts, deals, tasks, activities] = await Promise.all([
    // ── Contacts ──────────────────────────────────────────────────────────
    db.contact.findMany({
      where: {
        organizationId,
        OR: [
          { firstName: { contains: q, mode } },
          { lastName:  { contains: q, mode } },
          { email:     { contains: q, mode } },
          { notes:     { contains: q, mode } },
          ...(phoneQ.length >= 2 ? [{ phone: { contains: phoneQ, mode } }] : []),
        ],
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true },
    }),

    // ── Deals ─────────────────────────────────────────────────────────────
    db.deal.findMany({
      where: {
        organizationId,
        OR: [
          { title: { contains: q, mode } },
          { notes: { contains: q, mode } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, value: true,
        workspace: { select: { slug: true, name: true } },
      },
    }),

    // ── Tasks (open only) ─────────────────────────────────────────────────
    db.task.findMany({
      where: {
        organizationId,
        completedAt: null,
        OR: [
          { title:       { contains: q, mode } },
          { description: { contains: q, mode } },
        ],
      },
      orderBy: { dueAt: "asc" },
      take: 5,
      select: {
        id: true, title: true, dueAt: true, contactId: true,
        workspace: { select: { slug: true } },
      },
    }),

    // ── Activities ────────────────────────────────────────────────────────
    db.activity.findMany({
      where: { organizationId, body: { contains: q, mode } },
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: {
        id: true, body: true, contactId: true,
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return {
    contacts: contacts.map((c) => ({
      id: c.id,
      type: "contact",
      title: [c.firstName, c.lastName].filter(Boolean).join(" "),
      subtitle: c.email ?? "",
      href: `/contacts/${c.id}`,
    })),

    deals: deals.map((d) => ({
      id: d.id,
      type: "deal",
      title: d.title,
      subtitle: d.workspace?.name ?? "",
      href: `/workspaces/${d.workspace?.slug}/deals`,
    })),

    tasks: tasks.map((t) => ({
      id: t.id,
      type: "task",
      title: t.title,
      subtitle: t.dueAt ? `Due ${fmtDue(t.dueAt)}` : "No due date",
      href: t.contactId
        ? `/contacts/${t.contactId}`
        : t.workspace?.slug
          ? `/workspaces/${t.workspace.slug}/tasks`
          : "/today",
    })),

    activities: activities.map((a) => ({
      id: a.id,
      type: "activity",
      title: a.body.length > 80 ? `${a.body.slice(0, 80)}…` : a.body,
      subtitle: a.contact
        ? [a.contact.firstName, a.contact.lastName].filter(Boolean).join(" ")
        : "",
      href: a.contactId ? `/contacts/${a.contactId}` : "/today",
    })),
  };
}
