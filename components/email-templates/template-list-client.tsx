"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Pencil, Copy, Trash2, Mail, Layers, User } from "lucide-react";
import { toast } from "sonner";
import {
  deleteEmailTemplate,
  duplicateEmailTemplate,
  createEmailTemplate,
  seedRealEstateEmailPack,
} from "@/app/actions/email-templates";
import type { SerializedEmailTemplate } from "@/app/actions/email-templates";

const APPLIES_CONFIG = {
  contact: { label: "Contact", icon: User,   bg: "#E2F0EE", color: "#1F8A8A" },
  deal:    { label: "Deal",    icon: Layers,  bg: "#EDE9FE", color: "#7C3AED" },
  both:    { label: "Both",    icon: Mail,    bg: "#F5EFE0", color: "#3D5775" },
} as const;

function AppliesToBadge({ appliesTo }: { appliesTo: string }) {
  const cfg = APPLIES_CONFIG[appliesTo as keyof typeof APPLIES_CONFIG] ?? APPLIES_CONFIG.both;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export function EmailTemplateListClient({
  initialTemplates,
}: {
  initialTemplates: SerializedEmailTemplate[];
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function handleDelete(id: string) {
    startTransition(async () => {
      const r = await deleteEmailTemplate(id);
      if ("error" in r) { toast.error(r.error); return; }
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
      setConfirmDelete(null);
    });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => {
      const r = await duplicateEmailTemplate(id);
      if ("error" in r) { toast.error(r.error); return; }
      setTemplates((prev) => [...prev, r]);
      toast.success("Template duplicated");
    });
  }

  function handleNew() {
    startTransition(async () => {
      const r = await createEmailTemplate({
        name: "Untitled template",
        subject: "",
        body: "",
        appliesTo: "contact",
      });
      if ("error" in r) { toast.error(r.error); return; }
      router.push(`/settings/email-templates/${r.id}`);
    });
  }

  function handleSeedPack() {
    startTransition(async () => {
      const r = await seedRealEstateEmailPack();
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(`Created ${r.templatesCreated} real estate templates`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 && (
        <div className="mb-6 rounded-xl border border-dashed p-6 text-center"
          style={{ borderColor: "#E8DFC8" }}>
          <Mail className="mx-auto mb-3 h-8 w-8" style={{ color: "#3D5775" }} />
          <p className="text-sm font-medium" style={{ color: "#0F2540" }}>No email templates yet</p>
          <p className="mt-1 text-xs mb-4" style={{ color: "#3D5775" }}>
            Start with the real estate pack or create your own.
          </p>
          <button type="button" onClick={handleSeedPack}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
            style={{ borderColor: "#1F8A8A", color: "#1F8A8A" }}>
            Apply real estate template pack
          </button>
        </div>
      )}

      {templates.map((t) => (
        <div key={t.id} className="group rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm"
          style={{ borderColor: "#E8DFC8" }}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold" style={{ color: "#0F2540" }}>{t.name}</h3>
                <AppliesToBadge appliesTo={t.appliesTo} />
              </div>
              {t.description && (
                <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>{t.description}</p>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button type="button" onClick={() => router.push(`/settings/email-templates/${t.id}`)}
                title="Edit" className="rounded p-1.5 hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => handleDuplicate(t.id)}
                title="Duplicate" className="rounded p-1.5 hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
                <Copy className="h-3.5 w-3.5" />
              </button>
              {confirmDelete === t.id ? (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => handleDelete(t.id)}
                    className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(null)}
                    className="rounded px-2 py-1 text-xs hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(t.id)}
                  title="Delete" className="rounded p-1.5 hover:bg-red-50" style={{ color: "#3D5775" }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-2 rounded-md p-3 space-y-1" style={{ background: "#F5EFE0" }}>
            <p className="text-xs font-medium" style={{ color: "#3D5775" }}>
              Subject: <span style={{ color: "#0F2540" }}>{t.subject || "(no subject)"}</span>
            </p>
            <p className="text-xs" style={{ color: "#3D5775" }}>
              {t.body.slice(0, 80)}{t.body.length > 80 ? "…" : ""}
            </p>
          </div>
        </div>
      ))}

      {/* New template button */}
      <button type="button" onClick={handleNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
        style={{ borderColor: "#E8DFC8", color: "#1F8A8A" }}>
        <Plus className="h-4 w-4" />
        New template
      </button>
    </div>
  );
}
