import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { CheckSquare2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ViewPicker } from "@/components/saved-views/view-picker";
import { FilterBar } from "@/components/saved-views/filter-bar";
import { buildTaskWhere } from "@/lib/saved-views/build-where";
import { decodeTaskFilters } from "@/lib/saved-views/url-encoder";
import { listViews } from "@/app/actions/saved-views";

export const metadata: Metadata = { title: "Tasks" };

const PRIORITY_CONFIG = {
  high:   { label: "High",   color: "#EF4444" },
  medium: { label: "Medium", color: "#F59E0B" },
  low:    { label: "Low",    color: "#10B981" },
} as const;

const TYPE_LABELS: Record<string, string> = {
  call:            "Call",
  email:           "Email",
  meeting_prep:    "Meeting prep",
  follow_up:       "Follow up",
  document_review: "Document review",
  other:           "Other",
};

function fmtDue(iso: string | null): { label: string; overdue: boolean } | null {
  if (!iso) return null;
  const date = new Date(iso);
  const now  = new Date();
  const overdue = date < now;
  const diff = Math.ceil((date.getTime() - now.getTime()) / 86_400_000);

  if (diff === 0)  return { label: "Today",     overdue: false };
  if (diff === 1)  return { label: "Tomorrow",  overdue: false };
  if (diff === -1) return { label: "Yesterday", overdue: true  };
  if (overdue)     return { label: `${Math.abs(diff)}d ago`, overdue: true };
  if (diff <= 7)   return { label: `In ${diff}d`,  overdue: false };

  return {
    label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const params = await searchParams;

  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });
  if (!org) return null;

  const sp = new URLSearchParams(params);
  const filters = decodeTaskFilters(sp);
  // Default to open tasks only
  if (!filters.status) filters.status = "open";

  const [workspaces, savedViews, tasks] = await Promise.all([
    db.workspace.findMany({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, slug: true, color: true },
    }),
    listViews("task"),
    db.task.findMany({
      where: buildTaskWhere(filters, org.id),
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        deal:    { select: { id: true, title: true, workspace: { select: { slug: true } } } },
        workspace: { select: { id: true, name: true, slug: true } },
      },
      orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 500,
    }),
  ]);

  const open      = tasks.filter((t) => !t.completedAt);
  const completed = tasks.filter((t) =>  t.completedAt);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Tasks</h1>
        <p className="mt-0.5 text-sm" style={{ color: "#3D5775" }}>
          Manage your work across all contacts and deals
        </p>
      </div>

      {/* View picker + filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <ViewPicker
          entityType="task"
          initialViews={savedViews}
          currentFilters={filters}
          workspaces={workspaces}
          defaultLabel="All tasks"
        />
        <div className="h-5 w-px" style={{ background: "#E8DFC8" }} />
        <FilterBar
          entityType="task"
          workspaces={workspaces}
        />
      </div>

      <p className="mb-4 text-sm" style={{ color: "#3D5775" }}>
        {open.length} open{completed.length > 0 ? `, ${completed.length} completed` : ""}
      </p>

      {tasks.length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-12 text-center" style={{ borderColor: "#E8DFC8" }}>
          <CheckSquare2 className="mx-auto mb-3 h-8 w-8" style={{ color: "#3D5775" }} />
          <p className="text-sm font-medium" style={{ color: "#0F2540" }}>No tasks found</p>
          <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>Adjust your filters or create tasks from a contact or deal.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Task</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Deal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {tasks.map((task) => {
                const due = fmtDue(task.dueAt?.toISOString() ?? null);
                const pri = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG];
                const isCompleted = !!task.completedAt;

                return (
                  <tr key={task.id} className="transition-colors hover:bg-[#F5EFE0]">
                    {/* Title */}
                    <td className="px-4 py-3">
                      <span
                        className={cn("text-sm font-medium", isCompleted && "line-through opacity-50")}
                        style={{ color: "#0F2540" }}
                      >
                        {task.title}
                      </span>
                      {task.workspace && (
                        <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>{task.workspace.name}</p>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                      {task.taskType ? (TYPE_LABELS[task.taskType] ?? task.taskType) : "—"}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      {pri ? (
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ background: `${pri.color}20`, color: pri.color }}>
                          {pri.label}
                        </span>
                      ) : "—"}
                    </td>

                    {/* Due */}
                    <td className="px-4 py-3 text-xs">
                      {due ? (
                        <span style={{ color: due.overdue ? "#EF4444" : "#3D5775" }}>
                          {due.label}
                        </span>
                      ) : <span style={{ color: "#3D5775" }}>—</span>}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 text-xs">
                      {task.contact ? (
                        <Link href={`/contacts/${task.contact.id}`}
                          className="hover:underline" style={{ color: "#1F8A8A" }}>
                          {task.contact.firstName} {task.contact.lastName ?? ""}
                        </Link>
                      ) : <span style={{ color: "#3D5775" }}>—</span>}
                    </td>

                    {/* Deal */}
                    <td className="px-4 py-3 text-xs">
                      {task.deal ? (
                        <Link
                          href={`/workspaces/${task.deal.workspace.slug}/deals/${task.deal.id}`}
                          className="hover:underline" style={{ color: "#1F8A8A" }}>
                          {task.deal.title}
                        </Link>
                      ) : <span style={{ color: "#3D5775" }}>—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#10B981" }}>
                          <CheckSquare2 className="h-3.5 w-3.5" />
                          Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#3D5775" }}>
                          <Circle className="h-3.5 w-3.5" />
                          Open
                        </span>
                      )}
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
