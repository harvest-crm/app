"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Circle, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateTask, deleteTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart  = new Date(d.getFullYear(),   d.getMonth(),   d.getDate());
  const diff = Math.round((dueStart.getTime() - todayStart.getTime()) / 86_400_000);

  if (diff === 0)  return "Today";
  if (diff === 1)  return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1  && diff < 7)  return `in ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(task: SerializedTask): boolean {
  return !task.completedAt && !!task.dueAt && new Date(task.dueAt) < new Date();
}

// ── Sort ─────────────────────────────────────────────────────────────────────

function sortTasks(tasks: SerializedTask[]) {
  const open = tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return 0;
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });

  const done = tasks
    .filter((t) => !!t.completedAt)
    .sort((a, b) =>
      new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime(),
    );

  return { open, done };
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  onUpdated,
  onDeleted,
}: {
  task: SerializedTask;
  onToggle: () => void;
  onUpdated: (t: SerializedTask) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const overdue = isOverdue(task);
  const completed = !!task.completedAt;

  // Focus input when entering edit mode
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEditing() {
    if (completed) return; // don't edit completed tasks inline
    setEditTitle(task.title);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditTitle(task.title);
  }

  function saveEdit() {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === task.title) {
      cancelEdit();
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", trimmed);
      if (task.dueAt) fd.set("dueAt", task.dueAt.split("T")[0]);
      const result = await updateTask(task.id, fd);
      if ("error" in result) {
        toast.error(result.error);
        cancelEdit();
      } else {
        onUpdated(result.task);
        setEditing(false);
        toast.success("Task updated");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        onDeleted(task.id);
        toast.success("Task deleted");
      }
    });
  }

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors",
        overdue && "bg-red-50/60",
      )}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          completed
            ? "text-slate-300 hover:text-slate-400"
            : "text-slate-300 hover:text-blue-500",
        )}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-slate-400" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      {/* Title + due date */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
              if (e.key === "Escape") cancelEdit();
            }}
            disabled={pending}
            className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          />
        ) : (
          <span
            onClick={startEditing}
            className={cn(
              "block cursor-pointer text-sm",
              completed
                ? "text-slate-400 line-through"
                : "text-slate-800 hover:text-slate-600",
            )}
          >
            {task.title}
          </span>
        )}

        {task.dueAt && !editing && (
          <span
            className={cn(
              "text-xs",
              overdue ? "font-medium text-red-500" : "text-slate-400",
            )}
          >
            {formatDue(task.dueAt)}
          </span>
        )}

        {/* Inline delete confirm */}
        {confirmDelete && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">Delete?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Hover actions */}
      {!editing && !confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          title="Delete"
          className="mt-0.5 shrink-0 rounded p-0.5 text-slate-300 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── TaskList ──────────────────────────────────────────────────────────────────

export function TaskList({
  tasks,
  onToggle,
  onUpdated,
  onDeleted,
}: {
  tasks: SerializedTask[];
  onToggle: (task: SerializedTask) => void;
  onUpdated: (task: SerializedTask) => void;
  onDeleted: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-400">No tasks yet.</p>;
  }

  const { open, done } = sortTasks(tasks);

  return (
    <div className="space-y-0.5">
      {open.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          onToggle={() => onToggle(t)}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ))}

      {done.length > 0 && (
        <>
          {open.length > 0 && (
            <div className="flex items-center gap-2 py-1.5">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-xs text-slate-400">Completed</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
          )}
          {done.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => onToggle(t)}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))}
        </>
      )}
    </div>
  );
}
