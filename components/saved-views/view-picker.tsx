"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Pin, Pencil, Trash2, Copy, BookMarked } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteView, togglePin, duplicateView, createSuggestedViews } from "@/app/actions/saved-views";
import { encodeFilters } from "@/lib/saved-views/url-encoder";
import { SaveViewModal } from "./save-view-modal";
import type { SerializedView } from "@/app/actions/saved-views";
import type { AnyFilters, EntityType } from "@/lib/saved-views/filter-types";

type Props = {
  entityType: EntityType;
  initialViews: SerializedView[];
  currentFilters: AnyFilters;
  workspaces: { id: string; name: string; slug: string }[];
  defaultLabel: string;
};

export function ViewPicker({
  entityType, initialViews, currentFilters, workspaces, defaultLabel,
}: Props) {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const [open,      setOpen]     = useState(false);
  const [views,     setViews]    = useState<SerializedView[]>(initialViews);
  const [saveModal, setSaveModal] = useState<{ mode: "create" | "edit"; view?: SerializedView } | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const activeViewId = searchParams.get("view");
  const activeView   = views.find((v) => v.id === activeViewId);

  function selectView(view: SerializedView | null) {
    setOpen(false);
    if (!view) {
      router.push(window.location.pathname);
      return;
    }
    const params = encodeFilters(view.filters);
    params.set("view", view.id);
    router.push(`?${params.toString()}`);
  }

  function handleDelete(view: SerializedView) {
    startTransition(async () => {
      const r = await deleteView(view.id);
      if ("error" in r) { toast.error(r.error); return; }
      setViews((prev) => prev.filter((v) => v.id !== view.id));
      toast.success("View deleted");
      if (activeViewId === view.id) router.push(window.location.pathname);
    });
  }

  function handlePin(view: SerializedView) {
    startTransition(async () => {
      const r = await togglePin(view.id);
      if ("error" in r) { toast.error(r.error); return; }
      setViews((prev) => prev.map((v) => v.id === r.id ? r : v).sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      }));
    });
  }

  function handleDuplicate(view: SerializedView) {
    startTransition(async () => {
      const r = await duplicateView(view.id);
      if ("error" in r) { toast.error(r.error); return; }
      setViews((prev) => [...prev, r]);
      toast.success(`Duplicated "${view.name}"`);
    });
  }

  function handleSuggest() {
    startTransition(async () => {
      const r = await createSuggestedViews(entityType);
      toast.success(`Created ${r.created} suggested views`);
      router.refresh();
      setOpen(false);
    });
  }

  const pinned   = views.filter((v) => v.isPinned);
  const personal = views.filter((v) => !v.isPinned && v.scope === "personal");
  const shared   = views.filter((v) => !v.isPinned && v.scope === "shared");

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
          style={{ borderColor: "#E8DFC8", color: "#0F2540" }}
        >
          <BookMarked className="h-3.5 w-3.5 shrink-0" style={{ color: "#1F8A8A" }} />
          <span className="max-w-40 truncate">{activeView?.name ?? defaultLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" style={{ color: "#3D5775" }} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div
              className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-xl border bg-white shadow-xl"
              style={{ borderColor: "#E8DFC8" }}
            >
              {/* Default row */}
              <button
                type="button"
                onClick={() => selectView(null)}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#E2F0EE]",
                  !activeViewId && "bg-[#E2F0EE] font-medium",
                )}
                style={{ color: "#0F2540" }}
              >
                {defaultLabel}
              </button>

              {views.length === 0 ? (
                <div className="border-t px-4 py-3 text-center" style={{ borderColor: "#E8DFC8" }}>
                  <p className="text-xs" style={{ color: "#3D5775" }}>No saved views yet.</p>
                  <button
                    type="button"
                    onClick={handleSuggest}
                    className="mt-1 text-xs font-medium hover:underline"
                    style={{ color: "#1F8A8A" }}
                  >
                    Create suggested views →
                  </button>
                </div>
              ) : (
                <>
                  {pinned.length > 0 && (
                    <ViewSection label="Pinned" views={pinned} activeId={activeViewId}
                      onSelect={selectView} onPin={handlePin} onEdit={(v) => { setSaveModal({ mode: "edit", view: v }); setOpen(false); }}
                      onDuplicate={handleDuplicate} onDelete={handleDelete} />
                  )}
                  {personal.length > 0 && (
                    <ViewSection label="Personal" views={personal} activeId={activeViewId}
                      onSelect={selectView} onPin={handlePin} onEdit={(v) => { setSaveModal({ mode: "edit", view: v }); setOpen(false); }}
                      onDuplicate={handleDuplicate} onDelete={handleDelete} />
                  )}
                  {shared.length > 0 && (
                    <ViewSection label="Shared" views={shared} activeId={activeViewId}
                      onSelect={selectView} onPin={handlePin} onEdit={(v) => { setSaveModal({ mode: "edit", view: v }); setOpen(false); }}
                      onDuplicate={handleDuplicate} onDelete={handleDelete} />
                  )}
                </>
              )}

              {/* Footer */}
              <div className="border-t p-2" style={{ borderColor: "#E8DFC8" }}>
                <button
                  type="button"
                  onClick={() => { setSaveModal({ mode: "create" }); setOpen(false); }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
                  style={{ color: "#1F8A8A" }}
                >
                  + Save current view
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {saveModal && (
        <SaveViewModal
          mode={saveModal.mode}
          entityType={entityType}
          currentFilters={saveModal.mode === "edit" && saveModal.view ? saveModal.view.filters : currentFilters}
          workspaces={workspaces}
          existingView={saveModal.view}
          onClose={() => setSaveModal(null)}
          onSaved={(v) => {
            setViews((prev) => {
              const idx = prev.findIndex((x) => x.id === v.id);
              return idx >= 0 ? prev.map((x) => x.id === v.id ? v : x) : [...prev, v];
            });
          }}
        />
      )}
    </>
  );
}

// ── ViewSection ───────────────────────────────────────────────────────────────

function ViewSection({
  label, views, activeId, onSelect, onPin, onEdit, onDuplicate, onDelete,
}: {
  label: string;
  views: SerializedView[];
  activeId: string | null;
  onSelect: (v: SerializedView) => void;
  onPin:    (v: SerializedView) => void;
  onEdit:   (v: SerializedView) => void;
  onDuplicate: (v: SerializedView) => void;
  onDelete: (v: SerializedView) => void;
}) {
  return (
    <div className="border-t" style={{ borderColor: "#E8DFC8" }}>
      <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A" }}>
        {label}
      </p>
      {views.map((v) => (
        <div
          key={v.id}
          className={cn(
            "group flex items-center gap-1 px-2 py-1 transition-colors hover:bg-[#E2F0EE]",
            activeId === v.id && "bg-[#E2F0EE]",
          )}
        >
          <button
            type="button"
            onClick={() => onSelect(v)}
            className="min-w-0 flex-1 truncate py-1 pl-2 text-left text-sm"
            style={{ color: "#0F2540", fontWeight: activeId === v.id ? 500 : 400 }}
          >
            {v.name}
          </button>

          {/* Scope badge */}
          <span className="shrink-0 rounded px-1.5 py-0.5 text-xs"
            style={v.scope === "shared"
              ? { background: "#E2F0EE", color: "#1F8A8A" }
              : { background: "#F5EFE0", color: "#3D5775" }}>
            {v.scope === "shared" ? "Shared" : "Personal"}
          </span>

          {/* Actions (show on hover) */}
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button type="button" onClick={() => onPin(v)} title={v.isPinned ? "Unpin" : "Pin"}
              className="rounded p-1 hover:bg-white" style={{ color: v.isPinned ? "#1F8A8A" : "#3D5775" }}>
              <Pin className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => onEdit(v)} title="Edit"
              className="rounded p-1 hover:bg-white" style={{ color: "#3D5775" }}>
              <Pencil className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => onDuplicate(v)} title="Duplicate"
              className="rounded p-1 hover:bg-white" style={{ color: "#3D5775" }}>
              <Copy className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => onDelete(v)} title="Delete"
              className="rounded p-1 hover:bg-red-50" style={{ color: "#3D5775" }}>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
