"use client";

import { useState, useTransition } from "react";
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown,
  FileText, Hash, Calendar, List, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteDefinition, reorderDefinitions } from "@/app/actions/custom-fields";
import { FieldDialog } from "./field-dialog";
import type { SerializedFieldDef } from "@/app/actions/custom-fields";

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
  text:        FileText,
  number:      Hash,
  date:        Calendar,
  select:      List,
  multiselect: ListChecks,
};

const TYPE_LABEL: Record<string, string> = {
  text:        "Text",
  number:      "Number",
  date:        "Date",
  select:      "Select",
  multiselect: "Multi-select",
};

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  workspaceId: string;
  initialContactDefs: SerializedFieldDef[];
  initialDealDefs: SerializedFieldDef[];
};

export function FieldDefinitionManager({ workspaceId, initialContactDefs, initialDealDefs }: Props) {
  const [tab,         setTab]         = useState<"contact" | "deal">("contact");
  const [contactDefs, setContactDefs] = useState<SerializedFieldDef[]>(initialContactDefs);
  const [dealDefs,    setDealDefs]    = useState<SerializedFieldDef[]>(initialDealDefs);
  const [dialogMode,  setDialogMode]  = useState<"create" | "edit" | null>(null);
  const [editingDef,  setEditingDef]  = useState<SerializedFieldDef | null>(null);
  const [deletingId,  setDeletingId]  = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const defs   = tab === "contact" ? contactDefs : dealDefs;
  const setDefs = tab === "contact" ? setContactDefs : setDealDefs;

  function handleSaved(def: SerializedFieldDef) {
    setDefs((prev) => {
      const existing = prev.findIndex((d) => d.id === def.id);
      return existing >= 0
        ? prev.map((d) => (d.id === def.id ? def : d))
        : [...prev, def].sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  function handleDelete(defId: string) {
    startTransition(async () => {
      const result = await deleteDefinition(defId);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setDefs((prev) => prev.filter((d) => d.id !== defId));
        setDeletingId(null);
        const msg = result.affected > 0
          ? `Field deleted (${result.affected} value${result.affected !== 1 ? "s" : ""} removed)`
          : "Field deleted";
        toast.success(msg);
      }
    });
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...defs];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setDefs(next);
    startTransition(async () => {
      await reorderDefinitions(workspaceId, tab, next.map((d) => d.id));
    });
  }

  function moveDown(idx: number) {
    if (idx === defs.length - 1) return;
    const next = [...defs];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setDefs(next);
    startTransition(async () => {
      await reorderDefinitions(workspaceId, tab, next.map((d) => d.id));
    });
  }

  return (
    <div>
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border bg-white p-1 w-fit">
        {(["contact", "deal"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
            )}
          >
            {t === "contact" ? "Contact Fields" : "Deal Fields"}
          </button>
        ))}
      </div>

      {/* Header row */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {defs.length === 0 ? "No fields yet." : `${defs.length} field${defs.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => { setEditingDef(null); setDialogMode("create"); }}
          className="flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900"
        >
          <Plus className="h-4 w-4" />
          Add field
        </button>
      </div>

      {/* Field list */}
      {defs.length > 0 && (
        <div className="divide-y rounded-xl border bg-white">
          {defs.map((def, idx) => {
            const Icon = TYPE_ICON[def.fieldType] ?? FileText;
            const isDeleting = deletingId === def.id;

            return (
              <div key={def.id} className="flex items-center gap-3 px-4 py-3">
                {/* Up/down */}
                <div className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-20"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === defs.length - 1}
                    className="rounded p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-20"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
                  <Icon className="h-4 w-4 text-slate-500" />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{def.fieldLabel}</span>
                    {def.isRequired && (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-600">
                        Required
                      </span>
                    )}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      {TYPE_LABEL[def.fieldType] ?? def.fieldType}
                    </span>
                  </div>
                  {def.options.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {def.options.join(" · ")}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-slate-300">
                    <code>{def.fieldKey}</code>
                  </p>
                </div>

                {/* Actions */}
                {isDeleting ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-slate-500">Delete?</span>
                    <button
                      onClick={() => handleDelete(def.id)}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => { setEditingDef(def); setDialogMode("edit"); }}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(def.id)}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {defs.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center">
          <p className="text-sm text-slate-500">
            No {tab === "contact" ? "contact" : "deal"} fields yet.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Click &ldquo;Add field&rdquo; to create your first custom field.
          </p>
        </div>
      )}

      {/* Dialog */}
      {dialogMode && (
        <FieldDialog
          mode={dialogMode}
          def={dialogMode === "edit" ? (editingDef ?? undefined) : undefined}
          workspaceId={workspaceId}
          entityType={tab}
          onSaved={handleSaved}
          onClose={() => setDialogMode(null)}
        />
      )}
    </div>
  );
}
