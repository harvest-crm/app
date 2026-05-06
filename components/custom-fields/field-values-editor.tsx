"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { upsertFieldValue } from "@/app/actions/custom-fields";
import type { SerializedFieldDef } from "@/app/actions/custom-fields";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldGroup = {
  workspaceId: string;
  workspaceName: string;
  defs: SerializedFieldDef[];
};

type Props = {
  groups?: FieldGroup[];
  defs?: SerializedFieldDef[];
  initialValues: Record<string, unknown>;
  entityType: string;
  entityId: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toStringValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

function toArrayValue(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  return [];
}

const inputCls =
  "w-full rounded-md border border-stone-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── FieldInput ────────────────────────────────────────────────────────────────

function FieldInput({
  def,
  value,
  onChange,
  onSave,
  isSaved,
}: {
  def: SerializedFieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  onSave: (v: unknown) => void;
  isSaved: boolean;
}) {
  const label = (
    <div className="flex items-center gap-1 mb-1">
      <span className="text-xs font-medium text-stone-600">{def.fieldLabel}</span>
      {def.isRequired && <span className="text-red-500">*</span>}
      {isSaved && (
        <span className="ml-auto text-xs text-emerald-500">Saved</span>
      )}
    </div>
  );

  if (def.fieldType === "multiselect") {
    const selected = toArrayValue(value);
    return (
      <div>
        {label}
        <div className="space-y-1.5">
          {def.options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((v) => v !== opt);
                  onChange(next);
                  onSave(next);
                }}
                className="rounded border-stone-300"
              />
              <span className="text-sm text-stone-700">{opt}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (def.fieldType === "select") {
    return (
      <div>
        {label}
        <select
          value={toStringValue(value)}
          onChange={(e) => {
            onChange(e.target.value);
            onSave(e.target.value);
          }}
          className={`${inputCls} bg-white`}
        >
          <option value="">— None —</option>
          {def.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (def.fieldType === "number") {
    return (
      <div>
        {label}
        <input
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          onBlur={(e) => onSave(e.target.value === "" ? null : Number(e.target.value))}
          step="any"
          className={cn(inputCls, def.isRequired && !value && "border-red-300")}
        />
      </div>
    );
  }

  if (def.fieldType === "date") {
    return (
      <div>
        {label}
        <input
          type="date"
          value={toStringValue(value)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onSave(e.target.value || null)}
          className={cn(inputCls, def.isRequired && !value && "border-red-300")}
        />
      </div>
    );
  }

  // text (default)
  return (
    <div>
      {label}
      <input
        type="text"
        value={toStringValue(value)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onSave(e.target.value || null)}
        className={cn(inputCls, def.isRequired && !value && "border-red-300")}
      />
    </div>
  );
}

// ── FieldValuesEditor ─────────────────────────────────────────────────────────

export function FieldValuesEditor({
  groups,
  defs: flatDefs,
  initialValues,
  entityType,
  entityId,
}: Props) {
  const [values, setValues] = useState<Record<string, unknown>>(initialValues);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  function flashSaved(defId: string) {
    setSavedIds((prev) => new Set(prev).add(defId));
    setTimeout(() => {
      setSavedIds((prev) => {
        const s = new Set(prev);
        s.delete(defId);
        return s;
      });
    }, 1500);
  }

  async function save(def: SerializedFieldDef, v: unknown) {
    const fd = new FormData();
    fd.set("definitionId", def.id);
    fd.set("entityType", entityType);
    fd.set("entityId", entityId);
    fd.set("value", JSON.stringify(v));
    const result = await upsertFieldValue(fd);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      flashSaved(def.id);
    }
  }

  function renderDef(def: SerializedFieldDef) {
    return (
      <FieldInput
        key={def.id}
        def={def}
        value={values[def.id]}
        onChange={(v) => setValues((prev) => ({ ...prev, [def.id]: v }))}
        onSave={(v) => save(def, v)}
        isSaved={savedIds.has(def.id)}
      />
    );
  }

  // Flat mode
  if (!groups) {
    const allDefs = flatDefs ?? [];
    if (allDefs.length === 0) return null;
    return (
      <div className="grid grid-cols-2 gap-4">
        {allDefs.map(renderDef)}
      </div>
    );
  }

  // Grouped mode (contact page — multiple workspaces)
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.workspaceId}>
          {groups.length > 1 && (
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
              {g.workspaceName}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {g.defs.map(renderDef)}
          </div>
        </div>
      ))}
    </div>
  );
}
