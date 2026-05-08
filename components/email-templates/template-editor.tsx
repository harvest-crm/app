"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEmailTemplate } from "@/app/actions/email-templates";
import { renderTemplate, mockRenderContext } from "@/lib/email-templates/render-template";
import type { SerializedEmailTemplate } from "@/app/actions/email-templates";

// ── Variable chips ─────────────────────────────────────────────────────────────

const VARIABLES = [
  { group: "Contact",    vars: ["contact.firstName", "contact.lastName", "contact.fullName", "contact.email", "contact.phone"] },
  { group: "Deal",       vars: ["deal.title", "deal.value"] },
  { group: "Agent",      vars: ["user.firstName", "user.lastName", "user.email", "user.phone"] },
];

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  text: string,
  value: string,
  setValue: (v: string) => void,
) {
  const el = ref.current;
  if (!el) { setValue(value + `{{${text}}}`); return; }
  const start = el.selectionStart ?? value.length;
  const end   = el.selectionEnd   ?? value.length;
  const next  = value.slice(0, start) + `{{${text}}}` + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    el.focus();
    const pos = start + text.length + 4;
    el.setSelectionRange(pos, pos);
  });
}

// ── EmailTemplateEditor ────────────────────────────────────────────────────────

type Props = {
  template: SerializedEmailTemplate;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
};

export function EmailTemplateEditor({ template, userFirstName, userLastName, userEmail }: Props) {
  const [, startTransition] = useTransition();

  const [name,        setName]        = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [appliesTo,   setAppliesTo]   = useState<"contact" | "deal" | "both">(template.appliesTo as "contact" | "deal" | "both");
  const [subject,     setSubject]     = useState(template.subject);
  const [body,        setBody]        = useState(template.body);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef    = useRef<HTMLTextAreaElement>(null);
  const [insertTarget, setInsertTarget] = useState<"subject" | "body">("body");

  const ctx = mockRenderContext(userFirstName, userLastName, userEmail);
  const preview = renderTemplate({ subject, body }, ctx);

  function save(patch: Parameters<typeof updateEmailTemplate>[1]) {
    startTransition(async () => {
      const r = await updateEmailTemplate(template.id, patch);
      if ("error" in r) toast.error(r.error);
    });
  }

  function onNameBlur()        { if (name.trim() !== template.name)              save({ name: name.trim() }); }
  function onDescBlur()        { if (description !== (template.description ?? "")) save({ description: description || null }); }
  function onAppliesToChange(v: "contact" | "deal" | "both") { setAppliesTo(v); save({ appliesTo: v }); }
  function onSubjectBlur()     { if (subject !== template.subject) save({ subject }); }
  function onBodyBlur()        { if (body !== template.body)       save({ body }); }

  function handleInsertVar(varName: string) {
    if (insertTarget === "subject") {
      insertAtCursor(subjectRef, varName, subject, setSubject);
    } else {
      insertAtCursor(bodyRef, varName, body, setBody);
    }
  }

  const inputCls = "w-full rounded-md border border-[#E8DFC8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]";

  return (
    <div className="grid grid-cols-2 gap-8">
      {/* Left: editor */}
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#0F2540" }}>Edit template</h1>
          <p className="text-xs mt-0.5" style={{ color: "#3D5775" }}>Auto-saves on blur</p>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>Template name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onBlur={onNameBlur}
            className={inputCls} style={{ color: "#0F2540" }} />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} onBlur={onDescBlur}
            placeholder="Brief description of when to use this template"
            className={inputCls} style={{ color: "#0F2540" }} />
        </div>

        {/* Applies to */}
        <div>
          <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Applies to</p>
          <div className="flex gap-2">
            {(["contact", "deal", "both"] as const).map((v) => (
              <button key={v} type="button" onClick={() => onAppliesToChange(v)}
                className="rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors"
                style={appliesTo === v
                  ? { background: "#1F8A8A", color: "#fff", borderColor: "#1F8A8A" }
                  : { borderColor: "#E8DFC8", color: "#3D5775" }}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>Subject</label>
          <input
            ref={subjectRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onFocus={() => setInsertTarget("subject")}
            onBlur={onSubjectBlur}
            placeholder="Email subject line"
            className={inputCls} style={{ color: "#0F2540" }}
          />
        </div>

        {/* Body */}
        <div>
          <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>Body</label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onFocus={() => setInsertTarget("body")}
            onBlur={onBodyBlur}
            rows={14}
            placeholder="Write your email body here…"
            className="w-full resize-y rounded-md border border-[#E8DFC8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
            style={{ color: "#0F2540" }}
          />
        </div>

        {/* Variable chips */}
        <div>
          <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>
            Insert variable — will insert into{" "}
            <span style={{ color: "#1F8A8A" }}>{insertTarget === "subject" ? "subject" : "body"}</span>
          </p>
          <div className="space-y-2">
            {VARIABLES.map(({ group, vars }) => (
              <div key={group}>
                <p className="mb-1 text-xs uppercase tracking-wide" style={{ color: "#3D5775" }}>{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {vars.map((v) => (
                    <button key={v} type="button" onClick={() => handleInsertVar(v)}
                      className="rounded-md border px-2 py-0.5 font-mono text-xs transition-colors hover:bg-[#E2F0EE]"
                      style={{ borderColor: "#E8DFC8", color: "#1F8A8A" }}>
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: live preview */}
      <div className="sticky top-8 h-fit space-y-4">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "#0F2540" }}>Live preview</h2>
          <p className="text-xs" style={{ color: "#3D5775" }}>Using placeholder data</p>
        </div>

        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <div className="mb-3 pb-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <p className="text-xs" style={{ color: "#3D5775" }}>Subject</p>
            <p className="mt-0.5 text-sm font-medium" style={{ color: "#0F2540" }}>
              {preview.subject || <span style={{ color: "#A8A29E" }}>(no subject)</span>}
            </p>
          </div>
          <div className="text-sm whitespace-pre-wrap" style={{ color: "#0F2540", lineHeight: 1.6 }}>
            {preview.body || <span style={{ color: "#A8A29E" }}>(no body)</span>}
          </div>
        </div>

        <div className="rounded-lg border p-3" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "#3D5775" }}>Preview context</p>
          <p className="text-xs" style={{ color: "#3D5775" }}>
            Contact: John Smith · Deal: 123 Oak Street ($485,000)
          </p>
          <p className="text-xs" style={{ color: "#3D5775" }}>
            Agent: {userFirstName || "Agent"} {userLastName}
          </p>
        </div>
      </div>
    </div>
  );
}
