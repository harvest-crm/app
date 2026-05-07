"use client";

import { useMemo, useState } from "react";
import { Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TodayGreeting } from "@/components/today-greeting";
import { TaskList } from "@/components/task-list";
import { TaskDialog } from "@/components/task-dialog";
import { ActivityTimeline } from "@/components/activity-timeline";
import { completeTask } from "@/app/actions/tasks";
import { snoozeReminder } from "@/app/actions/today";
import type { SerializedTask } from "@/app/actions/tasks";
import type { SerializedActivity } from "@/app/actions/activities";

// ── Priority sort weight ──────────────────────────────────────────────────────
const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortByPriorityThenDue(tasks: SerializedTask[]) {
  return [...tasks].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n === 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatReminderTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return "Due now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `in ${mins} minute${mins !== 1 ? "s" : ""}`;
  const hrs = Math.floor(diffMs / 3_600_000);
  return `in ${hrs} hour${hrs !== 1 ? "s" : ""}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  label,
  count,
  countVariant = "default",
}: {
  label: string;
  count?: number;
  countVariant?: "default" | "red";
}) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-medium uppercase text-[#1F8A8A]">
        {label}
      </h2>
      {count != null && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            countVariant === "red"
              ? "bg-red-100 text-red-600"
              : "bg-[#E2F0EE] text-[#3D5775]",
          )}
        >
          {count}
        </span>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  href,
}: {
  value: number;
  label: string;
  href?: string;
}) {
  const inner = (
    <div className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm">
      <p className="text-2xl font-semibold" style={{ color: value > 0 ? "#0F2540" : "#3D5775" }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>{label}</p>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

function ReminderRow({
  task,
  onSnooze,
}: {
  task: SerializedTask;
  onSnooze: (id: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);

  async function handleSnooze() {
    setPending(true);
    await onSnooze(task.id);
    // component may unmount on success — React 18 handles safely
    setPending(false);
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-2.5 hover:bg-[#E2F0EE]">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#0F2540]">{task.title}</p>
        <p className="text-xs text-[#1F8A8A]">
          {task.reminderAt ? formatReminderTime(task.reminderAt) : ""}
        </p>
      </div>
      <button
        onClick={handleSnooze}
        disabled={pending}
        className="shrink-0 rounded-md border border-[#E8DFC8] px-2.5 py-1 text-xs font-medium text-[#3D5775] transition-colors hover:bg-[#E2F0EE] disabled:opacity-40"
      >
        {pending ? "…" : "Snooze"}
      </button>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  firstName: string;
  initialOverdue: SerializedTask[];
  initialToday: SerializedTask[];
  initialReminders: SerializedTask[];
  activities: SerializedActivity[];
  activityContacts: Record<string, { name: string; id: string }>;
  pipeline: { totalValue: number; openDealsCount: number };
  stats: {
    newContacts: number;
    dealsMovedThisWeek: number;
    tasksCompletedThisWeek: number;
  };
  firstWorkspaceSlug?: string;
  hasContacts: boolean;
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function TodayDashboard({
  firstName,
  initialOverdue,
  initialToday,
  initialReminders,
  activities,
  activityContacts,
  pipeline,
  stats,
  hasContacts,
  firstWorkspaceSlug,
}: Props) {
  const [overdue,   setOverdue]   = useState<SerializedTask[]>(initialOverdue);
  const [today,     setToday]     = useState<SerializedTask[]>(() => sortByPriorityThenDue(initialToday));
  const [reminders, setReminders] = useState<SerializedTask[]>(initialReminders);
  const [editingTask, setEditingTask] = useState<SerializedTask | null>(null);

  // UTC start-of-today (computed once on mount — same as server value)
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }, []);

  function removeFromAll(id: string) {
    const remove = (prev: SerializedTask[]) => prev.filter((t) => t.id !== id);
    setOverdue(remove);
    setToday(remove);
    setReminders(remove);
  }

  function updateInAll(task: SerializedTask) {
    const replace = (prev: SerializedTask[]) =>
      prev.map((t) => (t.id === task.id ? task : t));
    setOverdue(replace);
    setToday(replace);
    setReminders(replace);
  }

  function handleToggle(task: SerializedTask) {
    const wasCompleted = !!task.completedAt;
    if (wasCompleted) return; // re-opening from Today not supported

    // Optimistic remove from visible lists
    removeFromAll(task.id);

    completeTask(task.id).then((result) => {
      if ("error" in result) {
        // Revert: put back in correct list
        if (task.dueAt && new Date(task.dueAt) < startOfToday) {
          setOverdue((prev) => [task, ...prev].sort((a, b) =>
            new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime(),
          ));
        } else {
          setToday((prev) => sortByPriorityThenDue([task, ...prev]));
        }
        toast.error("Failed to complete task");
      }
    });
  }

  async function handleSnooze(taskId: string) {
    const task = reminders.find((t) => t.id === taskId);
    setReminders((prev) => prev.filter((t) => t.id !== taskId));
    const result = await snoozeReminder(taskId);
    if ("error" in result) {
      if (task) setReminders((prev) => [...prev, task]);
      toast.error("Failed to snooze");
    }
  }

  const pipelineValueText =
    pipeline.openDealsCount > 0
      ? `${fmtCurrency(pipeline.totalValue)} across ${pipeline.openDealsCount} open deal${pipeline.openDealsCount !== 1 ? "s" : ""}`
      : "";

  const isAllClear =
    hasContacts &&
    overdue.length === 0 &&
    today.length === 0 &&
    reminders.length === 0 &&
    activities.length === 0;

  const taskListProps = {
    onToggle: handleToggle,
    onOpenEdit: (t: SerializedTask) => setEditingTask(t),
    onDeleted: (id: string) => removeFromAll(id),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-8">
      {/* ── Greeting ── */}
      <div className="rounded-xl border bg-white px-6 py-5" style={{ borderColor: "#E8DFC8" }}>
        <TodayGreeting
          name={firstName}
          openDealsCount={pipeline.openDealsCount}
          pipelineValueText={pipelineValueText}
          firstWorkspaceSlug={firstWorkspaceSlug}
        />
      </div>

      {/* ── No contacts empty state ── */}
      {!hasContacts && (
        <div className="rounded-xl border-2 border-dashed border-[#E8DFC8] p-12 text-center">
          <p className="font-medium text-[#3D5775]">No contacts yet</p>
          <p className="mt-1 text-sm text-[#3D5775]">
            Add your first contact to start tracking your pipeline.
          </p>
          <a
            href="/contacts/new"
            className="mt-4 inline-block rounded-md bg-[#1F8A8A] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1A7575]"
          >
            Add first contact
          </a>
        </div>
      )}

      {/* ── Overdue ── */}
      {overdue.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="Overdue" count={overdue.length} countVariant="red" />
          <div className="rounded-xl border border-red-200 bg-white px-2 py-2">
            <TaskList tasks={overdue} {...taskListProps} />
          </div>
        </section>
      )}

      {/* ── Today's tasks ── */}
      {hasContacts && (
        <section className="space-y-3">
          <SectionHeader label="Today" count={today.length} />
          <div className="rounded-xl border bg-white px-2 py-2">
            {today.length > 0 ? (
              <TaskList tasks={today} {...taskListProps} />
            ) : (
              <div className="rounded-xl p-6 text-center" style={{ background: "#E2F0EE" }}>
                <p className="text-sm italic" style={{ color: "#3D5775" }}>
                  Nothing scheduled for today. Enjoy the breathing room.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Reminders ── */}
      {reminders.length > 0 && (
        <section className="space-y-3">
          <SectionHeader label="Reminders" count={reminders.length} />
          <div className="divide-y rounded-xl border bg-white px-2">
            {reminders.map((t) => (
              <ReminderRow key={t.id} task={t} onSnooze={handleSnooze} />
            ))}
          </div>
        </section>
      )}

      {/* ── All clear ── */}
      {isAllClear && (
        <div className="rounded-xl p-8 text-center" style={{ background: "#E2F0EE" }}>
          <p className="font-semibold" style={{ color: "#1F8A8A" }}>All clear.</p>
          <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
            Nothing needs your attention right now.
          </p>
        </div>
      )}

      {/* ── Recent activity ── */}
      {hasContacts && (
        <section className="space-y-3">
          <SectionHeader label="Recent activity" />
          {activities.length > 0 ? (
            <div className="rounded-xl border bg-white px-2 py-2">
              <ActivityTimeline
                activities={activities}
                readOnly
                contacts={activityContacts}
              />
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm" style={{ color: "#3D5775" }}>
              <Activity className="h-4 w-4 shrink-0" style={{ color: "#1F8A8A" }} />
              No activity yet.{" "}
              <a href="/contacts" style={{ color: "#1F8A8A" }}>
                Log a call, email, or note
              </a>{" "}
              from a contact&apos;s page.
            </p>
          )}
        </section>
      )}

      {/* ── Quick stats ── */}
      {hasContacts && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            value={stats.newContacts}
            label="new contacts this week"
            href="/contacts"
          />
          <StatCard
            value={stats.dealsMovedThisWeek}
            label="deals moved this week"
          />
          <StatCard
            value={stats.tasksCompletedThisWeek}
            label="tasks completed this week"
          />
        </div>
      )}

      {/* ── Task dialog ── */}
      {editingTask && (
        <TaskDialog
          mode="edit"
          task={editingTask}
          onUpdated={(t) => { updateInAll(t); setEditingTask(null); }}
          onDeleted={(id) => { removeFromAll(id); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
