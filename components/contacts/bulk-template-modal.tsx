"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bulkApplyTemplate } from "@/app/actions/bulk-contacts";
import { listApplicableTemplates } from "@/app/actions/task-templates";
import type { SerializedTemplate } from "@/app/actions/task-templates";

type Props = {
  contactIds: string[];
  onClose: () => void;
};

export function BulkTemplateModal({ contactIds, onClose }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<SerializedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    listApplicableTemplates("contact").then((ts) => {
      setTemplates(ts);
      setLoading(false);
    });
  }, []);

  const selected = templates.find((t) => t.id === selectedId);
  const totalTasks = selected ? selected.itemCount * contactIds.length : 0;

  function handleApply() {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await bulkApplyTemplate(contactIds, selectedId);
      if ("error" in result) { toast.error(result.error); return; }
      toast.success(`${result.tasksCreated} tasks created across ${result.contactsProcessed} contacts`);
      if (result.errors > 0) toast.error(`${result.errors} contacts had errors`);
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
            Apply template to {contactIds.length} contact{contactIds.length !== 1 ? "s" : ""}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-[#3D5775] hover:bg-[#E2F0EE]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <p className="text-sm" style={{ color: "#3D5775" }}>Loading templates…</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: "#3D5775" }}>No contact templates found.</p>
              <a href="/settings/task-templates" className="text-xs hover:underline" style={{ color: "#1F8A8A" }}>
                Create a template →
              </a>
            </div>
          ) : (
            templates.map((tmpl) => (
              <button key={tmpl.id} type="button" onClick={() => setSelectedId(tmpl.id)}
                className="w-full rounded-lg border p-3 text-left transition-colors"
                style={{ borderColor: selectedId === tmpl.id ? "#1F8A8A" : "#E8DFC8", background: selectedId === tmpl.id ? "#E2F0EE" : "#FFFFFF" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm" style={{ color: "#0F2540" }}>{tmpl.name}</span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
                    {tmpl.itemCount} tasks
                  </span>
                </div>
                {tmpl.description && (
                  <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>{tmpl.description}</p>
                )}
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="border-t px-5 py-2" style={{ borderColor: "#E8DFC8" }}>
            <p className="text-xs" style={{ color: "#3D5775" }}>
              This will create {selected.itemCount} × {contactIds.length} = <strong>{totalTasks} tasks</strong>.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <button onClick={onClose} className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm text-[#3D5775] hover:bg-[#F5EFE0]">
            Cancel
          </button>
          <button onClick={handleApply} disabled={!selectedId || pending}
            className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
            {pending ? "Applying…" : "Apply template"}
          </button>
        </div>
      </div>
    </div>
  );
}
