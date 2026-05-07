import type { Metadata } from "next";
export const metadata: Metadata = { title: "Tags" };

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
      <h1 className="text-2xl font-semibold text-[#0F2540]">Tags</h1>
      <p className="mb-6 mt-1 text-sm text-[#3D5775]">Organize contacts with color-coded labels.</p>
      <TagList tags={tags} />
    </div>
  );
}
