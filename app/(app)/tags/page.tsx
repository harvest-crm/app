import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { TagList } from "@/components/tag-list";

export default async function TagsPage() {
  const { orgId: clerkOrgId } = await auth();
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (!org) return null;

  const tags = await db.tag.findMany({
    where: { organizationId: org.id },
    include: {
      _count: { select: { contactTags: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-semibold text-stone-900">Tags</h1>
      <TagList tags={tags} />
    </div>
  );
}
