"use client";

import { useState, useTransition } from "react";
import {
  Circle, CheckCircle2, Trash2, Bell,
  Phone, Mail, Calendar, RotateCw, FileText, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

// ── Config ────────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const PRIORITY_DOT: Record<string, string> = {
  high:   "bg-red-400",
  medium: "bg-blue-400",
  low:    "bg-stone-300",
};

const TASK_TYPE_ICON: Record<string, React.ElementType> = {
  call:            Phone,
  email:           Mail,
  meeting_prep:    Calendar,
  follow_up:       RotateCw,
  document_review: FileText,
  other:           MoreHorizontal,
};

// ── Date helpers ─────────────────────────────────────────────────────────────

function formatDue(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart   = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diff = Math.round((dueStart.getTime() - todayStart.getTime()) / 86_400_000);

  let day: string;
  if      (diff === 0)           day = "Today";
  else if (diff === 1)           day = "Tomorrow";
  else if (diff === -1)          day = "Yesterday";
  else if (diff > 1  && diff < 7)  day = `in ${diff} days`;
  else if (diff < -1 && diff > -7) day = `${Math.abs(diff)} days ago`;
  else day = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Show time if not the noon-UTC default
  const h = d.getUTCHours(), m = d.getUTCMinutes(), s = d.getUTCSeconds();
  if (!(h === 12 && m === 0 && s === 0)) {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12  = h % 12 || 12;
    return `${day} at ${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  }
  return day;
}

function isOverdue(task: SerializedTask): boolean {
  return !task.completedAt && !!task.dueAt && new Date(task.dueAt) < new Date();
}

// ── Sort ─────────────────────────────────────────────────────────────────────

function sortTasks(tasks: SerializedTask[]) {
  const open = tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
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
  onOpenEdit,
  onDeleted,
}: {
  task: SerializedTask;
  onToggle: () => void;
  onOpenEdit: () => void;
  onDeleted: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const overdue   = isOverdue(task);
  const completed = !!task.completedAt;
  const TypeIcon  = task.taskType ? TASK_TYPE_ICON[task.taskType] : null;

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
        "group flex items-start gap-2 rounded-lg px-2 py-2 transition-colors",
        overdue && !completed && "bg-red-50/60",
      )}
    >
      {/* Priority dot */}
      <div
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          completed ? "bg-[#E2F0EE]" : (PRIORITY_DOT[task.priority] ?? "bg-[#E2F0EE]"),
        )}
        title={`${task.priority} priority`}
      />

      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "mt-0.5 shrink-0 transition-colors",
          completed ? "text-[#3D5775]" : "text-[#3D5775] hover:text-[#1F8A8A]",
        )}
      >
        {completed ? (
          <CheckCircle2 className="h-4 w-4 text-[#3D5775]" />
        ) : (
          <Circle className="h-4 w-4" />
        )}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {TypeIcon && (
            <TypeIcon className="h-3.5 w-3.5 shrink-0 text-[#3D5775]" />
          )}
          <span
            onClick={onOpenEdit}
            className={cn(
              "cursor-pointer text-sm leading-snug",
              completed ? "text-[#3D5775] line-through" : "text-[#0F2540] hover:text-[#1F8A8A]",
            )}
          >
            {task.title}
          </span>
        </div>

        {task.description && (
          <p className="mt-0.5 truncate text-xs text-[#3D5775]">
            {task.description.slice(0, 80)}
          </p>
        )}

        {task.dueAt && (
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                "text-xs",
                overdue && !completed ? "font-medium text-red-500" : "text-[#3D5775]",
              )}
            >
              {formatDue(task.dueAt)}
            </span>
            {task.reminderAt && (
              <span title="Reminder set">
                <Bell className="h-3 w-3 text-[#3D5775]" />
              </span>
            )}
          </div>
        )}

        {confirmDelete && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-[#3D5775]">Delete?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-[#3D5775] hover:text-[#3D5775]"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Hover trash */}
      {!confirmDelete && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          title="Delete"
          className="mt-0.5 shrink-0 rounded p-0.5 text-[#3D5775] opacity-0 transition-opacity hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
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
  onOpenEdit,
  onDeleted,
}: {
  tasks: SerializedTask[];
  onToggle: (task: SerializedTask) => void;
  onOpenEdit: (task: SerializedTask) => void;
  onDeleted: (id: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="py-4 text-center text-xs text-[#3D5775]">No tasks yet.</p>;
  }

  const { open, done } = sortTasks(tasks);

  return (
    <div className="space-y-0.5">
      {open.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          onToggle={() => onToggle(t)}
          onOpenEdit={() => onOpenEdit(t)}
          onDeleted={onDeleted}
        />
      ))}

      {done.length > 0 && (
        <>
          {open.length > 0 && (
            <div className="flex items-center gap-2 py-1.5">
              <div className="h-px flex-1 bg-[#E2F0EE]" />
              <span className="text-xs text-[#3D5775]">Completed</span>
              <div className="h-px flex-1 bg-[#E2F0EE]" />
            </div>
          )}
          {done.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              onToggle={() => onToggle(t)}
              onOpenEdit={() => onOpenEdit(t)}
              onDeleted={onDeleted}
            />
          ))}
        </>
      )}
    </div>
  );
}
