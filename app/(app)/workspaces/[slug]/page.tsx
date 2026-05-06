import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
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

  // Derive public URL from request headers
  const hdrs    = await headers();
  const host    = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto   = hdrs.get("x-forwarded-proto") ?? "http";
  const appUrl  = `${proto}://${host}`;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workspace.color }} />
        <h1 className="text-2xl font-semibold text-slate-900">{workspace.name}</h1>
      </div>

      <div className="flex gap-3">
        <Link href={`/workspaces/${slug}/deals`}>
          <Button variant="outline">Deals</Button>
        </Link>
        <Link href={`/workspaces/${slug}/tasks`}>
          <Button variant="outline">Tasks</Button>
        </Link>
        <Link href={`/workspaces/${slug}/fields`}>
          <Button variant="outline">Custom Fields</Button>
        </Link>
      </div>

      {workspace.stages.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Stages</h2>
          <div className="flex flex-wrap gap-2">
            {workspace.stages.map((stage) => (
              <div key={stage.id} className="rounded-md border bg-white px-3 py-1.5 text-sm">
                {stage.name}
                {stage.isTerminal && (
                  <span className="ml-2 text-xs text-slate-400">({stage.terminalOutcome})</span>
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
