import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { TemplateListClient } from "@/components/task-templates/template-list-client";
import type { SerializedTemplate } from "@/app/actions/task-templates";

export const metadata: Metadata = { title: "Task Templates" };

export default async function TaskTemplatesPage() {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const rawTemplates = await db.taskTemplate.findMany({
    where: { organizationId: org.id },
    include: { tasks: { select: { id: true } } },
    orderBy: { sortOrder: "asc" },
  });

  const templates: SerializedTemplate[] = rawTemplates.map((t) => ({
    id: t.id, name: t.name, description: t.description,
    appliesTo: t.appliesTo, sortOrder: t.sortOrder,
    workspaceId: t.workspaceId, itemCount: t.tasks.length,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Task Templates</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          Create reusable task lists you can apply to any contact or deal with one click.
        </p>
      </div>

      <div className="max-w-3xl">
        <TemplateListClient initialTemplates={templates} />
      </div>
    </div>
  );
}
