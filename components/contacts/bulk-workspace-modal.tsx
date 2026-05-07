"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bulkAssignWorkspace } from "@/app/actions/bulk-contacts";

type Workspace = { id: string; name: string; color: string };

type Props = {
  contactIds: string[];
  allWorkspaces: Workspace[];
  onClose: () => void;
};

export function BulkWorkspaceModal({ contactIds, allWorkspaces, onClose }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replace, setReplace] = useState(true);
  const [pending, startTransition] = useTransition();

  function handleApply() {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await bulkAssignWorkspace(contactIds, selectedId, replace);
      if ("error" in result) { toast.error(result.error); return; }
      const wsName = allWorkspaces.find((w) => w.id === selectedId)?.name ?? "";
      toast.success(`${result.assigned} contact${result.assigned !== 1 ? "s" : ""} assigned to ${wsName}`);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" style={{ border: "1px solid #E8DFC8" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>
            Assign {contactIds.length} contact{contactIds.length !== 1 ? "s" : ""} to workspace
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-[#3D5775] hover:bg-[#E2F0EE]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {allWorkspaces.length === 0 ? (
            <p className="text-sm" style={{ color: "#3D5775" }}>No workspaces available.</p>
          ) : (
            <div className="space-y-2">
              {allWorkspaces.map((ws) => (
                <label key={ws.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
                  style={{ borderColor: selectedId === ws.id ? "#1F8A8A" : "#E8DFC8", background: selectedId === ws.id ? "#E2F0EE" : "#FFFFFF" }}>
                  <input type="radio" name="workspace" value={ws.id} checked={selectedId === ws.id}
                    onChange={() => setSelectedId(ws.id)} className="sr-only" />
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: ws.color }} />
                  <span className="font-medium" style={{ color: "#0F2540" }}>{ws.name}</span>
                </label>
              ))}
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)}
              style={{ accentColor: "#1F8A8A" }} className="h-4 w-4 rounded" />
            <span className="text-sm" style={{ color: "#3D5775" }}>
              Replace existing workspace assignments
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <button onClick={onClose} className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm text-[#3D5775] hover:bg-[#F5EFE0]">
            Cancel
          </button>
          <button onClick={handleApply} disabled={!selectedId || pending}
            className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
            {pending ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
