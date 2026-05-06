"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createTask, updateTask, deleteTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_TYPES = [
  { value: "call",            label: "Call" },
  { value: "email",           label: "Email" },
  { value: "meeting_prep",    label: "Meeting Prep" },
  { value: "follow_up",       label: "Follow-up" },
  { value: "document_review", label: "Document Review" },
  { value: "other",           label: "Other" },
] as const;

const REMINDER_OPTIONS = [
  { value: "none",   label: "None" },
  { value: "15min",  label: "15 minutes before" },
  { value: "1hr",    label: "1 hour before" },
  { value: "1day",   label: "1 day before" },
  { value: "custom", label: "Custom date/time" },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasExplicitTime(iso: string): boolean {
  const d = new Date(iso);
  return !(d.getUTCHours() === 12 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0);
}

function extractDateStr(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function extractTimeStr(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function deriveReminderType(dueAt: string | null, reminderAt: string | null): string {
  if (!reminderAt) return "none";
  if (!dueAt) return "custom";
  const diffMs = new Date(dueAt).getTime() - new Date(reminderAt).getTime();
  if (Math.abs(diffMs - 15 * 60 * 1000) < 60_000) return "15min";
  if (Math.abs(diffMs - 60 * 60 * 1000) < 60_000) return "1hr";
  if (Math.abs(diffMs - 24 * 60 * 60 * 1000) < 60_000) return "1day";
  return "custom";
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  mode: "create" | "edit";
  task?: SerializedTask;
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
  initialTitle?: string;
  onCreated?: (task: SerializedTask) => void;
  onUpdated?: (task: SerializedTask) => void;
  onDeleted?: (id: string) => void;
  onClose: () => void;
};

export function TaskDialog({
  mode, task, contactId, dealId, workspaceId,
  initialTitle = "",
  onCreated, onUpdated, onDeleted, onClose,
}: Props) {
  const initReminderType = deriveReminderType(task?.dueAt ?? null, task?.reminderAt ?? null);

  const [title,       setTitle]       = useState(task?.title ?? initialTitle);
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority,    setPriority]    = useState(task?.priority ?? "medium");
  const [taskType,    setTaskType]    = useState(task?.taskType ?? "");
  const [dueDate,     setDueDate]     = useState(
    task?.dueAt ? extractDateStr(task.dueAt) : "",
  );
  const [dueTime, setDueTime] = useState(
    task?.dueAt && hasExplicitTime(task.dueAt) ? extractTimeStr(task.dueAt) : "",
  );
  const [reminderType, setReminderType] = useState(initReminderType);
  const [reminderCustom, setReminderCustom] = useState(
    initReminderType === "custom" && task?.reminderAt
      ? new Date(task.reminderAt).toISOString().slice(0, 16)
      : "",
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverError,   setServerError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setServerError("Title is required"); return; }
    setServerError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("priority", priority);
      if (description.trim()) fd.set("description", description.trim());
      if (taskType) fd.set("taskType", taskType);
      if (dueDate) fd.set("dueDate", dueDate);
      if (dueTime) fd.set("dueTime", dueTime);
      fd.set("reminderType", reminderType);
      if (reminderType === "custom" && reminderCustom) fd.set("reminderCustom", reminderCustom);
      if (contactId) fd.set("contactId", contactId);
      if (dealId) fd.set("dealId", dealId);
      if (workspaceId) fd.set("workspaceId", workspaceId);

      if (mode === "create") {
        const result = await createTask(fd);
        if ("error" in result) { setServerError(result.error); return; }
        onCreated?.(result.task);
        toast.success("Task created");
        onClose();
      } else if (task) {
        const result = await updateTask(task.id, fd);
        if ("error" in result) { setServerError(result.error); return; }
        onUpdated?.(result.task);
        toast.success("Task saved");
        onClose();
      }
    });
  }

  function handleDelete() {
    if (!task) return;
    startTransition(async () => {
      const result = await deleteTask(task.id);
      if ("error" in result) { setServerError(result.error); return; }
      onDeleted?.(task.id);
      toast.success("Task deleted");
      onClose();
    });
  }

  const inputClass =
    "w-full rounded-md border border-[#E8DFC8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A] disabled:opacity-50";
  const selectClass =
    "w-full rounded-md border border-[#E8DFC8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A] disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-[#0F2540]">
            {mode === "create" ? "New Task" : "Edit Task"}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-[#3D5775] hover:bg-[#E2F0EE] hover:text-[#3D5775]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              autoFocus
              disabled={pending}
              className={inputClass}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
              Description{" "}
              <span className="font-normal normal-case text-[#3D5775]">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Additional context…"
              disabled={pending}
              className={cn(inputClass, "resize-none")}
            />
          </div>

          {/* Priority + Task Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
                Priority
              </label>
              <div className="flex gap-1">
                {(["low", "medium", "high"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    disabled={pending}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize transition-colors",
                      priority === p
                        ? p === "high"
                          ? "bg-red-100 text-red-700"
                          : p === "medium"
                            ? "bg-[#E2F0EE] text-[#1F8A8A]"
                            : "bg-[#E2F0EE] text-[#3D5775]"
                        : "bg-[#F5EFE0] text-[#3D5775] hover:bg-[#E2F0EE] hover:text-[#3D5775]",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
                Task Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                disabled={pending}
                className={selectClass}
              >
                <option value="">— None —</option>
                {TASK_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={pending}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
                Due Time{" "}
                <span className="font-normal normal-case text-[#3D5775]">(optional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={pending || !dueDate}
                className={inputClass}
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#3D5775]">
              Reminder
            </label>
            <select
              value={reminderType}
              onChange={(e) => setReminderType(e.target.value)}
              disabled={pending}
              className={selectClass}
            >
              {REMINDER_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {reminderType === "custom" && (
              <input
                type="datetime-local"
                value={reminderCustom}
                onChange={(e) => setReminderCustom(e.target.value)}
                disabled={pending}
                className={cn(inputClass, "mt-2")}
              />
            )}
          </div>

          {serverError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              {serverError}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {mode === "edit" && task ? (
              <div>
                {confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#3D5775]">Delete this task?</span>
                    <button type="button" onClick={handleDelete} disabled={pending}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                      Yes
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)}
                      className="text-xs text-[#3D5775] hover:text-[#3D5775]">
                      No
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)}
                    className="text-xs font-medium text-red-500 hover:text-red-700">
                    Delete task
                  </button>
                )}
              </div>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={pending}
                className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm font-medium text-[#3D5775] hover:bg-[#E2F0EE] disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={pending || !title.trim()}
                className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#1A7575] disabled:opacity-40">
                {pending ? "Saving…" : mode === "create" ? "Create Task" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
