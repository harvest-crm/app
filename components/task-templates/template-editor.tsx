"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  updateTemplate,
  createTemplateItem,
  updateTemplateItem,
  deleteTemplateItem,
  reorderTemplateItems,
} from "@/app/actions/task-templates";
import type { SerializedTemplateWithItems, SerializedTemplateItem } from "@/app/actions/task-templates";

const TASK_TYPES = [
  { value: "call",            label: "Call" },
  { value: "email",           label: "Email" },
  { value: "meeting_prep",    label: "Meeting Prep" },
  { value: "follow_up",       label: "Follow-up" },
  { value: "document_review", label: "Document Review" },
  { value: "other",           label: "Other" },
];

const PRIORITIES  = [
  { value: "low",    label: "Low"    },
  { value: "medium", label: "Medium" },
  { value: "high",   label: "High"   },
];

const REMINDERS = [
  { value: null,  label: "No reminder"     },
  { value: 60,    label: "60 min before"   },
  { value: 1440,  label: "24 hr before"    },
  { value: 2880,  label: "48 hr before"    },
];

const inputCls  = "w-full rounded-md border border-[#E8DFC8] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]";
const selectCls = `${inputCls} appearance-none cursor-pointer`;

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemRow({
  item, idx, total,
  onUpdated, onDeleted, onMoveUp, onMoveDown,
}: {
  item: SerializedTemplateItem; idx: number; total: number;
  onUpdated: (i: SerializedTemplateItem) => void;
  onDeleted: (id: string) => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [, startTransition] = useTransition();

  function save(patch: Parameters<typeof updateTemplateItem>[1]) {
    startTransition(async () => {
      const r = await updateTemplateItem(item.id, patch);
      if ("error" in r) toast.error(r.error); else onUpdated(r.item);
    });
  }

  function remove() {
    startTransition(async () => {
      const r = await deleteTemplateItem(item.id);
      if ("error" in r) toast.error(r.error);
      else { onDeleted(item.id); toast.success("Task removed"); }
    });
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-[#E8DFC8] bg-[#F5EFE0] p-3">
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button type="button" onClick={onMoveUp} disabled={idx === 0}
          className="rounded p-0.5 text-[#3D5775] hover:text-[#0F2540] disabled:opacity-20">
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={idx === total - 1}
          className="rounded p-0.5 text-[#3D5775] hover:text-[#0F2540] disabled:opacity-20">
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-4">
          <input
            defaultValue={item.title}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== item.title) save({ title: v }); }}
            placeholder="Task title"
            className={inputCls}
          />
        </div>
        <select defaultValue={item.taskType} onChange={(e) => save({ taskType: e.target.value })} className={selectCls}>
          {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select defaultValue={item.priority} onChange={(e) => save({ priority: e.target.value })} className={selectCls}>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs whitespace-nowrap" style={{ color: "#3D5775" }}>Due in</span>
          <input type="number" min={0} max={365}
            defaultValue={item.dueOffsetDays}
            onBlur={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v !== item.dueOffsetDays) save({ dueOffsetDays: v }); }}
            className={`${inputCls} w-16`}
          />
          <span className="text-xs" style={{ color: "#3D5775" }}>days</span>
        </div>
        <select
          value={String(item.reminderOffsetMinutes ?? "null")}
          onChange={(e) => {
            const v = e.target.value === "null" ? null : parseInt(e.target.value, 10);
            save({ reminderOffsetMinutes: v });
          }}
          className={selectCls}
        >
          {REMINDERS.map((r) => <option key={String(r.value)} value={String(r.value)}>{r.label}</option>)}
          {item.reminderOffsetMinutes != null && !REMINDERS.some((r) => r.value === item.reminderOffsetMinutes) && (
            <option value={String(item.reminderOffsetMinutes)}>{item.reminderOffsetMinutes} min before</option>
          )}
        </select>
      </div>

      <div className="shrink-0">
        {confirmDel ? (
          <div className="flex items-center gap-1">
            <button onClick={remove} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes</button>
            <button onClick={() => setConfirmDel(false)} className="text-xs" style={{ color: "#3D5775" }}>No</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDel(true)}
            className="rounded p-1 text-[#3D5775] hover:bg-red-100 hover:text-red-600">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Add item form ─────────────────────────────────────────────────────────────

function AddItemForm({ templateId, onAdded }: { templateId: string; onAdded: (i: SerializedTemplateItem) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState("other");
  const [priority, setPriority] = useState("medium");
  const [dueOffsetDays, setDueOffsetDays] = useState(0);
  const [reminder, setReminder] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      const r = await createTemplateItem(templateId, {
        title: title.trim(), taskType, priority, dueOffsetDays, reminderOffsetMinutes: reminder,
      });
      if ("error" in r) { toast.error(r.error); return; }
      onAdded(r.item);
      setTitle(""); setOpen(false);
      toast.success("Task added");
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="mt-2 flex items-center gap-1.5 text-xs font-medium" style={{ color: "#1F8A8A" }}>
        <Plus className="h-3.5 w-3.5" /> Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-lg border border-[#E8DFC8] bg-[#FBF8F0] p-3">
      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title (required)" autoFocus className={inputCls} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className={selectCls}>
          {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
          {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs whitespace-nowrap" style={{ color: "#3D5775" }}>Due in</span>
          <input type="number" min={0} max={365} value={dueOffsetDays}
            onChange={(e) => setDueOffsetDays(parseInt(e.target.value, 10) || 0)}
            className={`${inputCls} w-16`} />
          <span className="text-xs" style={{ color: "#3D5775" }}>days</span>
        </div>
        <select value={String(reminder ?? "null")}
          onChange={(e) => setReminder(e.target.value === "null" ? null : parseInt(e.target.value, 10))}
          className={selectCls}>
          {REMINDERS.map((r) => <option key={String(r.value)} value={String(r.value)}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!title.trim()}
          className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
          Add task
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-xs text-[#3D5775] hover:bg-[#F5EFE0]">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

export function TemplateEditor({ template: init }: { template: SerializedTemplateWithItems }) {
  const [items, setItems] = useState<SerializedTemplateItem[]>(init.items);
  const [, startTransition] = useTransition();
  const router = useRouter();

  function saveField(patch: Parameters<typeof updateTemplate>[1]) {
    startTransition(async () => {
      const r = await updateTemplate(init.id, patch);
      if ("error" in r) toast.error(r.error);
    });
  }

  function updateItem(updated: SerializedTemplateItem) {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function addItem(item: SerializedTemplateItem) {
    setItems((prev) => [...prev, item]);
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const next = [...items];
    const other = idx + dir;
    if (other < 0 || other >= next.length) return;
    [next[idx], next[other]] = [next[other], next[idx]];
    const reordered = next.map((i, k) => ({ ...i, sortOrder: k }));
    setItems(reordered);
    void reorderTemplateItems(init.id, reordered.map((i) => i.id));
  }

  const APPLIES_OPTIONS = [
    { value: "both",    label: "Both contacts and deals" },
    { value: "contact", label: "Contacts only"           },
    { value: "deal",    label: "Deals only"              },
  ];

  return (
    <div className="space-y-6">
      {/* Meta fields */}
      <div className="rounded-xl border bg-white p-5 space-y-4" style={{ borderColor: "#E8DFC8" }}>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>
            Template name
          </label>
          <input
            defaultValue={init.name}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== init.name) saveField({ name: v }); }}
            className={inputCls}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>
            Description{" "}
            <span className="font-normal normal-case" style={{ color: "#3D5775", opacity: 0.6 }}>(optional)</span>
          </label>
          <textarea
            defaultValue={init.description ?? ""}
            onBlur={(e) => {
              const v = e.target.value.trim() || null;
              if (v !== init.description) saveField({ description: v });
            }}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>
            Applies to
          </label>
          <select
            defaultValue={init.appliesTo}
            onChange={(e) => saveField({ appliesTo: e.target.value })}
            className={`${inputCls} w-64 appearance-none bg-white`}
          >
            {APPLIES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Tasks */}
      <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
          Tasks ({items.length})
        </p>
        {items.length === 0 && (
          <p className="text-sm italic" style={{ color: "#3D5775" }}>No tasks yet. Add one below.</p>
        )}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <ItemRow
              key={item.id} item={item} idx={idx} total={items.length}
              onUpdated={updateItem} onDeleted={deleteItem}
              onMoveUp={() => moveItem(idx, -1)} onMoveDown={() => moveItem(idx, 1)}
            />
          ))}
        </div>
        <AddItemForm templateId={init.id} onAdded={addItem} />
      </div>

      <button
        type="button"
        onClick={() => router.push("/settings/task-templates")}
        className="text-sm" style={{ color: "#3D5775" }}
      >
        ← Back to templates
      </button>
    </div>
  );
}
