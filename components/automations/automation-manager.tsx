"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  toggleStageAutomation,
  createAutomationTask,
  updateAutomationTask,
  deleteAutomationTask,
  reorderAutomationTasks,
  applyRealEstateTemplate,
} from "@/app/actions/automations";
import type { SerializedAutomation, SerializedAutomationTask } from "@/app/actions/automations";

const TASK_TYPES = [
  { value: "call",            label: "Call" },
  { value: "email",           label: "Email" },
  { value: "meeting_prep",    label: "Meeting Prep" },
  { value: "follow_up",       label: "Follow-up" },
  { value: "document_review", label: "Document Review" },
  { value: "other",           label: "Other" },
];

const PRIORITIES = [
  { value: "low",    label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High" },
];

const REMINDER_OPTIONS = [
  { value: null,   label: "No reminder" },
  { value: 60,     label: "60 min before" },
  { value: 1440,   label: "24 hr before" },
  { value: 2880,   label: "48 hr before" },
];

const inputCls = "w-full rounded-md border border-[#E8DFC8] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]";
const selectCls = `${inputCls} appearance-none bg-white cursor-pointer`;

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = { id: string; name: string; sortOrder: number };

type Props = {
  workspaceId: string;
  stages: Stage[];
  initialAutomations: SerializedAutomation[];
  hasAnyAutomation: boolean;
};

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-40"
      style={{ background: checked ? "#1F8A8A" : "#E8DFC8" }}
    >
      <span
        className="inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
      />
    </button>
  );
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task, idx, total,
  onUpdated, onDeleted, onMoveUp, onMoveDown,
}: {
  task: SerializedAutomationTask;
  idx: number; total: number;
  onUpdated: (t: SerializedAutomationTask) => void;
  onDeleted: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function save(patch: Parameters<typeof updateAutomationTask>[1]) {
    startTransition(async () => {
      const result = await updateAutomationTask(task.id, patch);
      if ("error" in result) toast.error(result.error);
      else onUpdated(result.task);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAutomationTask(task.id);
      if ("error" in result) toast.error(result.error);
      else { onDeleted(task.id); toast.success("Task removed"); }
    });
  }

  const currentReminder = REMINDER_OPTIONS.find(r => r.value === task.reminderOffsetMinutes)
    ? task.reminderOffsetMinutes
    : task.reminderOffsetMinutes; // custom value

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#E8DFC8] bg-[#F5EFE0] p-3">
      {/* Reorder */}
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button type="button" onClick={onMoveUp} disabled={idx === 0 || pending}
          className="rounded p-0.5 text-[#3D5775] hover:text-[#0F2540] disabled:opacity-20">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={idx === total - 1 || pending}
          className="rounded p-0.5 text-[#3D5775] hover:text-[#0F2540] disabled:opacity-20">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Fields */}
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <input
            defaultValue={task.title}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) save({ title: v }); }}
            disabled={pending}
            placeholder="Task title"
            className={inputCls}
          />
        </div>

        <select defaultValue={task.taskType} onChange={(e) => save({ taskType: e.target.value })} disabled={pending} className={selectCls}>
          {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <select defaultValue={task.priority} onChange={(e) => save({ priority: e.target.value })} disabled={pending} className={selectCls}>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#3D5775] whitespace-nowrap">Due in</span>
          <input
            type="number" min={0} max={365}
            defaultValue={task.dueOffsetDays}
            onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v !== task.dueOffsetDays) save({ dueOffsetDays: v }); }}
            disabled={pending}
            className={`${inputCls} w-16`}
          />
          <span className="text-xs text-[#3D5775]">days</span>
        </div>

        <select
          value={currentReminder ?? "null"}
          onChange={(e) => {
            const v = e.target.value === "null" ? null : parseInt(e.target.value, 10);
            save({ reminderOffsetMinutes: v });
          }}
          disabled={pending}
          className={selectCls}
        >
          {REMINDER_OPTIONS.map(r => (
            <option key={String(r.value)} value={String(r.value)}>{r.label}</option>
          ))}
          {task.reminderOffsetMinutes != null && !REMINDER_OPTIONS.some(r => r.value === task.reminderOffsetMinutes) && (
            <option value={String(task.reminderOffsetMinutes)}>{task.reminderOffsetMinutes} min before</option>
          )}
        </select>
      </div>

      {/* Delete */}
      <div className="shrink-0">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button onClick={handleDelete} disabled={pending} className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40">Yes</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#3D5775] hover:text-[#0F2540]">No</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={pending}
            className="rounded p-1 text-[#3D5775] hover:bg-red-100 hover:text-red-600 disabled:opacity-40">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add task form ─────────────────────────────────────────────────────────────

function AddTaskForm({ automationId, onAdded }: { automationId: string; onAdded: (t: SerializedAutomationTask) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [dueOffsetDays, setDueOffsetDays] = useState(0);
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const result = await createAutomationTask(automationId, {
        title: title.trim(), taskType, priority, dueOffsetDays, reminderOffsetMinutes,
      });
      if ("error" in result) { toast.error(result.error); return; }
      onAdded(result.task);
      setTitle(""); setOpen(false);
      toast.success("Task added");
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#1F8A8A] hover:text-[#1A7575]">
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-[#E8DFC8] bg-[#FBF8F0] p-3">
      <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title (required)"
        autoFocus className={inputCls} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={taskType} onChange={e => setTaskType(e.target.value)} className={selectCls}>
          {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className={selectCls}>
          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[#3D5775] whitespace-nowrap">Due in</span>
          <input type="number" min={0} max={365} value={dueOffsetDays}
            onChange={e => setDueOffsetDays(parseInt(e.target.value, 10) || 0)}
            className={`${inputCls} w-16`} />
          <span className="text-xs text-[#3D5775]">days</span>
        </div>
        <select value={String(reminderOffsetMinutes ?? "null")}
          onChange={e => setReminderOffsetMinutes(e.target.value === "null" ? null : parseInt(e.target.value, 10))}
          className={selectCls}>
          {REMINDER_OPTIONS.map(r => <option key={String(r.value)} value={String(r.value)}>{r.label}</option>)}
        </select>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending || !title.trim()}
          className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
          {pending ? "Adding…" : "Add task"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-xs text-[#3D5775] hover:bg-[#F5EFE0]">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Stage section ─────────────────────────────────────────────────────────────

function StageSection({
  stage, automation: initAutomation,
}: { stage: Stage; automation: SerializedAutomation | null }) {
  const [automation, setAutomation] = useState<SerializedAutomation | null>(initAutomation);
  const [pending, startTransition] = useTransition();

  function handleToggle(isEnabled: boolean) {
    startTransition(async () => {
      const result = await toggleStageAutomation(stage.id, isEnabled);
      if ("error" in result) toast.error(result.error);
      else setAutomation(result.automation);
    });
  }

  function updateTask(updated: SerializedAutomationTask) {
    setAutomation(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === updated.id ? updated : t) } : prev);
  }

  function deleteTask(id: string) {
    setAutomation(prev => prev ? { ...prev, tasks: prev.tasks.filter(t => t.id !== id) } : prev);
  }

  function addTask(task: SerializedAutomationTask) {
    setAutomation(prev => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
  }

  function moveTask(idx: number, dir: -1 | 1) {
    if (!automation) return;
    const tasks = [...automation.tasks];
    const other = idx + dir;
    if (other < 0 || other >= tasks.length) return;
    [tasks[idx], tasks[other]] = [tasks[other], tasks[idx]];
    const updated = tasks.map((t, i) => ({ ...t, sortOrder: i }));
    setAutomation({ ...automation, tasks: updated });
    // Persist new order
    void reorderAutomationTasks(automation.id, updated.map(t => t.id));
  }

  const isEnabled = automation?.isEnabled ?? false;

  return (
    <div className="rounded-xl border border-[#E8DFC8] bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#0F2540]">{stage.name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#3D5775]">{isEnabled ? "Enabled" : "Disabled"}</span>
          <Toggle checked={isEnabled} onChange={handleToggle} disabled={pending} />
        </div>
      </div>

      {isEnabled && automation && (
        <div className="mt-4 space-y-2">
          {automation.tasks.length === 0 && (
            <p className="text-xs italic text-[#3D5775]">No tasks yet. Add one below.</p>
          )}
          {automation.tasks.map((task, idx) => (
            <TaskRow
              key={task.id} task={task} idx={idx} total={automation.tasks.length}
              onUpdated={updateTask} onDeleted={deleteTask}
              onMoveUp={() => moveTask(idx, -1)} onMoveDown={() => moveTask(idx, 1)}
            />
          ))}
          <AddTaskForm automationId={automation.id} onAdded={addTask} />
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AutomationManager({ workspaceId, stages, initialAutomations, hasAnyAutomation }: Props) {
  const automationMap = new Map<string, SerializedAutomation | null>();
  for (const s of stages) automationMap.set(s.id, null);
  for (const a of initialAutomations) automationMap.set(a.stageId, a);
  const [applying, startApply] = useTransition();

  function handleApplyTemplate() {
    startApply(async () => {
      const result = await applyRealEstateTemplate(workspaceId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Applied automations to ${result.applied} stage${result.applied !== 1 ? "s" : ""}. Refresh to see them.`);
        // Reload page data by reloading
        window.location.reload();
      }
    });
  }

  return (
    <div className="space-y-4">
      {!hasAnyAutomation && stages.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#D0E5E2] bg-[#E2F0EE] p-4">
          <div>
            <p className="text-sm font-medium text-[#0F2540]">No automations configured yet</p>
            <p className="text-xs text-[#3D5775]">Apply the Real Estate template to get started instantly.</p>
          </div>
          <button
            type="button"
            onClick={handleApplyTemplate}
            disabled={applying}
            className="flex items-center gap-2 rounded-md bg-[#1F8A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40"
          >
            <Zap className="h-4 w-4" />
            {applying ? "Applying…" : "Apply Real Estate template"}
          </button>
        </div>
      )}

      {stages.map((stage) => (
        <StageSection
          key={stage.id}
          stage={stage}
          automation={automationMap.get(stage.id) ?? null}
        />
      ))}

      {stages.length === 0 && (
        <p className="py-8 text-center text-sm text-[#3D5775]">
          This workspace has no stages yet. Add stages in the workspace settings.
        </p>
      )}
    </div>
  );
}
