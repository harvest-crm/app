"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { moveDealToStage, deleteDeal, updateDealInline } from "@/app/actions/deals";
import { ApplyTemplateButton } from "@/components/task-templates/apply-template-button";
import { ComposeEmailButton } from "@/components/email-compose/compose-email-button";
import type { SerializedDeal, SerializedStage } from "@/components/deals/types";

// ── Inline edit ───────────────────────────────────────────────────────────────

function InlineText({
  value, onSave, className, placeholder, multiline,
}: {
  value: string; onSave: (v: string) => void;
  className?: string; placeholder?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() { if (draft.trim() !== value) onSave(draft.trim()); setEditing(false); }

  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(value); setEditing(true); }}
        className={cn("cursor-text rounded px-1 py-0.5 hover:bg-[#E2F0EE] transition-colors", className)}
        title="Click to edit"
      >
        {value || <span style={{ color: "#A8A29E" }}>{placeholder ?? "—"}</span>}
      </span>
    );
  }

  if (multiline) {
    return (
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        autoFocus
        rows={3}
        className="w-full rounded-md border border-[#1F8A8A] px-2 py-1 text-sm focus:outline-none"
        style={{ color: "#0F2540" }}
      />
    );
  }

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
      autoFocus
      className={cn("rounded-md border border-[#1F8A8A] px-2 py-0.5 focus:outline-none", className)}
      style={{ color: "#0F2540" }}
    />
  );
}

// ── Stage selector ────────────────────────────────────────────────────────────

function stageColor(s: SerializedStage): string {
  if (s.isTerminal && s.terminalOutcome === "won")  return "#10B981";
  if (s.isTerminal && s.terminalOutcome === "lost") return "#EF4444";
  return "#1F8A8A";
}

function StageSelector({ dealId, stages, currentStageId }: {
  dealId: string; stages: SerializedStage[]; currentStageId: string; workspaceSlug?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);
  const current = stages.find((s) => s.id === currentStageId) ?? stages[0];

  function select(stageId: string) {
    setOpen(false);
    if (stageId === currentStageId) return;
    startTransition(async () => {
      const r = await moveDealToStage(dealId, stageId);
      if ("error" in r) toast.error(r.error);
      else { toast.success(`Moved to ${stages.find((s) => s.id === stageId)?.name}`); router.refresh(); }
    });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#E2F0EE] disabled:opacity-50"
        style={{ borderColor: "#E8DFC8", color: "#0F2540" }}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: current ? stageColor(current) : "#1F8A8A" }} />
        )}
        {current?.name ?? "No stage"}
        <ChevronDown className="h-3.5 w-3.5" style={{ color: "#3D5775" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 min-w-48 overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: "#E8DFC8" }}>
            {stages.map((s) => (
              <button key={s.id} type="button" onClick={() => select(s.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-[#E2F0EE]"
                style={{ color: s.id === currentStageId ? "#1F8A8A" : "#0F2540", fontWeight: s.id === currentStageId ? 500 : 400 }}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stageColor(s) }} />
                {s.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── DealHeader ────────────────────────────────────────────────────────────────

type Props = {
  deal: SerializedDeal;
  stages: SerializedStage[];
  workspaceSlug: string;
  contactEmail?: string | null;
};

export function DealHeader({ deal, stages, workspaceSlug, contactEmail }: Props) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();

  function saveDeal(patch: Parameters<typeof updateDealInline>[1]) {
    startTransition(async () => {
      const r = await updateDealInline(deal.id, patch);
      if ("error" in r) toast.error(r.error); else router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const r = await deleteDeal(deal.id);
      if ("error" in r) toast.error(r.error);
      else { toast.success("Deal deleted"); router.push(`/workspaces/${workspaceSlug}/deals`); }
    });
  }

  const daysInStage = Math.floor(
    (Date.now() - new Date(deal.movedToStageAt).getTime()) / 86_400_000,
  );
  const createdDate = new Date(deal.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  function fmtCurrency(n: number | null): string {
    if (!n) return "";
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n}`;
  }

  return (
    <div className="rounded-xl border bg-white p-6" style={{ borderColor: "#E8DFC8" }}>
      {/* Title row */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold leading-tight" style={{ color: "#0F2540" }}>
          <InlineText value={deal.title} onSave={(v) => v && saveDeal({ title: v })} className="text-2xl font-semibold" />
        </h1>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {(contactEmail !== undefined) && (
            <ComposeEmailButton
              context="deal"
              dealId={deal.id}
              dealTitle={deal.title}
              dealValue={deal.value}
              contactId={deal.contactId ?? undefined}
              contactName={deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ""}`.trim() : undefined}
              contactEmail={contactEmail}
            />
          )}
          <ApplyTemplateButton dealId={deal.id} />

          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5">
              <span className="text-xs text-[#3D5775]">Delete?</span>
              <button onClick={handleDelete} className="text-xs font-semibold text-red-600 hover:text-red-700">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#3D5775]">No</button>
            </div>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StageSelector dealId={deal.id} stages={stages} currentStageId={deal.stageId} workspaceSlug={workspaceSlug} />

        <div className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm"
          style={{ borderColor: "#E8DFC8", color: "#0F2540" }}>
          <span style={{ color: "#3D5775" }}>$</span>
          <InlineText
            value={deal.value != null ? String(deal.value) : ""}
            onSave={(v) => saveDeal({ value: v ? Number(v) : null })}
            placeholder="Add value"
            className="text-sm font-medium"
          />
        </div>

        <span className="text-xs" style={{ color: "#3D5775" }}>Created {createdDate}</span>
        <span className="text-xs" style={{ color: "#3D5775" }}>
          {daysInStage === 0 ? "Moved today" : `${daysInStage}d in this stage`}
        </span>

        {deal.value != null && deal.value > 0 && (
          <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
            {fmtCurrency(deal.value)}
          </span>
        )}
      </div>
    </div>
  );
}
