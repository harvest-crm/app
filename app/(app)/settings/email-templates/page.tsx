import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { EmailTemplateListClient } from "@/components/email-templates/template-list-client";
import type { SerializedEmailTemplate } from "@/app/actions/email-templates";

export const metadata: Metadata = { title: "Email Templates" };

export default async function EmailTemplatesPage() {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const rawTemplates = await db.emailTemplate.findMany({
    where: { organizationId: org.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const templates: SerializedEmailTemplate[] = rawTemplates.map((t) => ({
    id: t.id, name: t.name, description: t.description, subject: t.subject, body: t.body,
    appliesTo: t.appliesTo, sortOrder: t.sortOrder, workspaceId: t.workspaceId,
    createdBy: t.createdBy, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Email Templates</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          Reusable emails with merge variables. Compose any contact or deal email in seconds.
        </p>
      </div>
      <div className="max-w-3xl">
        <EmailTemplateListClient initialTemplates={templates} />
      </div>
    </div>
  );
}
