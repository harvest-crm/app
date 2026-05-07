"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X, ChevronDown } from "lucide-react";
import {
  encodeFilters,
  decodeContactFilters,
  decodeTaskFilters,
  decodeDealFilters,
} from "@/lib/saved-views/url-encoder";
import type { AnyFilters, EntityType } from "@/lib/saved-views/filter-types";

// ── Metadata types ─────────────────────────────────────────────────────────────

type WsMeta  = { id: string; name: string; slug: string };
type TagMeta = { id: string; name: string; color: string };
type StageMeta = { id: string; name: string };

type Props = {
  entityType: EntityType;
  workspaces?: WsMeta[];
  tags?: TagMeta[];
  stages?: StageMeta[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TASK_TYPES = [
  { value: "call",            label: "Call"           },
  { value: "email",           label: "Email"          },
  { value: "meeting_prep",    label: "Meeting prep"   },
  { value: "follow_up",       label: "Follow up"      },
  { value: "document_review", label: "Document review"},
  { value: "other",           label: "Other"          },
];

const PRIORITIES = ["low", "medium", "high"] as const;
const TEMPERATURES = ["hot", "warm", "cold"] as const;

const DUE_OPTIONS = [
  { value: "overdue",    label: "Overdue"    },
  { value: "today",      label: "Today"      },
  { value: "this_week",  label: "This week"  },
  { value: "this_month", label: "This month" },
];

// ── Chip ───────────────────────────────────────────────────────────────────────

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ borderColor: "#1F8A8A", background: "#E2F0EE", color: "#0F2540" }}>
      {label}
      <button type="button" onClick={onRemove} className="ml-0.5 rounded-full hover:bg-[#C5DCD9]">
        <X className="h-3 w-3" style={{ color: "#1F8A8A" }} />
      </button>
    </div>
  );
}

// ── FilterPanel (per filter type) ─────────────────────────────────────────────

type FilterKey = string;

function FilterPanel({
  filterKey, draft, setDraft, workspaces, tags, stages,
}: {
  filterKey: FilterKey;
  draft: Record<string, unknown>;
  setDraft: (d: Record<string, unknown>) => void;
  workspaces?: WsMeta[];
  tags?: TagMeta[];
  stages?: StageMeta[];
}) {
  const inputCls = "w-full rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]";

  if (filterKey === "q") {
    return (
      <div>
        <p className="mb-1 text-xs font-medium" style={{ color: "#3D5775" }}>Search</p>
        <input value={(draft.q as string) ?? ""} onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          placeholder="Type to search…" autoFocus className={inputCls} style={{ color: "#0F2540" }} />
      </div>
    );
  }

  if (filterKey === "workspaceIds" && workspaces && workspaces.length > 0) {
    const selected = (draft.workspaceIds as string[]) ?? [];
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Workspaces</p>
        <div className="space-y-1">
          {workspaces.map((ws) => (
            <label key={ws.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[#E2F0EE]"
              style={{ color: "#0F2540" }}>
              <input type="checkbox" className="accent-[#1F8A8A]"
                checked={selected.includes(ws.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, ws.id] : selected.filter((id) => id !== ws.id);
                  setDraft({ ...draft, workspaceIds: next });
                }} />
              {ws.name}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "tagIds" && tags && tags.length > 0) {
    const selected = (draft.tagIds as string[]) ?? [];
    const logic = (draft.tagsLogic as string) ?? "or";
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: "#3D5775" }}>Tags</p>
          <div className="flex items-center gap-1 text-xs">
            {(["or", "and"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setDraft({ ...draft, tagsLogic: l })}
                className="rounded px-2 py-0.5 font-medium transition-colors"
                style={logic === l ? { background: "#1F8A8A", color: "#fff" } : { color: "#3D5775" }}>
                {l === "or" ? "Any" : "All"}
              </button>
            ))}
          </div>
        </div>
        <div className="max-h-44 space-y-1 overflow-y-auto">
          {tags.map((tag) => (
            <label key={tag.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[#E2F0EE]"
              style={{ color: "#0F2540" }}>
              <input type="checkbox" className="accent-[#1F8A8A]"
                checked={selected.includes(tag.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, tag.id] : selected.filter((id) => id !== tag.id);
                  setDraft({ ...draft, tagIds: next });
                }} />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "temperature") {
    const selected = (draft.temperature as string[]) ?? [];
    const colors: Record<string, string> = { hot: "#EF4444", warm: "#F59E0B", cold: "#3B82F6" };
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Temperature</p>
        <div className="flex gap-2">
          {TEMPERATURES.map((t) => (
            <button key={t} type="button"
              onClick={() => {
                const next = selected.includes(t) ? selected.filter((v) => v !== t) : [...selected, t];
                setDraft({ ...draft, temperature: next });
              }}
              className="rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors"
              style={selected.includes(t)
                ? { background: colors[t], color: "#fff", borderColor: colors[t] }
                : { borderColor: "#E8DFC8", color: "#3D5775" }}>
              {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "hasOpenTasks" || filterKey === "hasOpenDeals" || filterKey === "hasContact" || filterKey === "hasReminder") {
    const labels: Record<string, string> = {
      hasOpenTasks: "Has open tasks",
      hasOpenDeals: "Has open deals",
      hasContact:   "Has contact linked",
      hasReminder:  "Has reminder set",
    };
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm" style={{ color: "#0F2540" }}>
        <input type="checkbox" className="h-4 w-4 accent-[#1F8A8A]"
          checked={(draft[filterKey] as boolean) ?? false}
          onChange={(e) => setDraft({ ...draft, [filterKey]: e.target.checked })} />
        {labels[filterKey]}
      </label>
    );
  }

  if (filterKey === "createdRange") {
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Created date range</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3D5775" }}>After</p>
            <input type="date" value={(draft.createdAfter as string) ?? ""}
              onChange={(e) => setDraft({ ...draft, createdAfter: e.target.value || undefined })}
              className={inputCls} style={{ color: "#0F2540" }} />
          </div>
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3D5775" }}>Before</p>
            <input type="date" value={(draft.createdBefore as string) ?? ""}
              onChange={(e) => setDraft({ ...draft, createdBefore: e.target.value || undefined })}
              className={inputCls} style={{ color: "#0F2540" }} />
          </div>
        </div>
      </div>
    );
  }

  if (filterKey === "taskTypes") {
    const selected = (draft.taskTypes as string[]) ?? [];
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Task type</p>
        <div className="flex flex-wrap gap-1.5">
          {TASK_TYPES.map(({ value, label }) => (
            <button key={value} type="button"
              onClick={() => {
                const next = selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value];
                setDraft({ ...draft, taskTypes: next });
              }}
              className="rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors"
              style={selected.includes(value)
                ? { background: "#1F8A8A", color: "#fff", borderColor: "#1F8A8A" }
                : { borderColor: "#E8DFC8", color: "#3D5775" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "priorities") {
    const selected = (draft.priorities as string[]) ?? [];
    const colors: Record<string, string> = { low: "#10B981", medium: "#F59E0B", high: "#EF4444" };
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Priority</p>
        <div className="flex gap-2">
          {PRIORITIES.map((p) => (
            <button key={p} type="button"
              onClick={() => {
                const next = selected.includes(p) ? selected.filter((v) => v !== p) : [...selected, p];
                setDraft({ ...draft, priorities: next });
              }}
              className="rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors"
              style={selected.includes(p)
                ? { background: colors[p], color: "#fff", borderColor: colors[p] }
                : { borderColor: "#E8DFC8", color: "#3D5775" }}>
              {p}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "status") {
    const val = (draft.status as string) ?? "open";
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Status</p>
        <div className="flex gap-2">
          {(["open", "completed", "all"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setDraft({ ...draft, status: s })}
              className="rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors"
              style={val === s
                ? { background: "#1F8A8A", color: "#fff", borderColor: "#1F8A8A" }
                : { borderColor: "#E8DFC8", color: "#3D5775" }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "dueWithin") {
    const val = (draft.dueWithin as string) ?? "";
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Due within</p>
        <div className="flex flex-wrap gap-1.5">
          {DUE_OPTIONS.map(({ value, label }) => (
            <button key={value} type="button"
              onClick={() => setDraft({ ...draft, dueWithin: val === value ? undefined : value })}
              className="rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
              style={val === value
                ? { background: "#1F8A8A", color: "#fff", borderColor: "#1F8A8A" }
                : { borderColor: "#E8DFC8", color: "#3D5775" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "stageIds" && stages && stages.length > 0) {
    const selected = (draft.stageIds as string[]) ?? [];
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Stages</p>
        <div className="space-y-1">
          {stages.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-[#E2F0EE]"
              style={{ color: "#0F2540" }}>
              <input type="checkbox" className="accent-[#1F8A8A]"
                checked={selected.includes(s.id)}
                onChange={(e) => {
                  const next = e.target.checked ? [...selected, s.id] : selected.filter((id) => id !== s.id);
                  setDraft({ ...draft, stageIds: next });
                }} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (filterKey === "valueRange") {
    return (
      <div>
        <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Deal value</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3D5775" }}>Min ($)</p>
            <input type="number" min={0} value={(draft.valueMin as number) ?? ""}
              onChange={(e) => setDraft({ ...draft, valueMin: e.target.value ? Number(e.target.value) : undefined })}
              className={inputCls} style={{ color: "#0F2540" }} />
          </div>
          <div>
            <p className="mb-1 text-xs" style={{ color: "#3D5775" }}>Max ($)</p>
            <input type="number" min={0} value={(draft.valueMax as number) ?? ""}
              onChange={(e) => setDraft({ ...draft, valueMax: e.target.value ? Number(e.target.value) : undefined })}
              className={inputCls} style={{ color: "#0F2540" }} />
          </div>
        </div>
      </div>
    );
  }

  if (filterKey === "daysInStageMin") {
    return (
      <div>
        <p className="mb-1 text-xs font-medium" style={{ color: "#3D5775" }}>Stuck in stage (min days)</p>
        <input type="number" min={0} value={(draft.daysInStageMin as number) ?? ""}
          onChange={(e) => setDraft({ ...draft, daysInStageMin: e.target.value ? Number(e.target.value) : undefined })}
          className={inputCls} style={{ color: "#0F2540" }} />
      </div>
    );
  }

  return null;
}

// ── Active filter chips ───────────────────────────────────────────────────────

function buildChips(
  filters: AnyFilters,
  workspaces?: WsMeta[],
  tags?: TagMeta[],
  stages?: StageMeta[],
): { key: string; label: string; remove: () => AnyFilters }[] {
  const f = filters as Record<string, unknown>;
  const chips: { key: string; label: string; remove: () => AnyFilters }[] = [];

  if (f.q) chips.push({ key: "q", label: `"${f.q}"`, remove: () => ({ ...f, q: undefined }) as AnyFilters });

  if (Array.isArray(f.workspaceIds) && f.workspaceIds.length > 0) {
    const names = (f.workspaceIds as string[]).map((id) => workspaces?.find((w) => w.id === id)?.name ?? id);
    chips.push({ key: "workspaceIds", label: `Workspace: ${names.join(", ")}`,
      remove: () => ({ ...f, workspaceIds: undefined }) as AnyFilters });
  }

  if (Array.isArray(f.tagIds) && f.tagIds.length > 0) {
    const names = (f.tagIds as string[]).map((id) => tags?.find((t) => t.id === id)?.name ?? id);
    chips.push({ key: "tagIds", label: `Tags: ${names.join(", ")}`,
      remove: () => ({ ...f, tagIds: undefined, tagsLogic: undefined }) as AnyFilters });
  }

  if (Array.isArray(f.temperature) && f.temperature.length > 0)
    chips.push({ key: "temperature", label: `Temp: ${(f.temperature as string[]).join(", ")}`,
      remove: () => ({ ...f, temperature: undefined }) as AnyFilters });

  if (f.hasOpenTasks === true) chips.push({ key: "hasOpenTasks", label: "Has open tasks",
    remove: () => ({ ...f, hasOpenTasks: undefined }) as AnyFilters });

  if (f.hasOpenDeals === true) chips.push({ key: "hasOpenDeals", label: "Has open deals",
    remove: () => ({ ...f, hasOpenDeals: undefined }) as AnyFilters });

  if (f.createdAfter || f.createdBefore) {
    const parts = [];
    if (f.createdAfter)  parts.push(`after ${f.createdAfter}`);
    if (f.createdBefore) parts.push(`before ${f.createdBefore}`);
    chips.push({ key: "createdRange", label: `Created ${parts.join(" & ")}`,
      remove: () => ({ ...f, createdAfter: undefined, createdBefore: undefined }) as AnyFilters });
  }

  if (Array.isArray(f.taskTypes) && f.taskTypes.length > 0)
    chips.push({ key: "taskTypes", label: `Type: ${(f.taskTypes as string[]).join(", ")}`,
      remove: () => ({ ...f, taskTypes: undefined }) as AnyFilters });

  if (Array.isArray(f.priorities) && f.priorities.length > 0)
    chips.push({ key: "priorities", label: `Priority: ${(f.priorities as string[]).join(", ")}`,
      remove: () => ({ ...f, priorities: undefined }) as AnyFilters });

  if (f.status && f.status !== "all")
    chips.push({ key: "status", label: `Status: ${f.status}`,
      remove: () => ({ ...f, status: undefined }) as AnyFilters });

  if (f.dueWithin && f.dueWithin !== "all")
    chips.push({ key: "dueWithin", label: `Due: ${String(f.dueWithin).replace(/_/g, " ")}`,
      remove: () => ({ ...f, dueWithin: undefined }) as AnyFilters });

  if (f.hasReminder === true) chips.push({ key: "hasReminder", label: "Has reminder",
    remove: () => ({ ...f, hasReminder: undefined }) as AnyFilters });

  if (Array.isArray(f.stageIds) && f.stageIds.length > 0) {
    const names = (f.stageIds as string[]).map((id) => stages?.find((s) => s.id === id)?.name ?? id);
    chips.push({ key: "stageIds", label: `Stage: ${names.join(", ")}`,
      remove: () => ({ ...f, stageIds: undefined }) as AnyFilters });
  }

  if (typeof f.valueMin === "number" || typeof f.valueMax === "number") {
    const parts = [];
    if (typeof f.valueMin === "number") parts.push(`min $${f.valueMin.toLocaleString()}`);
    if (typeof f.valueMax === "number") parts.push(`max $${f.valueMax.toLocaleString()}`);
    chips.push({ key: "valueRange", label: `Value: ${parts.join(", ")}`,
      remove: () => ({ ...f, valueMin: undefined, valueMax: undefined }) as AnyFilters });
  }

  if (typeof f.daysInStageMin === "number")
    chips.push({ key: "daysInStageMin", label: `Stuck ≥${f.daysInStageMin}d`,
      remove: () => ({ ...f, daysInStageMin: undefined }) as AnyFilters });

  if (f.hasContact === true) chips.push({ key: "hasContact", label: "Has contact",
    remove: () => ({ ...f, hasContact: undefined }) as AnyFilters });

  return chips;
}

// ── Filter definitions per entity type ───────────────────────────────────────

function filterDefs(
  entityType: EntityType,
  workspaces?: WsMeta[],
  tags?: TagMeta[],
  stages?: StageMeta[],
): { key: string; label: string }[] {
  const common = [{ key: "q", label: "Search" }];

  if (entityType === "contact") {
    return [
      ...common,
      ...(workspaces && workspaces.length > 0 ? [{ key: "workspaceIds", label: "Workspace" }] : []),
      ...(tags && tags.length > 0 ? [{ key: "tagIds", label: "Tags" }] : []),
      { key: "temperature",  label: "Temperature" },
      { key: "hasOpenTasks", label: "Has open tasks" },
      { key: "hasOpenDeals", label: "Has open deals" },
      { key: "createdRange", label: "Created date" },
    ];
  }

  if (entityType === "task") {
    return [
      ...common,
      ...(workspaces && workspaces.length > 0 ? [{ key: "workspaceIds", label: "Workspace" }] : []),
      { key: "status",     label: "Status"    },
      { key: "priorities", label: "Priority"  },
      { key: "taskTypes",  label: "Task type" },
      { key: "dueWithin",  label: "Due date"  },
      { key: "hasReminder", label: "Has reminder" },
    ];
  }

  // deal
  return [
    ...common,
    ...(stages && stages.length > 0 ? [{ key: "stageIds", label: "Stage" }] : []),
    { key: "valueRange",    label: "Value range"  },
    { key: "daysInStageMin", label: "Stuck deals" },
    { key: "hasContact",    label: "Has contact"  },
    { key: "createdRange",  label: "Created date" },
  ];
}

// ── FilterBar ─────────────────────────────────────────────────────────────────

export function FilterBar({ entityType, workspaces, tags, stages }: Props) {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const [popoverOpen, setPopoverOpen]   = useState(false);
  const [activeKey,   setActiveKey]     = useState<string | null>(null);
  const [draft,       setDraft]         = useState<Record<string, unknown>>({});
  const popoverRef = useRef<HTMLDivElement>(null);

  // Decode current filters
  const currentFilters: AnyFilters =
    entityType === "contact" ? decodeContactFilters(searchParams) :
    entityType === "task"    ? decodeTaskFilters(searchParams) :
                               decodeDealFilters(searchParams);

  const chips = buildChips(currentFilters, workspaces, tags, stages);
  const defs  = filterDefs(entityType, workspaces, tags, stages);

  function navigate(filters: AnyFilters) {
    const params = encodeFilters(filters);
    // preserve non-filter params (like view, tab)
    const view = searchParams.get("view");
    // Remove view when filters change manually
    if (view) params.delete("view");
    router.push(`?${params.toString()}`);
  }

  function removeChip(chip: ReturnType<typeof buildChips>[0]) {
    navigate(chip.remove());
  }

  function openFilter(key: string) {
    setActiveKey(key);
    // Pre-populate draft with existing value
    const f = currentFilters as Record<string, unknown>;
    const initial: Record<string, unknown> = {};
    if (key === "q" && f.q)             initial.q = f.q;
    if (key === "workspaceIds")          initial.workspaceIds = f.workspaceIds ?? [];
    if (key === "tagIds")                { initial.tagIds = f.tagIds ?? []; initial.tagsLogic = f.tagsLogic ?? "or"; }
    if (key === "temperature")           initial.temperature = f.temperature ?? [];
    if (key === "hasOpenTasks")          initial.hasOpenTasks = f.hasOpenTasks ?? false;
    if (key === "hasOpenDeals")          initial.hasOpenDeals = f.hasOpenDeals ?? false;
    if (key === "hasContact")            initial.hasContact = f.hasContact ?? false;
    if (key === "hasReminder")           initial.hasReminder = f.hasReminder ?? false;
    if (key === "createdRange")          { initial.createdAfter = f.createdAfter; initial.createdBefore = f.createdBefore; }
    if (key === "taskTypes")             initial.taskTypes = f.taskTypes ?? [];
    if (key === "priorities")            initial.priorities = f.priorities ?? [];
    if (key === "status")                initial.status = f.status ?? "open";
    if (key === "dueWithin")             initial.dueWithin = f.dueWithin ?? "";
    if (key === "stageIds")              initial.stageIds = f.stageIds ?? [];
    if (key === "valueRange")            { initial.valueMin = f.valueMin; initial.valueMax = f.valueMax; }
    if (key === "daysInStageMin")        initial.daysInStageMin = f.daysInStageMin;
    setDraft(initial);
  }

  function applyDraft() {
    const f = { ...currentFilters, ...draft } as AnyFilters;
    navigate(f);
    setPopoverOpen(false);
    setActiveKey(null);
    setDraft({});
  }

  function clearAll() {
    navigate({} as AnyFilters);
  }

  if (chips.length === 0 && !popoverOpen) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPopoverOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
          style={{ borderColor: "#E8DFC8", color: "#3D5775" }}
        >
          <Filter className="h-3.5 w-3.5" />
          Add filter
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Active chips */}
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onRemove={() => removeChip(chip)} />
      ))}

      {/* Add filter button + popover */}
      <div ref={popoverRef} className="relative">
        <button
          type="button"
          onClick={() => { setPopoverOpen((v) => !v); if (!popoverOpen) setActiveKey(null); }}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
          style={{ borderColor: "#E8DFC8", color: "#3D5775" }}
        >
          <Filter className="h-3.5 w-3.5" />
          Add filter
        </button>

        {popoverOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => { setPopoverOpen(false); setActiveKey(null); }} />
            <div className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-xl border bg-white shadow-xl"
              style={{ borderColor: "#E8DFC8" }}>
              {!activeKey ? (
                // Filter type list
                <ul className="py-1">
                  {defs.map(({ key, label }) => (
                    <li key={key}>
                      <button type="button" onClick={() => openFilter(key)}
                        className="flex w-full items-center justify-between px-4 py-2 text-sm text-left transition-colors hover:bg-[#E2F0EE]"
                        style={{ color: "#0F2540" }}>
                        {label}
                        <ChevronDown className="h-3.5 w-3.5 -rotate-90" style={{ color: "#3D5775" }} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                // Inline editor for selected filter type
                <div className="p-4">
                  <button type="button" onClick={() => setActiveKey(null)}
                    className="mb-3 flex items-center gap-1 text-xs hover:underline" style={{ color: "#1F8A8A" }}>
                    ← Back
                  </button>
                  <FilterPanel
                    filterKey={activeKey}
                    draft={draft}
                    setDraft={setDraft}
                    workspaces={workspaces}
                    tags={tags}
                    stages={stages}
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => { setPopoverOpen(false); setActiveKey(null); }}
                      className="rounded-md px-3 py-1.5 text-sm hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
                      Cancel
                    </button>
                    <button type="button" onClick={applyDraft}
                      className="rounded-md px-4 py-1.5 text-sm font-medium text-white"
                      style={{ background: "#1F8A8A" }}>
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Clear all */}
      {chips.length > 0 && (
        <button type="button" onClick={clearAll}
          className="rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-[#E2F0EE]"
          style={{ color: "#3D5775" }}>
          Clear all
        </button>
      )}
    </div>
  );
}
