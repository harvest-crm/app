import type { Metadata } from "next";
export const metadata: Metadata = { title: "Deals" };

import { notFound } from "next/navigation";
import Link from "next/link";
import { Kanban, List } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getAccessControl, ownerFilter } from "@/lib/access";
import { KanbanBoard } from "@/components/deals/kanban-board";
import type { SerializedDeal, SerializedStage, ContactOption } from "@/components/deals/types";

export default async function DealsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { slug } = await params;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const workspace = await db.workspace.findFirst({
    where: { slug, organizationId: org.id },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!workspace) notFound();

  const { visibleUserIds } = await getAccessControl(org.id);

  const [deals, workspaceContactIds, allContacts] = await Promise.all([
    db.deal.findMany({
      where: { workspaceId: workspace.id, organizationId: org.id, ...ownerFilter(visibleUserIds) },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { movedToStageAt: "desc" },
    }),
    db.contactWorkspace
      .findMany({ where: { workspaceId: workspace.id }, select: { contactId: true } })
      .then((rows) => new Set(rows.map((r) => r.contactId))),
    db.contact.findMany({
      where: { organizationId: org.id },
      select: { id: true, firstName: true, lastName: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const serializedDeals: SerializedDeal[] = deals.map((d) => ({
    id: d.id,
    title: d.title,
    stageId: d.stageId,
    workspaceId: d.workspaceId,
    organizationId: d.organizationId,
    contactId: d.contactId,
    contact: d.contact,
    value: d.value ? Number(d.value) : null,
    status: d.status,
    notes: d.notes ?? null,
    movedToStageAt: d.movedToStageAt.toISOString(),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  const serializedStages: SerializedStage[] = workspace.stages.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
    isTerminal: s.isTerminal,
    terminalOutcome: s.terminalOutcome,
  }));

  const contacts: ContactOption[] = allContacts
    .map((c) => ({ ...c, isInWorkspace: workspaceContactIds.has(c.id) }))
    .sort((a, b) => Number(b.isInWorkspace) - Number(a.isInWorkspace));

  const pipelineValue = deals
    .filter((d) => d.status === "open" && d.value != null)
    .reduce((s, d) => s + Number(d.value), 0);

  return (
    <div className="flex h-full flex-col">
      {/* View toggle — sits above the board */}
      <div className="flex shrink-0 justify-end gap-1 border-b px-4 py-2" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
        <span className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
          style={{ background: "#1F8A8A", color: "#fff" }}>
          <Kanban className="h-3.5 w-3.5" />
          Kanban
        </span>
        <Link href={`/workspaces/${slug}/deals/list`}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
          style={{ color: "#3D5775" }}>
          <List className="h-3.5 w-3.5" />
          List
        </Link>
      </div>

      <KanbanBoard
        workspace={{ id: workspace.id, name: workspace.name, slug: workspace.slug, color: workspace.color }}
        stages={serializedStages}
        initialDeals={serializedDeals}
        contacts={contacts}
        initialPipelineValue={pipelineValue}
      />
    </div>
  );
}
