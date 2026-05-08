import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { EmailTemplateEditor } from "@/components/email-templates/template-editor";

export const metadata: Metadata = { title: "Edit Email Template" };

export default async function EmailTemplateEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { orgId: clerkOrgId, userId } = await auth();
  const { id } = await params;
  if (!clerkOrgId || !userId) return null;

  const org = await db.organization.findUnique({ where: { clerkOrgId }, select: { id: true } });
  if (!org) return null;

  const template = await db.emailTemplate.findFirst({ where: { id, organizationId: org.id } });
  if (!template) notFound();

  // Get user info for preview context
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId).catch(() => null);
  const userFirstName = clerkUser?.firstName ?? "";
  const userLastName  = clerkUser?.lastName  ?? "";
  const userEmail     = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/settings/email-templates"
          className="flex items-center gap-1 text-sm hover:underline" style={{ color: "#3D5775" }}>
          <ChevronLeft className="h-4 w-4" />
          Email Templates
        </Link>
      </div>

      <EmailTemplateEditor
        template={{
          id: template.id,
          name: template.name,
          description: template.description,
          subject: template.subject,
          body: template.body,
          appliesTo: template.appliesTo as "contact" | "deal" | "both",
          workspaceId: template.workspaceId,
          createdBy: template.createdBy,
          sortOrder: template.sortOrder,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        }}
        userFirstName={userFirstName}
        userLastName={userLastName}
        userEmail={userEmail}
      />
    </div>
  );
}
