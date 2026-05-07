"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Zap, Copy, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  seedRealEstatePack,
  deleteTemplate,
  duplicateTemplate,
  createTemplate,
} from "@/app/actions/task-templates";
import type { SerializedTemplate } from "@/app/actions/task-templates";

const APPLIES_TO_LABEL: Record<string, string> = {
  contact: "Contacts", deal: "Deals", both: "Both",
};

type Props = { initialTemplates: SerializedTemplate[] };

export function TemplateListClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<SerializedTemplate[]>(initialTemplates);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAppliesTo, setNewAppliesTo] = useState("both");
  const [, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await seedRealEstatePack();
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success(`Created ${result.templatesCreated} templates`);
        window.location.reload();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteTemplate(id);
      if ("error" in result) toast.error(result.error);
      else {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setDeletingId(null);
        toast.success("Template deleted");
      }
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateTemplate(id);
      if ("error" in result) toast.error(result.error);
      else {
        setTemplates((prev) => [...prev, result.template]);
        toast.success("Template duplicated");
      }
    });
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    startTransition(async () => {
      const result = await createTemplate({ name: newName.trim(), appliesTo: newAppliesTo });
      if ("error" in result) toast.error(result.error);
      else {
        setTemplates((prev) => [...prev, result.template]);
        setNewName(""); setShowCreateForm(false);
        toast.success("Template created");
        window.location.href = `/settings/task-templates/${result.template.id}`;
      }
    });
  }

  const selectCls = "rounded-md border border-[#E8DFC8] bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]";

  return (
    <div className="space-y-4">
      {/* Seed banner */}
      {templates.length === 0 && (
        <div className="flex items-center justify-between rounded-xl border border-[#D0E5E2] bg-[#E2F0EE] p-5">
          <div>
            <p className="font-semibold" style={{ color: "#0F2540" }}>No templates yet</p>
            <p className="text-sm" style={{ color: "#3D5775" }}>
              Start with the Real Estate template pack — 4 ready-to-use task lists.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSeed}
            className="flex items-center gap-2 rounded-md bg-[#1F8A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1A7575]"
          >
            <Zap className="h-4 w-4" />
            Apply Real Estate template pack
          </button>
        </div>
      )}

      {/* Template cards */}
      {templates.map((tmpl) => (
        <div
          key={tmpl.id}
          className="flex items-start justify-between gap-4 rounded-xl border bg-white p-5"
          style={{ borderColor: "#E8DFC8" }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold" style={{ color: "#0F2540" }}>{tmpl.name}</h3>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: "#E2F0EE", color: "#1F8A8A" }}
              >
                {APPLIES_TO_LABEL[tmpl.appliesTo] ?? tmpl.appliesTo}
              </span>
            </div>
            {tmpl.description && (
              <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>{tmpl.description}</p>
            )}
            <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>
              {tmpl.itemCount} task{tmpl.itemCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/settings/task-templates/${tmpl.id}`}
              className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-xs font-medium text-[#0F2540] hover:bg-[#F5EFE0]"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={() => handleDuplicate(tmpl.id)}
              title="Duplicate"
              className="rounded-md border border-[#E8DFC8] p-1.5 text-[#3D5775] hover:bg-[#F5EFE0]"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            {deletingId === tmpl.id ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "#3D5775" }}>Delete?</span>
                <button onClick={() => handleDelete(tmpl.id)} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes</button>
                <button onClick={() => setDeletingId(null)} className="text-xs" style={{ color: "#3D5775" }}>No</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setDeletingId(tmpl.id)}
                title="Delete"
                className="rounded-md border border-[#E8DFC8] p-1.5 text-[#3D5775] hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Create form / button */}
      {showCreateForm ? (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border bg-white p-5 space-y-3"
          style={{ borderColor: "#E8DFC8" }}
        >
          <p className="text-sm font-semibold" style={{ color: "#0F2540" }}>New template</p>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name"
            autoFocus
            className="w-full rounded-md border border-[#E8DFC8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
          />
          <select value={newAppliesTo} onChange={(e) => setNewAppliesTo(e.target.value)} className={selectCls}>
            <option value="both">Both contacts and deals</option>
            <option value="contact">Contacts only</option>
            <option value="deal">Deals only</option>
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={!newName.trim()}
              className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
              Create
            </button>
            <button type="button" onClick={() => setShowCreateForm(false)}
              className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-xs text-[#3D5775] hover:bg-[#F5EFE0]">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 text-sm font-medium"
          style={{ color: "#1F8A8A" }}
        >
          <Plus className="h-4 w-4" /> New template
        </button>
      )}
    </div>
  );
}
