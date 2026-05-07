import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { TemplateEditor } from "@/components/task-templates/template-editor";
import type { SerializedTemplateWithItems } from "@/app/actions/task-templates";

export const metadata: Metadata = { title: "Edit Template" };

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { id } = await params;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const raw = await db.taskTemplate.findFirst({
    where: { id, organizationId: org.id },
    include: { tasks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!raw) notFound();

  const template: SerializedTemplateWithItems = {
    id: raw.id, name: raw.name, description: raw.description,
    appliesTo: raw.appliesTo, sortOrder: raw.sortOrder,
    workspaceId: raw.workspaceId, itemCount: raw.tasks.length,
    items: raw.tasks.map((i) => ({
      id: i.id, templateId: i.templateId, title: i.title,
      description: i.description, taskType: i.taskType, priority: i.priority,
      dueOffsetDays: i.dueOffsetDays, reminderOffsetMinutes: i.reminderOffsetMinutes,
      sortOrder: i.sortOrder,
    })),
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>{template.name}</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          Edit template name, description, and tasks. All changes save automatically.
        </p>
      </div>

      <div className="max-w-3xl">
        <TemplateEditor template={template} />
      </div>
    </div>
  );
}
