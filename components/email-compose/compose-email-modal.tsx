"use client";

import { useRef, useState, useTransition } from "react";
import { useUser } from "@clerk/nextjs";
import { X, Mail, ChevronDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { listEmailTemplates } from "@/app/actions/email-templates";
import { logEmailSent } from "@/app/actions/email-compose";
import { renderTemplate } from "@/lib/email-templates/render-template";
import type { SerializedEmailTemplate } from "@/app/actions/email-templates";
import type { RenderContext } from "@/lib/email-templates/render-template";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  context: "contact" | "deal";
  contactId?: string;
  contactName?: string;
  contactEmail?: string | null;
  dealId?: string;
  dealTitle?: string;
  dealValue?: number | null;
  workspaceId?: string;
  onClose: () => void;
};

// ── Template picker dropdown ──────────────────────────────────────────────────

function TemplatePicker({
  context, onSelect,
}: {
  context: "contact" | "deal";
  onSelect: (t: SerializedEmailTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<SerializedEmailTemplate[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!loaded) {
      const rows = await listEmailTemplates(context);
      setTemplates(rows);
      setLoaded(true);
    }
  }

  return (
    <div className="relative">
      <button type="button" onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
        style={{ borderColor: "#E8DFC8", color: "#0F2540" }}>
        Use template
        <ChevronDown className="h-3.5 w-3.5" style={{ color: "#3D5775" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-[70] mt-1 w-72 overflow-hidden rounded-xl border bg-white shadow-xl"
            style={{ borderColor: "#E8DFC8" }}>
            {!loaded ? (
              <p className="px-4 py-3 text-sm" style={{ color: "#3D5775" }}>Loading…</p>
            ) : templates.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm" style={{ color: "#3D5775" }}>No templates available.</p>
                <a href="/settings/email-templates" className="mt-1 block text-xs hover:underline"
                  style={{ color: "#1F8A8A" }}>Create templates →</a>
              </div>
            ) : (
              <ul className="divide-y max-h-60 overflow-y-auto" style={{ borderColor: "#E8DFC8" }}>
                {templates.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => { onSelect(t); setOpen(false); }}
                      className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-[#E2F0EE]">
                      <span className="text-sm font-medium" style={{ color: "#0F2540" }}>{t.name}</span>
                      <span className="text-xs truncate" style={{ color: "#3D5775" }}>{t.subject}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── ComposeEmailModal ─────────────────────────────────────────────────────────

export function ComposeEmailModal({
  context, contactId, contactName, contactEmail, dealId, dealTitle, dealValue, workspaceId, onClose,
}: Props) {
  const { user } = useUser();
  const [, startTransition] = useTransition();

  const [to,      setTo]      = useState(contactEmail ?? "");
  const [subject, setSubject] = useState("");
  const [body,    setBody]    = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const userPhone = (user?.publicMetadata?.phone as string | undefined) ??
                    user?.phoneNumbers?.[0]?.phoneNumber ?? "";

  const renderCtx: RenderContext = {
    contact: {
      firstName: contactName?.split(" ")[0] ?? "",
      lastName:  contactName?.split(" ").slice(1).join(" ") ?? "",
      email:     contactEmail ?? "",
    },
    deal: dealId ? { title: dealTitle, value: dealValue } : undefined,
    user: {
      firstName: user?.firstName ?? "",
      lastName:  user?.lastName  ?? "",
      email:     user?.primaryEmailAddress?.emailAddress ?? "",
      phone:     userPhone,
    },
  };

  function applyTemplate(t: SerializedEmailTemplate) {
    const hadContent = subject.trim() || body.trim();
    if (hadContent) {
      const ok = window.confirm("Replace current subject and body with this template?");
      if (!ok) return;
    }
    const rendered = renderTemplate({ subject: t.subject, body: t.body }, renderCtx);
    setSubject(rendered.subject);
    setBody(rendered.body);
  }

  function handleOpenMailApp() {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setTimeout(() => setShowConfirm(true), 500);
  }

  function handleLogAndClose() {
    startTransition(async () => {
      const r = await logEmailSent({
        contactId, dealId, workspaceId,
        to: to.trim(),
        subject: subject.trim(),
        bodyPreview: body.slice(0, 200),
      });
      if ("error" in r) toast.error(r.error);
      else toast.success("Email logged");
      onClose();
    });
  }

  const hasEmail = !!to.trim();
  const canSend  = hasEmail && !!subject.trim() && !!body.trim();
  const hasVars  = body.includes("{{") || subject.includes("{{");

  const fromLine = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() + ` <${user.primaryEmailAddress?.emailAddress ?? ""}>`
    : "Loading…";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" style={{ color: "#1F8A8A" }} />
            <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>Compose email</h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-0 divide-y" style={{ borderColor: "#E8DFC8" }}>
            {/* From */}
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="w-14 shrink-0 text-xs font-medium" style={{ color: "#3D5775" }}>From</span>
              <span className="text-sm" style={{ color: "#0F2540" }}>{fromLine}</span>
            </div>

            {/* To */}
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="w-14 shrink-0 text-xs font-medium" style={{ color: "#3D5775" }}>To</span>
              {!hasEmail && !contactEmail ? (
                <div className="flex items-center gap-1.5 text-sm text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Contact has no email — add one first
                </div>
              ) : (
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@email.com"
                  className="flex-1 text-sm focus:outline-none"
                  style={{ color: "#0F2540" }}
                />
              )}
            </div>

            {/* Template picker + subject */}
            <div className="px-5 py-3 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-medium" style={{ color: "#3D5775" }}>Template</span>
                <TemplatePicker context={context} onSelect={applyTemplate} />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-medium" style={{ color: "#3D5775" }}>Subject</span>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="flex-1 text-sm focus:outline-none"
                  style={{ color: "#0F2540" }}
                />
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-3">
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message…"
                rows={12}
                className="w-full resize-y text-sm focus:outline-none"
                style={{ color: "#0F2540" }}
              />
              {hasVars && (
                <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>
                  Variables like <code className="rounded px-1" style={{ background: "#F5EFE0" }}>{"{{contact.firstName}}"}</code> will be replaced when you click &ldquo;Open in mail app.&rdquo;
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation strip */}
        {showConfirm && (
          <div className="shrink-0 border-t px-5 py-3" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
            <p className="mb-2 text-sm font-medium" style={{ color: "#0F2540" }}>Did you send this email?</p>
            <div className="flex gap-2">
              <button type="button" onClick={handleLogAndClose}
                className="rounded-md px-4 py-1.5 text-sm font-medium text-white"
                style={{ background: "#1F8A8A" }}>
                Yes, log it
              </button>
              <button type="button" onClick={onClose}
                className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
                style={{ color: "#3D5775" }}>
                No, just close
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {!showConfirm && (
          <div className="flex shrink-0 items-center justify-end gap-2 border-t px-5 py-3"
            style={{ borderColor: "#E8DFC8" }}>
            <button type="button" onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
              style={{ color: "#3D5775" }}>
              Cancel
            </button>
            <button type="button" onClick={handleOpenMailApp} disabled={!canSend}
              className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "#1F8A8A" }}>
              <Mail className="h-3.5 w-3.5" />
              Open in mail app
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
