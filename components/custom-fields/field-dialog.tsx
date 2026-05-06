"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { createDefinition, updateDefinition } from "@/app/actions/custom-fields";
import { labelToKey } from "@/lib/format";
import type { SerializedFieldDef } from "@/app/actions/custom-fields";

const FIELD_TYPES = [
  { value: "text",        label: "Text" },
  { value: "number",      label: "Number" },
  { value: "date",        label: "Date" },
  { value: "select",      label: "Select (single)" },
  { value: "multiselect", label: "Multi-select" },
] as const;

type Props = {
  mode: "create" | "edit";
  def?: SerializedFieldDef;
  workspaceId: string;
  entityType: "contact" | "deal";
  onSaved: (def: SerializedFieldDef) => void;
  onClose: () => void;
};

export function FieldDialog({ mode, def, workspaceId, entityType, onSaved, onClose }: Props) {
  const [label,      setLabel]      = useState(def?.fieldLabel ?? "");
  const [fieldType,  setFieldType]  = useState(def?.fieldType  ?? "text");
  const [options,    setOptions]    = useState(def?.options.join(", ") ?? "");
  const [isRequired, setIsRequired] = useState(def?.isRequired ?? false);
  const [serverErr,  setServerErr]  = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewKey = labelToKey(label);
  const showOptions = fieldType === "select" || fieldType === "multiselect";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerErr(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("fieldLabel", label);
      fd.set("fieldType",  fieldType);
      fd.set("options",    options);
      fd.set("isRequired", String(isRequired));
      fd.set("workspaceId", workspaceId);
      fd.set("entityType",  entityType);

      const result =
        mode === "create"
          ? await createDefinition(fd)
          : await updateDefinition(def!.id, fd);

      if ("error" in result) {
        setServerErr(result.error);
      } else {
        onSaved(result.def);
        toast.success(mode === "create" ? "Field created" : "Field updated");
        onClose();
      }
    });
  }

  const inputCls =
    "w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {mode === "create" ? "Add custom field" : "Edit field"}
          </h2>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* Label */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Price Range Min"
              required
              autoFocus
              disabled={pending}
              className={inputCls}
            />
            {label && (
              <p className="text-xs text-slate-400">
                Stored as:{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5">{previewKey}</code>
              </p>
            )}
          </div>

          {/* Field type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Type
            </label>
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
              disabled={pending}
              className={`${inputCls} bg-white`}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Options (select / multiselect) */}
          {showOptions && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Options{" "}
                <span className="font-normal normal-case text-slate-400">(comma-separated)</span>
              </label>
              <textarea
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                rows={3}
                placeholder="Option A, Option B, Option C"
                disabled={pending}
                className={`${inputCls} resize-none`}
              />
            </div>
          )}

          {/* Required */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              disabled={pending}
              className="rounded border-slate-300"
            />
            <span className="text-sm text-slate-700">Required</span>
          </label>

          {serverErr && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{serverErr}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} disabled={pending}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={pending || !label.trim()}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-40">
              {pending ? "Saving…" : mode === "create" ? "Add field" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
