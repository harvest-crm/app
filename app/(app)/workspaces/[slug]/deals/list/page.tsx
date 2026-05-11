import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Kanban, List } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { ViewPicker } from "@/components/saved-views/view-picker";
import { FilterBar } from "@/components/saved-views/filter-bar";
import { buildDealWhere } from "@/lib/saved-views/build-where";
import { decodeDealFilters } from "@/lib/saved-views/url-encoder";
import { listViews } from "@/app/actions/saved-views";
import { getAccessControl, ownerFilter } from "@/lib/access";

export const metadata: Metadata = { title: "Deals" };

function fmtValue(n: number | null): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

function daysInStage(movedAt: Date): number {
  return Math.floor((Date.now() - movedAt.getTime()) / 86_400_000);
}

export default async function DealsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { slug } = await params;
  const rawParams = await searchParams;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const workspace = await db.workspace.findFirst({
    where: { slug, organizationId: org.id },
    include: { stages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!workspace) notFound();

  const sp = new URLSearchParams(rawParams);
  const filters = decodeDealFilters(sp);
  const { visibleUserIds } = await getAccessControl(org.id);

  const [savedViews, deals] = await Promise.all([
    listViews("deal"),
    db.deal.findMany({
      where: { ...buildDealWhere(filters, org.id, workspace.id), ...ownerFilter(visibleUserIds) },
      include: {
        stage:   { select: { id: true, name: true, isTerminal: true, terminalOutcome: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);

  const stages = workspace.stages.map((s) => ({ id: s.id, name: s.name }));

  function stageStyle(stage: typeof deals[0]["stage"]) {
    if (stage.isTerminal && stage.terminalOutcome === "won")
      return { background: "#D1FAE5", color: "#065F46" };
    if (stage.isTerminal && stage.terminalOutcome === "lost")
      return { background: "#FEE2E2", color: "#991B1B" };
    return { background: "#E2F0EE", color: "#1F8A8A" };
  }

  return (
    <div className="p-8" style={{ background: "#F5EFE0", minHeight: "100vh" }}>
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1.5 text-sm" style={{ color: "#3D5775" }}>
        <Link href={`/workspaces/${slug}`} className="hover:underline" style={{ color: "#3D5775" }}>
          {workspace.name}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span style={{ color: "#0F2540" }} className="font-medium">Deals</span>
      </nav>

      {/* Header + view toggle */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Deals</h1>
        <div className="flex items-center gap-1 rounded-lg border bg-white p-1" style={{ borderColor: "#E8DFC8" }}>
          <Link
            href={`/workspaces/${slug}/deals`}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
            style={{ color: "#3D5775" }}
          >
            <Kanban className="h-3.5 w-3.5" />
            Kanban
          </Link>
          <span
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium"
            style={{ background: "#1F8A8A", color: "#fff" }}
          >
            <List className="h-3.5 w-3.5" />
            List
          </span>
        </div>
      </div>

      {/* View picker + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ViewPicker
          entityType="deal"
          initialViews={savedViews}
          currentFilters={filters}
          workspaces={[]}
          defaultLabel="All deals"
        />
        <div className="h-5 w-px" style={{ background: "#E8DFC8" }} />
        <FilterBar
          entityType="deal"
          stages={stages}
        />
      </div>

      <p className="mb-3 text-sm" style={{ color: "#3D5775" }}>
        {deals.length} deal{deals.length !== 1 ? "s" : ""}
      </p>

      {deals.length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-12 text-center" style={{ borderColor: "#E8DFC8" }}>
          <p className="text-sm font-medium" style={{ color: "#0F2540" }}>No deals found</p>
          <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>Adjust your filters or add deals from the kanban board.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Deal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Days in stage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Created</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {deals.map((deal) => {
                const days = daysInStage(deal.movedToStageAt);
                const createdStr = deal.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                const ss = stageStyle(deal.stage);

                return (
                  <tr key={deal.id} className="transition-colors hover:bg-[#F5EFE0]">
                    {/* Title */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/workspaces/${slug}/deals/${deal.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "#0F2540" }}
                      >
                        {deal.title}
                      </Link>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={ss}>
                        {deal.stage.name}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 text-xs">
                      {deal.contact ? (
                        <Link href={`/contacts/${deal.contact.id}`}
                          className="hover:underline" style={{ color: "#1F8A8A" }}>
                          {deal.contact.firstName} {deal.contact.lastName ?? ""}
                        </Link>
                      ) : <span style={{ color: "#3D5775" }}>—</span>}
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "#0F2540" }}>
                      {fmtValue(deal.value ? Number(deal.value) : null)}
                    </td>

                    {/* Days in stage */}
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        days >= 30 ? "bg-red-100 text-red-600" :
                        days >= 14 ? "bg-amber-100 text-amber-600" :
                                     "bg-[#E2F0EE] text-[#3D5775]",
                      )}>
                        {days}d
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                      {createdStr}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
