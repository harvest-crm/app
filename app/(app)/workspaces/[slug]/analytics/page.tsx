import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { AlertCircle, Activity, BarChart3 } from "lucide-react";
import { getWorkspaceAnalytics } from "@/app/actions/analytics";
import { RangeSelector } from "@/components/analytics/range-selector";
import { ActivityChart } from "@/components/analytics/activity-chart";
import type { AnalyticsData, FunnelRow, VelocityRow, StuckDeal } from "@/app/actions/analytics";

export const metadata: Metadata = { title: "Analytics" };

// ── Formatting helpers ────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtDays(d: number | null): string {
  if (d == null) return "—";
  if (d < 1)     return `${(d * 24).toFixed(0)} hr`;
  return `${d.toFixed(1)} day${d.toFixed(1) !== "1.0" ? "s" : ""}`;
}

function fmtPct(r: number | null): string {
  if (r == null) return "—";
  return `${Math.round(r * 100)}%`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Stage color: derive from position + terminal status
const STAGE_COLORS = ["#1F8A8A", "#2B9FA0", "#3DB5B5", "#94A3B8", "#7C8FA3"];
function stageColor(idx: number, isTerminal: boolean, terminalOutcome: string | null): string {
  if (isTerminal && terminalOutcome === "won")  return "#10B981";
  if (isTerminal && terminalOutcome === "lost") return "#EF4444";
  return STAGE_COLORS[idx % STAGE_COLORS.length];
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-xs font-semibold uppercase" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
      {children}
    </p>
  );
}

// ── KPI Cards ─────────────────────────────────────────────────────────────────

function KpiCards({ kpis, range }: { kpis: AnalyticsData["kpis"]; range: string }) {
  const rangeLabel = range === "all" ? "all time" : `last ${range} days`;

  const cards = [
    {
      label: "Open pipeline value",
      value: fmtCurrency(kpis.openPipelineValue),
      sub:   `${kpis.openPipelineValue === 0 ? "No" : ""} open deals`,
    },
    {
      label: `Deals won (${rangeLabel})`,
      value: String(kpis.dealsWon),
      sub:   null,
    },
    {
      label: `Win rate (${rangeLabel})`,
      value: fmtPct(kpis.winRate),
      sub:   kpis.winRate != null
        ? `${kpis.dealsWon} won, ${kpis.dealsLost} lost`
        : "No closed deals yet",
    },
    {
      label: "Avg deal cycle",
      value: fmtDays(kpis.avgDealCycleDays),
      sub:   "from create → close",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border bg-white p-5"
          style={{ borderColor: "#E8DFC8" }}
        >
          <p className="text-2xl font-semibold" style={{ color: "#0F2540" }}>
            {card.value}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
            {card.label}
          </p>
          {card.sub && (
            <p className="mt-0.5 text-xs" style={{ color: "#3D5775", opacity: 0.7 }}>
              {card.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Funnel ────────────────────────────────────────────────────────────────────

function FunnelSection({ funnel, hasActivityHistory }: { funnel: FunnelRow[]; hasActivityHistory: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8DFC8" }}>
      <SectionLabel>Funnel</SectionLabel>
      <p className="mb-5 text-sm" style={{ color: "#3D5775" }}>
        How deals move through your stages
      </p>

      {funnel.length === 0 ? (
        <p className="text-center text-sm italic" style={{ color: "#3D5775" }}>No stages configured.</p>
      ) : (
        <div className="space-y-3">
          {funnel.map((row, idx) => {
            const widthPct = row.maxCurrentCount > 0
              ? Math.max(4, Math.round((row.currentCount / row.maxCurrentCount) * 100))
              : 4;
            const color = stageColor(idx, row.isTerminal, row.terminalOutcome);

            return (
              <div key={row.stageId} className="flex items-center gap-3">
                {/* Stage name + dot */}
                <div className="flex w-36 shrink-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="truncate text-sm font-medium" style={{ color: "#0F2540" }}>
                    {row.stageName}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex-1 overflow-hidden rounded-full bg-[#E2F0EE]" style={{ height: 10 }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%`, background: color }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-semibold" style={{ color: "#0F2540" }}>
                    {row.currentCount}
                  </span>
                </div>

                {/* Right: conversion or terminal badge */}
                <div className="w-24 shrink-0 text-right">
                  {row.isTerminal ? (
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={
                        row.terminalOutcome === "won"
                          ? { background: "#D1FAE5", color: "#065F46" }
                          : { background: "#FEE2E2", color: "#991B1B" }
                      }
                    >
                      {row.terminalOutcome === "won" ? "Won" : "Lost"}
                    </span>
                  ) : hasActivityHistory && row.conversionRatePct != null ? (
                    <span className="text-xs" style={{ color: "#3D5775" }}>
                      {row.conversionRatePct}% → next
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasActivityHistory && funnel.length > 0 && (
        <p className="mt-4 text-xs italic" style={{ color: "#3D5775", opacity: 0.7 }}>
          Conversion rates will appear once deals start moving through stages.
        </p>
      )}
    </div>
  );
}

// ── Velocity table ────────────────────────────────────────────────────────────

function VelocityTable({ velocity }: { velocity: VelocityRow[] }) {
  return (
    <div className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8DFC8" }}>
      <SectionLabel>Velocity</SectionLabel>
      <p className="mb-5 text-sm" style={{ color: "#3D5775" }}>
        Average days deals spend in each stage before moving
      </p>

      {velocity.length === 0 ? (
        <p className="text-center text-sm italic" style={{ color: "#3D5775" }}>No stages configured.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: "#3D5775", letterSpacing: "0.04em" }}>Stage</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase" style={{ color: "#3D5775", letterSpacing: "0.04em" }}>Avg time</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase" style={{ color: "#3D5775", letterSpacing: "0.04em" }}>Currently here</th>
              </tr>
            </thead>
            <tbody>
              {velocity.map((row, idx) => (
                <tr
                  key={row.stageId}
                  style={{
                    borderTop: idx > 0 ? "1px solid #E8DFC8" : "none",
                  }}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: stageColor(idx, false, null) }}
                      />
                      <span style={{ color: "#0F2540" }}>{row.stageName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: row.avgDays != null ? "#0F2540" : "#3D5775" }}>
                    {fmtDays(row.avgDays)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="flex items-center justify-end gap-1.5">
                      <span style={{ color: "#0F2540" }}>{row.currentCount}</span>
                      {row.hasOverdueDeal && (
                        <span title="One or more deals exceed 1.5× the avg time">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Stuck deals ───────────────────────────────────────────────────────────────

function StuckDealsSection({
  stuckDeals, stuckDealsTotal, workspaceSlug,
}: { stuckDeals: StuckDeal[]; stuckDealsTotal: number; workspaceSlug: string }) {
  return (
    <div className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8DFC8" }}>
      <SectionLabel>Needs Attention</SectionLabel>
      <p className="mb-5 text-sm" style={{ color: "#3D5775" }}>
        Deals sitting longer than the stage average × 1.5 (or 14 days if no history)
      </p>

      {stuckDeals.length === 0 ? (
        <p className="py-6 text-center text-sm italic" style={{ color: "#3D5775" }}>
          All deals moving on pace. 🎯
        </p>
      ) : (
        <div className="space-y-2">
          {stuckDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-start justify-between gap-4 rounded-lg border px-4 py-3"
              style={{ borderColor: "#E8DFC8", borderLeft: "3px solid #EF4444" }}
            >
              <div className="min-w-0">
                <Link
                  href={`/workspaces/${workspaceSlug}/deals`}
                  className="text-sm font-medium hover:underline"
                  style={{ color: "#0F2540" }}
                >
                  {deal.title}
                </Link>
                <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>
                  {deal.daysInStage}d in {deal.stageName}
                  {deal.contactName && ` · ${deal.contactName}`}
                  {deal.lastActivityDate && ` · last touch ${fmtDate(deal.lastActivityDate)}`}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {deal.value != null && (
                  <p className="text-sm font-semibold" style={{ color: "#0F2540" }}>
                    {fmtCurrency(deal.value)}
                  </p>
                )}
              </div>
            </div>
          ))}
          {stuckDealsTotal > 10 && (
            <p className="mt-2 text-center text-xs" style={{ color: "#3D5775" }}>
              and {stuckDealsTotal - 10} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params:       Promise<{ slug: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { slug  } = await params;
  const { range } = await searchParams;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where:  { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const workspace = await db.workspace.findFirst({
    where:  { slug, organizationId: org.id },
    select: { id: true },
  });
  if (!workspace) notFound();

  const data = await getWorkspaceAnalytics(workspace.id, range ?? "90");

  return (
    <div className="p-8">
      {/* ── Header ── */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5" style={{ color: "#1F8A8A" }} />
            <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>
              Analytics
            </h1>
          </div>
          <p className="text-sm" style={{ color: "#3D5775" }}>
            Pipeline performance for {data.workspaceName}
          </p>
        </div>
        <RangeSelector current={data.range} />
      </div>

      <div className="space-y-6">
        {/* ── KPI cards ── */}
        <KpiCards kpis={data.kpis} range={data.range} />

        {/* ── Funnel ── */}
        <FunnelSection funnel={data.funnel} hasActivityHistory={data.hasActivityHistory} />

        {/* ── Velocity ── */}
        <VelocityTable velocity={data.velocity} />

        {/* ── Stuck deals ── */}
        <StuckDealsSection
          stuckDeals={data.stuckDeals}
          stuckDealsTotal={data.stuckDealsTotal}
          workspaceSlug={data.workspaceSlug}
        />

        {/* ── Activity volume ── */}
        <div className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8DFC8" }}>
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: "#1F8A8A" }} />
            <SectionLabel>Activity</SectionLabel>
          </div>
          <p className="mb-5 text-sm" style={{ color: "#3D5775" }}>
            Touchpoints per week in this period
          </p>
          <ActivityChart data={data.activityByWeek} />
        </div>
      </div>
    </div>
  );
}
