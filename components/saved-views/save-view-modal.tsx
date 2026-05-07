"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createView, updateView } from "@/app/actions/saved-views";
import { encodeFilters } from "@/lib/saved-views/url-encoder";
import type { AnyFilters, EntityType } from "@/lib/saved-views/filter-types";
import type { SerializedView } from "@/app/actions/saved-views";

// ── Filter summary ────────────────────────────────────────────────────────────

function filterSummaryLines(filters: AnyFilters): string[] {
  const f = filters as Record<string, unknown>;
  const lines: string[] = [];
  if (f.q) lines.push(`Search: "${f.q}"`);
  if (Array.isArray(f.workspaceIds) && f.workspaceIds.length > 0)
    lines.push(`Workspaces: ${f.workspaceIds.length} selected`);
  if (Array.isArray(f.tagIds) && f.tagIds.length > 0)
    lines.push(`Tags: ${f.tagIds.length} selected (${f.tagsLogic === "and" ? "all match" : "any match"})`);
  if (Array.isArray(f.temperature) && f.temperature.length > 0)
    lines.push(`Temperature: ${(f.temperature as string[]).join(", ")}`);
  if (f.hasOpenTasks === true)  lines.push("Has open tasks");
  if (f.hasOpenDeals === true)  lines.push("Has open deals");
  if (f.hasContact   === true)  lines.push("Has contact linked");
  if (f.hasReminder  === true)  lines.push("Has reminder");
  if (f.createdAfter || f.createdBefore) {
    const parts = [];
    if (f.createdAfter)  parts.push(`after ${f.createdAfter}`);
    if (f.createdBefore) parts.push(`before ${f.createdBefore}`);
    lines.push(`Created ${parts.join(" and ")}`);
  }
  if (Array.isArray(f.taskTypes) && f.taskTypes.length > 0)
    lines.push(`Type: ${(f.taskTypes as string[]).join(", ")}`);
  if (Array.isArray(f.priorities) && f.priorities.length > 0)
    lines.push(`Priority: ${(f.priorities as string[]).join(", ")}`);
  if (f.status && f.status !== "all") lines.push(`Status: ${f.status}`);
  if (f.dueWithin && f.dueWithin !== "all") lines.push(`Due: ${String(f.dueWithin).replace(/_/g, " ")}`);
  if (Array.isArray(f.stageIds) && f.stageIds.length > 0)
    lines.push(`Stages: ${f.stageIds.length} selected`);
  if (typeof f.valueMin === "number" || typeof f.valueMax === "number") {
    const parts = [];
    if (typeof f.valueMin === "number") parts.push(`min $${f.valueMin.toLocaleString()}`);
    if (typeof f.valueMax === "number") parts.push(`max $${f.valueMax.toLocaleString()}`);
    lines.push(`Value: ${parts.join(", ")}`);
  }
  if (typeof f.daysInStageMin === "number")
    lines.push(`Stuck ≥ ${f.daysInStageMin} days`);
  if (Array.isArray(f.contactTagIds) && f.contactTagIds.length > 0)
    lines.push(`Contact tags: ${f.contactTagIds.length} selected`);
  return lines;
}

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  mode: "create" | "edit";
  entityType: EntityType;
  currentFilters: AnyFilters;
  workspaces: { id: string; name: string; slug: string }[];
  existingView?: SerializedView;
  onClose: () => void;
  onSaved: (view: SerializedView) => void;
};

export function SaveViewModal({
  mode, entityType, currentFilters, workspaces, existingView, onClose, onSaved,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name,        setName]        = useState(existingView?.name ?? "");
  const [scope,       setScope]       = useState<"personal" | "shared">(
    (existingView?.scope as "personal" | "shared") ?? "personal",
  );
  const [workspaceId, setWorkspaceId] = useState<string>(existingView?.workspaceId ?? "");

  const summaryLines = filterSummaryLines(currentFilters);

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      const payload = {
        entityType,
        name: name.trim(),
        scope,
        filters: currentFilters,
        workspaceId: workspaceId || null,
      };

      let result: SerializedView | { error: string };
      if (mode === "edit" && existingView) {
        result = await updateView(existingView.id, payload);
      } else {
        result = await createView(payload);
      }

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(mode === "edit" ? "View updated" : "View saved");
      onSaved(result);
      onClose();

      // Navigate with the view's filters encoded
      const params = encodeFilters(currentFilters);
      params.set("view", result.id);
      router.push(`?${params.toString()}`);
    });
  }

  const inputCls = "w-full rounded-md border border-[#E8DFC8] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]";
  const selectCls = inputCls;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>
            {mode === "edit" ? "Edit view" : "Save view"}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>
              View name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. Hot leads this month`}
              autoFocus
              className={inputCls}
              style={{ color: "#0F2540" }}
            />
          </div>

          {/* Scope */}
          <div>
            <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Visibility</p>
            <div className="grid grid-cols-2 gap-2">
              {(["personal", "shared"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  className="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  style={{
                    borderColor: scope === s ? "#1F8A8A" : "#E8DFC8",
                    background:  scope === s ? "#E2F0EE" : "#fff",
                    color: "#0F2540",
                  }}
                >
                  <span className="font-medium">
                    {s === "personal" ? "Just me" : "Everyone"}
                  </span>
                  <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>
                    {s === "personal"
                      ? "Only visible to you"
                      : "Visible to your whole org"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Workspace */}
          {workspaces.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>
                Workspace (optional)
              </label>
              <select
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className={selectCls}
                style={{ color: "#0F2540" }}
              >
                <option value="">All workspaces</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filter summary */}
          {summaryLines.length > 0 && (
            <div className="rounded-lg border p-3" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A" }}>
                Active filters
              </p>
              <ul className="space-y-0.5">
                {summaryLines.map((line) => (
                  <li key={line} className="text-xs" style={{ color: "#3D5775" }}>• {line}</li>
                ))}
              </ul>
            </div>
          )}

          {summaryLines.length === 0 && (
            <p className="rounded-lg border border-dashed px-3 py-2.5 text-xs"
              style={{ borderColor: "#E8DFC8", color: "#3D5775" }}>
              No filters active — this view will show all {entityType}s.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "#E8DFC8" }}>
          <button type="button" onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
            style={{ color: "#3D5775" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={!name.trim() || pending}
            className="rounded-md px-4 py-1.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: "#1F8A8A" }}>
            {pending ? "Saving…" : "Save view"}
          </button>
        </div>
      </div>
    </div>
  );
}
