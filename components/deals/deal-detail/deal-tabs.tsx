"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowRightCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateDealInline } from "@/app/actions/deals";
import { TasksFeed } from "@/components/tasks-feed";
import { ActivityFeed } from "@/components/activity-feed";
import { DocumentsFeed } from "@/components/documents-feed";
import { FieldValuesEditor } from "@/components/custom-fields/field-values-editor";
import type { SerializedTask } from "@/app/actions/tasks";
import type { SerializedActivity } from "@/app/actions/activities";
import type { SerializedDocument } from "@/app/actions/documents";
import type { SerializedFieldDef } from "@/app/actions/custom-fields";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "tasks" | "activity" | "documents" | "history";

type Props = {
  dealId: string;
  workspaceId: string;
  notes: string | null;
  tasks: SerializedTask[];
  activities: SerializedActivity[];
  stageChangeActivities: SerializedActivity[];
  documents: SerializedDocument[];
  fieldDefs: SerializedFieldDef[];
  fieldValues: Record<string, unknown>;
  stats: { totalTasks: number; completedTasks: number; totalActivities: number; totalDocuments: number };
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",   label: "Overview"   },
  { id: "tasks",      label: "Tasks"      },
  { id: "activity",   label: "Activity"   },
  { id: "documents",  label: "Documents"  },
  { id: "history",    label: "History"    },
];

// ── Notes inline editor ───────────────────────────────────────────────────────

function NotesEditor({ dealId, initialNotes }: { dealId: string; initialNotes: string | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleBlur(e: React.FocusEvent<HTMLTextAreaElement>) {
    const notes = e.target.value || null;
    if (notes === initialNotes) return;
    startTransition(async () => {
      const r = await updateDealInline(dealId, { notes });
      if ("error" in r) toast.error(r.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Notes</p>
      <textarea
        defaultValue={initialNotes ?? ""}
        onBlur={handleBlur}
        rows={5}
        placeholder="Add notes about this deal…"
        className="w-full rounded-md border border-[#E8DFC8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A] resize-y"
        style={{ color: "#0F2540" }}
      />
      <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>Auto-saves on blur</p>
    </div>
  );
}

// ── Stats panel ───────────────────────────────────────────────────────────────

function StatsPanel({ stats }: { stats: Props["stats"] }) {
  const pct = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : null;

  const items = [
    { label: "Tasks",       value: `${stats.completedTasks}/${stats.totalTasks}` },
    { label: "Activities",  value: String(stats.totalActivities) },
    { label: "Documents",   value: String(stats.totalDocuments) },
    ...(pct !== null ? [{ label: "Task completion", value: `${pct}%` }] : []),
  ];

  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
        Stats
      </p>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value }) => (
          <div key={label} className="rounded-lg p-3" style={{ background: "#F5EFE0" }}>
            <p className="text-lg font-bold" style={{ color: "#0F2540" }}>{value}</p>
            <p className="text-xs" style={{ color: "#3D5775" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── History timeline (stage_change only) ─────────────────────────────────────

function HistoryTimeline({ activities }: { activities: SerializedActivity[] }) {
  if (activities.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "#3D5775" }}>
        No stage changes yet. Move this deal to a different stage to start tracking history.
      </p>
    );
  }

  return (
    <div className="relative pl-5">
      {/* vertical line */}
      <div className="absolute left-2 top-2 bottom-2 w-0.5" style={{ background: "#E8DFC8" }} />

      <div className="space-y-4">
        {activities.map((a, i) => {
          const date = new Date(a.occurredAt);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

          return (
            <div key={a.id} className="relative flex gap-3">
              {/* dot */}
              <div className="absolute -left-5 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: i === 0 ? "#1F8A8A" : "#E2F0EE" }}>
                <ArrowRightCircle className="h-2.5 w-2.5" style={{ color: i === 0 ? "#fff" : "#1F8A8A" }} />
              </div>

              <div className="min-w-0 flex-1 rounded-lg border p-3" style={{ borderColor: "#E8DFC8", background: "#fff" }}>
                <p className="text-sm font-medium" style={{ color: "#0F2540" }}>{a.body}</p>
                <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>
                  {dateStr} at {timeStr}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DealTabs ──────────────────────────────────────────────────────────────────

export function DealTabs({
  dealId,
  workspaceId,
  notes,
  tasks,
  activities,
  stageChangeActivities,
  documents,
  fieldDefs,
  fieldValues,
  stats,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") ?? "overview") as Tab;

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Tab nav */}
      <div className="mb-4 flex gap-1 rounded-lg border p-1" style={{ borderColor: "#E8DFC8", background: "#fff" }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={cn(
              "flex-1 rounded-md py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "text-white shadow-sm"
                : "hover:bg-[#E2F0EE]",
            )}
            style={activeTab === tab.id
              ? { background: "#1F8A8A", color: "#fff" }
              : { color: "#3D5775" }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
            <NotesEditor dealId={dealId} initialNotes={notes} />
          </div>

          {fieldDefs.length > 0 && (
            <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
                Custom Fields
              </p>
              <FieldValuesEditor
                defs={fieldDefs}
                initialValues={fieldValues}
                entityType="deal"
                entityId={dealId}
              />
            </div>
          )}

          <StatsPanel stats={stats} />
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <TasksFeed initialTasks={tasks} dealId={dealId} workspaceId={workspaceId} />
        </div>
      )}

      {activeTab === "activity" && (
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <ActivityFeed initialActivities={activities} dealId={dealId} workspaceId={workspaceId} />
        </div>
      )}

      {activeTab === "documents" && (
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <DocumentsFeed initialDocuments={documents} dealId={dealId} />
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
            Stage History
          </p>
          <HistoryTimeline activities={stageChangeActivities} />
        </div>
      )}
    </div>
  );
}
