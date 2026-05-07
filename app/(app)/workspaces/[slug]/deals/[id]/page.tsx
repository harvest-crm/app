import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { DealHeader } from "@/components/deals/deal-detail/deal-header";
import { DealContactCard } from "@/components/deals/deal-detail/deal-contact-card";
import { DealTabs } from "@/components/deals/deal-detail/deal-tabs";
import type { SerializedDeal, SerializedStage, ContactOption } from "@/components/deals/types";
import type { SerializedTask } from "@/app/actions/tasks";
import type { SerializedActivity } from "@/app/actions/activities";
import type { SerializedDocument } from "@/app/actions/documents";
import type { SerializedFieldDef } from "@/app/actions/custom-fields";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}): Promise<Metadata> {
  const { orgId: clerkOrgId } = await auth();
  const { id } = await params;
  if (!clerkOrgId) return { title: "Deal" };

  const org = await db.organization.findUnique({ where: { clerkOrgId }, select: { id: true } });
  if (!org) return { title: "Deal" };

  const deal = await db.deal.findFirst({
    where: { id, organizationId: org.id },
    select: { title: true },
  });

  return { title: deal?.title ?? "Deal" };
}

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { slug, id } = await params;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const workspace = await db.workspace.findFirst({
    where: { slug, organizationId: org.id },
    select: { id: true, name: true, slug: true, color: true },
  });
  if (!workspace) notFound();

  const rawDeal = await db.deal.findFirst({
    where: { id, workspaceId: workspace.id, organizationId: org.id },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!rawDeal) notFound();

  const [
    rawStages,
    rawTasks,
    rawActivities,
    rawDocs,
    rawFieldDefs,
    rawFieldValues,
    rawContacts,
  ] = await Promise.all([
    db.stage.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { sortOrder: "asc" },
    }),
    db.task.findMany({
      where: { dealId: id, organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.activity.findMany({
      where: { dealId: id, organizationId: org.id },
      orderBy: { occurredAt: "desc" },
      take: 200,
    }),
    db.document.findMany({
      where: { dealId: id, organizationId: org.id },
      orderBy: { uploadedAt: "desc" },
    }),
    db.customFieldDefinition.findMany({
      where: { workspaceId: workspace.id, entityType: "deal", organizationId: org.id },
      orderBy: { sortOrder: "asc" },
    }),
    db.customFieldValue.findMany({
      where: { entityType: "deal", entityId: id },
    }),
    db.contact.findMany({
      where: { organizationId: org.id },
      select: {
        id: true, firstName: true, lastName: true,
        contactWorkspaces: { where: { workspaceId: workspace.id }, select: { id: true } },
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      take: 500,
    }),
  ]);

  // ── Serialize ──────────────────────────────────────────────────────────────

  const deal: SerializedDeal = {
    id: rawDeal.id,
    title: rawDeal.title,
    stageId: rawDeal.stageId,
    workspaceId: rawDeal.workspaceId,
    organizationId: rawDeal.organizationId,
    contactId: rawDeal.contactId,
    contact: rawDeal.contact
      ? { id: rawDeal.contact.id, firstName: rawDeal.contact.firstName, lastName: rawDeal.contact.lastName }
      : null,
    value: rawDeal.value ? Number(rawDeal.value) : null,
    status: rawDeal.status,
    notes: rawDeal.notes,
    movedToStageAt: rawDeal.movedToStageAt.toISOString(),
    createdAt: rawDeal.createdAt.toISOString(),
    updatedAt: rawDeal.updatedAt.toISOString(),
  };

  const stages: SerializedStage[] = rawStages.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
    isTerminal: s.isTerminal,
    terminalOutcome: s.terminalOutcome,
  }));

  const tasks: SerializedTask[] = rawTasks.map((t) => ({
    id: t.id, title: t.title, description: t.description,
    priority: t.priority, taskType: t.taskType,
    dueAt: t.dueAt?.toISOString() ?? null,
    reminderAt: t.reminderAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    contactId: t.contactId, dealId: t.dealId, workspaceId: t.workspaceId,
    createdAt: t.createdAt.toISOString(),
  }));

  const activities: SerializedActivity[] = rawActivities.map((a) => ({
    id: a.id, type: a.type, body: a.body,
    occurredAt: a.occurredAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    contactId: a.contactId, dealId: a.dealId, workspaceId: a.workspaceId,
  }));

  const stageChangeActivities = activities.filter((a) => a.type === "stage_change");

  const documents: SerializedDocument[] = rawDocs.map((d) => ({
    id: d.id, r2Key: d.r2Key, fileName: d.fileName,
    mimeType: d.mimeType, fileSize: d.fileSize,
    uploadedAt: d.uploadedAt.toISOString(),
    contactId: d.contactId, dealId: d.dealId,
  }));

  const fieldDefs: SerializedFieldDef[] = rawFieldDefs.map((d) => {
    const opts = d.options as { choices?: string[] } | null;
    return {
      id: d.id, workspaceId: d.workspaceId, entityType: d.entityType,
      fieldKey: d.fieldKey, fieldLabel: d.fieldLabel, fieldType: d.fieldType,
      options: opts?.choices ?? [], isRequired: d.isRequired, sortOrder: d.sortOrder,
    };
  });

  const fieldValues: Record<string, unknown> = {};
  for (const v of rawFieldValues) fieldValues[v.definitionId] = v.value;

  const contacts: ContactOption[] = rawContacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    isInWorkspace: c.contactWorkspaces.length > 0,
  }));

  const completedTasks = tasks.filter((t) => !!t.completedAt).length;
  const stats = {
    totalTasks: tasks.length,
    completedTasks,
    totalActivities: activities.filter((a) => a.type !== "stage_change" && a.type !== "template_applied").length,
    totalDocuments: documents.length,
  };

  return (
    <div className="min-h-full p-8" style={{ background: "#F5EFE0" }}>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm" style={{ color: "#3D5775" }}>
        <Link href={`/workspaces/${slug}`} className="hover:underline" style={{ color: "#3D5775" }}>
          {workspace.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link href={`/workspaces/${slug}/deals`} className="hover:underline" style={{ color: "#3D5775" }}>
          Deals
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span style={{ color: "#0F2540" }} className="font-medium truncate max-w-xs">
          {deal.title}
        </span>
      </nav>

      {/* Header card */}
      <div className="mb-5">
        <DealHeader deal={deal} stages={stages} workspaceSlug={slug} />
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5">
        {/* Left sidebar */}
        <div className="w-64 shrink-0">
          <DealContactCard dealId={deal.id} contact={deal.contact} contacts={contacts} />
        </div>

        {/* Right: tabs */}
        <DealTabs
          dealId={deal.id}
          workspaceId={workspace.id}
          notes={deal.notes}
          tasks={tasks}
          activities={activities}
          stageChangeActivities={stageChangeActivities}
          documents={documents}
          fieldDefs={fieldDefs}
          fieldValues={fieldValues}
          stats={stats}
        />
      </div>
    </div>
  );
}
