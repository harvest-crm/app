"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bulkDeleteContacts } from "@/app/actions/bulk-contacts";

type Props = {
  contactIds: string[];
  onClose: () => void;
};

export function BulkDeleteModal({ contactIds, onClose }: Props) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();

  const n = contactIds.length;
  const confirmed = confirmText === "DELETE";

  function handleDelete() {
    if (!confirmed) return;
    startTransition(async () => {
      const result = await bulkDeleteContacts(contactIds);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(`${result.deleted} contact${result.deleted !== 1 ? "s" : ""} deleted`);
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" style={{ border: "1px solid #E8DFC8" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="text-base font-semibold text-red-700">Delete {n} contact{n !== 1 ? "s" : ""}?</h2>
          <button onClick={onClose} className="rounded-md p-1 text-[#3D5775] hover:bg-[#E2F0EE]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <p className="text-sm" style={{ color: "#3D5775" }}>
            This permanently removes <strong>{n} contact{n !== 1 ? "s" : ""}</strong> and all their associated
            tags and workspace assignments. Tasks, activities, and deals will have their contact reference
            cleared but will not be deleted. This cannot be undone.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>
              Type DELETE to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-[#E8DFC8] px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <button onClick={onClose} className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm text-[#3D5775] hover:bg-[#F5EFE0]">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={!confirmed || pending}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40">
            {pending ? "Deleting…" : `Delete ${n} contact${n !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
