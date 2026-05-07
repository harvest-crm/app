"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ListChecks, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { listApplicableTemplates, applyTemplateToEntity } from "@/app/actions/task-templates";
import type { SerializedTemplate } from "@/app/actions/task-templates";

type Props = {
  contactId?: string;
  dealId?: string;
};

export function ApplyTemplateButton({ contactId, dealId }: Props) {
  const [open,      setOpen]      = useState(false);
  const [templates, setTemplates] = useState<SerializedTemplate[]>([]);
  const [loaded,    setLoaded]    = useState(false);
  const [applying,  setApplying]  = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  const entityType = contactId ? "contact" : "deal";
  const entityId   = contactId ?? dealId ?? "";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!loaded) {
      const result = await listApplicableTemplates(entityType);
      setTemplates(result);
      setLoaded(true);
    }
  }

  function handleApply(tmpl: SerializedTemplate) {
    if (applying) return;
    setApplying(tmpl.id);
    startTransition(async () => {
      const result = await applyTemplateToEntity(tmpl.id, entityType, entityId);
      setApplying(null);
      setOpen(false);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(
          `Applied "${tmpl.name}" — ${result.tasksCreated} task${result.tasksCreated !== 1 ? "s" : ""} created`,
        );
      }
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md border border-[#E8DFC8] bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
        style={{ color: "#0F2540" }}
      >
        <ListChecks className="h-4 w-4" style={{ color: "#1F8A8A" }} />
        Apply template
        <ChevronDown className="h-3.5 w-3.5" style={{ color: "#3D5775" }} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border bg-white shadow-xl"
          style={{ borderColor: "#E8DFC8" }}
        >
          {!loaded ? (
            <p className="px-4 py-3 text-sm" style={{ color: "#3D5775" }}>Loading…</p>
          ) : templates.length === 0 ? (
            <div className="px-4 py-4 text-center">
              <p className="text-sm" style={{ color: "#3D5775" }}>No templates available.</p>
              <a
                href="/settings/task-templates"
                className="mt-1 block text-xs hover:underline"
                style={{ color: "#1F8A8A" }}
              >
                Create a template →
              </a>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {templates.map((tmpl) => (
                <li key={tmpl.id}>
                  <button
                    type="button"
                    onClick={() => handleApply(tmpl)}
                    disabled={!!applying}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#E2F0EE] disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" style={{ color: "#0F2540" }}>
                        {tmpl.name}
                      </p>
                      <p className="text-xs" style={{ color: "#3D5775" }}>
                        {tmpl.itemCount} task{tmpl.itemCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold"
                      style={{ background: "#E2F0EE", color: "#1F8A8A" }}
                    >
                      {applying === tmpl.id ? "Applying…" : "Apply"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
