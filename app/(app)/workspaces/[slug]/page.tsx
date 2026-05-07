import type { Metadata } from "next";
export const metadata: Metadata = { title: "Workspace" };

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Kanban, CheckSquare, Settings2, Zap, BarChart3, Users,
} from "lucide-react";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { WebhookCard } from "@/components/webhook-card";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { slug } = await params;
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

  // Quick stats for subtitle
  const [dealCount, taskCount] = await Promise.all([
    db.deal.count({ where: { workspaceId: workspace.id } }),
    db.task.count({ where: { workspaceId: workspace.id, completedAt: null } }),
  ]);

  const hdrs  = await headers();
  const host  = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const appUrl = `${proto}://${host}`;

  const statParts = [
    `${workspace.stages.length} stage${workspace.stages.length !== 1 ? "s" : ""}`,
    `${dealCount} deal${dealCount !== 1 ? "s" : ""}`,
    `${taskCount} open task${taskCount !== 1 ? "s" : ""}`,
  ];

  const NAV = [
    { href: `/workspaces/${slug}/deals`,       icon: Kanban,     label: "Deals"         },
    { href: `/contacts?workspace=${slug}`,     icon: Users,      label: "Contacts"      },
    { href: `/workspaces/${slug}/tasks`,       icon: CheckSquare, label: "Tasks"        },
    { href: `/workspaces/${slug}/fields`,      icon: Settings2,  label: "Custom Fields" },
    { href: `/workspaces/${slug}/automations`, icon: Zap,        label: "Automations"   },
    { href: `/workspaces/${slug}/analytics`,   icon: BarChart3,  label: "Analytics"     },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-2 flex items-center gap-3">
        <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: workspace.color }} />
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>{workspace.name}</h1>
      </div>
      <p className="mb-6 text-sm" style={{ color: "#3D5775" }}>
        {statParts.join(" · ")}
      </p>

      {/* Nav pills */}
      <div className="mb-8 flex flex-wrap gap-2">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
            style={{ borderColor: "#E8DFC8", color: "#0F2540" }}
          >
            <Icon className="h-4 w-4 shrink-0" style={{ color: "#1F8A8A" }} />
            {label}
          </Link>
        ))}
      </div>

      {/* Stages */}
      {workspace.stages.length > 0 && (
        <div className="mb-8 rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
            Pipeline stages
          </p>
          <div className="flex flex-wrap gap-2">
            {workspace.stages.map((stage) => (
              <div key={stage.id} className="rounded-md border bg-[#F5EFE0] px-3 py-1.5 text-sm"
                style={{ borderColor: "#E8DFC8", color: "#0F2540" }}>
                {stage.name}
                {stage.isTerminal && (
                  <span className="ml-2 text-xs" style={{ color: "#3D5775" }}>({stage.terminalOutcome})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <WebhookCard
        workspaceId={workspace.id}
        initialToken={workspace.webhookToken}
        appUrl={appUrl}
      />
    </div>
  );
}
