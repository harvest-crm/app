import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getOrganizationDetail } from "@/app/actions/admin-platform";
import { OrgDetailClient } from "@/components/admin/org-detail-client";

export const metadata: Metadata = { title: "Admin · Organization" };

export default async function AdminOrgDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { orgId } = await params;
  const { tab = "members" } = await searchParams;

  const data = await getOrganizationDetail(orgId);
  if (!data) notFound();

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <Link href="/admin/organizations"
        className="mb-5 flex items-center gap-1 text-sm hover:underline" style={{ color: "#3D5775" }}>
        <ChevronLeft className="h-4 w-4" />
        Organizations
      </Link>

      <OrgDetailClient data={data} initialTab={tab} />
    </div>
  );
}
