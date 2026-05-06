import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const workspaces = await db.workspace.findMany({
    where: { organizationId: org.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const { workspace: workspaceSlug } = await searchParams;
  const defaultWorkspaceId = workspaceSlug
    ? workspaces.find((w) => w.slug === workspaceSlug)?.id
    : undefined;

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-[#0F2540]">New Contact</h1>
      <ContactForm workspaces={workspaces} defaultWorkspaceId={defaultWorkspaceId} />
    </div>
  );
}
