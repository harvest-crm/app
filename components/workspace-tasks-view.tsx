"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { QuickCreateTask } from "@/components/quick-create-task";
import { TaskList } from "@/components/task-list";
import { TaskDialog } from "@/components/task-dialog";
import { completeTask, reopenTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

type Filter = "open" | "completed" | "all";

type Props = {
  workspace: { id: string; name: string; color: string };
  initialTasks: SerializedTask[];
};

export function WorkspaceTasksView({ workspace, initialTasks }: Props) {
  const [tasks, setTasks] = useState<SerializedTask[]>(initialTasks);
  const [filter, setFilter] = useState<Filter>("open");
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<SerializedTask | null>(null);
  const [dialogTitle, setDialogTitle] = useState("");

  const filteredTasks = useMemo(() => {
    if (filter === "open") return tasks.filter((t) => !t.completedAt);
    if (filter === "completed") return tasks.filter((t) => !!t.completedAt);
    return tasks;
  }, [tasks, filter]);

  const openCount = tasks.filter((t) => !t.completedAt).length;

  function handleToggle(task: SerializedTask) {
    const wasCompleted = !!task.completedAt;
    const optimistic: SerializedTask = {
      ...task,
      completedAt: wasCompleted ? null : new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));

    (wasCompleted ? reopenTask(task.id) : completeTask(task.id)).then((result) => {
      if ("error" in result) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        toast.error("Failed to update task");
      }
    });
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "open",      label: "Open" },
    { key: "completed", label: "Completed" },
    { key: "all",       label: "All" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workspace.color }} />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{workspace.name} · Tasks</h1>
            <p className="text-xs text-slate-400">
              {openCount} open task{openCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setEditingTask(null); setDialogTitle(""); setDialogMode("create"); }}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Quick create */}
        <div className="mb-6 rounded-lg border bg-white p-4">
          <QuickCreateTask
            workspaceId={workspace.id}
            onCreated={(t) => setTasks((prev) => [t, ...prev])}
            onOpenAdvanced={(title) => {
              setDialogTitle(title);
              setEditingTask(null);
              setDialogMode("create");
            }}
          />
        </div>

        {/* Filter tabs */}
        <div className="mb-4 flex w-fit gap-1 rounded-lg border bg-white p-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === key
                  ? "bg-slate-800 text-white"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
              )}
            >
              {label}
              {key === "open" && openCount > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task list */}
        <div className="rounded-lg border bg-white px-2 py-2">
          <TaskList
            tasks={filteredTasks}
            onToggle={handleToggle}
            onOpenEdit={(task) => { setEditingTask(task); setDialogMode("edit"); }}
            onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
          />
        </div>
      </div>

      {/* Dialog */}
      {dialogMode && (
        <TaskDialog
          mode={dialogMode}
          task={dialogMode === "edit" ? (editingTask ?? undefined) : undefined}
          initialTitle={dialogMode === "create" ? dialogTitle : undefined}
          workspaceId={workspace.id}
          onCreated={(t) => { setTasks((prev) => [t, ...prev]); setDialogMode(null); }}
          onUpdated={(t) => {
            setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            setDialogMode(null);
          }}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setDialogMode(null);
          }}
          onClose={() => setDialogMode(null)}
        />
      )}
    </div>
  );
}
