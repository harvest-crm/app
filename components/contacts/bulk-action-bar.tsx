"use client";

import { Tag, Building2, ListChecks, Trash2, X } from "lucide-react";

type Props = {
  count: number;
  onTag:       () => void;
  onWorkspace: () => void;
  onTemplate:  () => void;
  onDelete:    () => void;
  onClear:     () => void;
};

const Divider = () => (
  <div className="mx-2 h-6 w-px" style={{ background: "#E8DFC8" }} />
);

export function BulkActionBar({ count, onTag, onWorkspace, onTemplate, onDelete, onClear }: Props) {
  const btnBase =
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
  const actionBtn = `${btnBase} text-[#0F2540] hover:bg-[#E2F0EE]`;
  const deleteBtn = `${btnBase} text-red-600 hover:bg-red-50`;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transition-transform duration-200"
      style={{ transform: `translateX(-50%) translateY(${count > 0 ? "0" : "200%"})` }}
    >
      <div
        className="flex items-center rounded-xl border bg-white px-4 py-3 shadow-xl"
        style={{ borderColor: "#E8DFC8" }}
      >
        <span className="mr-4 text-sm font-medium" style={{ color: "#0F2540" }}>
          {count} selected
        </span>
        <Divider />

        <button type="button" onClick={onTag} className={actionBtn}>
          <Tag className="h-4 w-4" style={{ color: "#1F8A8A" }} />
          Tag
        </button>
        <button type="button" onClick={onWorkspace} className={actionBtn}>
          <Building2 className="h-4 w-4" style={{ color: "#1F8A8A" }} />
          Workspace
        </button>
        <button type="button" onClick={onTemplate} className={actionBtn}>
          <ListChecks className="h-4 w-4" style={{ color: "#1F8A8A" }} />
          Apply template
        </button>
        <button type="button" onClick={onDelete} className={deleteBtn}>
          <Trash2 className="h-4 w-4" />
          Delete
        </button>

        <Divider />
        <button type="button" onClick={onClear}
          className={`${btnBase} border border-[#E8DFC8] text-[#3D5775] hover:bg-[#F5EFE0]`}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
