import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { FieldDefinitionManager } from "@/components/custom-fields/field-definition-manager";
import type { SerializedFieldDef } from "@/app/actions/custom-fields";

function serDef(d: {
  id: string;
  workspaceId: string | null;
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  options: unknown;
  isRequired: boolean;
  sortOrder: number;
}): SerializedFieldDef {
  const opts = d.options as { choices?: string[] } | null;
  return {
    id: d.id,
    workspaceId: d.workspaceId,
    entityType: d.entityType,
    fieldKey: d.fieldKey,
    fieldLabel: d.fieldLabel,
    fieldType: d.fieldType,
    options: opts?.choices ?? [],
    isRequired: d.isRequired,
    sortOrder: d.sortOrder,
  };
}

export default async function WorkspaceFieldsPage({
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
    select: { id: true, name: true, color: true },
  });
  if (!workspace) notFound();

  const [rawContactDefs, rawDealDefs] = await Promise.all([
    db.customFieldDefinition.findMany({
      where: { workspaceId: workspace.id, entityType: "contact", organizationId: org.id },
      orderBy: { sortOrder: "asc" },
    }),
    db.customFieldDefinition.findMany({
      where: { workspaceId: workspace.id, entityType: "deal", organizationId: org.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center gap-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workspace.color }} />
        <div>
          <h1 className="text-2xl font-semibold text-[#0F2540]">{workspace.name}</h1>
          <p className="text-sm text-[#3D5775]">Custom Fields</p>
        </div>
      </div>

      <FieldDefinitionManager
        workspaceId={workspace.id}
        initialContactDefs={rawContactDefs.map(serDef)}
        initialDealDefs={rawDealDefs.map(serDef)}
      />
    </div>
  );
}
