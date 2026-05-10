"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconSparkles, IconRefresh } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { messageIsReady } from "@/lib/insights/constants";
import type { AiInsight } from "@/app/generated/prisma/client";

type Props = {
  insight: AiInsight;
  contactPhone: string | null;
  contactEmail: string | null;
};

export function InsightCard({ insight: initial, contactPhone, contactEmail }: Props) {
  const router = useRouter();

  const [message, setMessage]           = useState(initial.suggestedMessage);
  const [gone, setGone]                 = useState(false);

  // Edit flow
  const [isEditing, setIsEditing]       = useState(false);
  const [editValue, setEditValue]       = useState("");
  const [isSaving, setIsSaving]         = useState(false);
  const [saveError, setSaveError]       = useState<string | null>(null);
  const [showSaved, setShowSaved]       = useState(false);
  const [savedFading, setSavedFading]   = useState(false);

  // Dismiss flow
  const [isDismissing, setIsDismissing] = useState(false);
  const dismissTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Regen flow
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenError, setRegenError]         = useState<string | null>(null);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  if (gone) return null;

  const sendLink = contactPhone
    ? `sms:${contactPhone}`
    : contactEmail
    ? `mailto:${contactEmail}`
    : null;

  const busy = isSaving || isRegenerating;

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit() {
    setEditValue(message);
    setSaveError(null);
    setIsEditing(true);
  }

  async function handleSave() {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/insights/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", message: trimmed }),
      });
      if (!res.ok) throw new Error("save failed");
      setMessage(trimmed);
      setIsEditing(false);
      setShowSaved(true);
      setSavedFading(false);
      setTimeout(() => setSavedFading(true), 1000);
      setTimeout(() => setShowSaved(false), 1500);
    } catch {
      setSaveError("Failed to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setSaveError(null);
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  function handleSend() {
    if (sendLink) window.location.href = sendLink;
    fetch(`/api/insights/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send" }),
    }).finally(() => { setGone(true); router.refresh(); });
  }

  // ── Dismiss ───────────────────────────────────────────────────────────────

  function requestDismiss() {
    setIsDismissing(true);
    dismissTimer.current = setTimeout(() => setIsDismissing(false), 2000);
  }

  function cancelDismiss() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setIsDismissing(false);
  }

  async function confirmDismiss() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    await fetch(`/api/insights/${initial.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss" }),
    });
    setGone(true);
    router.refresh();
  }

  // ── Regenerate ────────────────────────────────────────────────────────────

  async function handleRegenerate() {
    setIsRegenerating(true);
    setRegenError(null);
    try {
      const res = await fetch(`/api/insights/${initial.id}/regenerate`, { method: "POST" });
      if (!res.ok) throw new Error("regen failed");
      const data = await res.json() as { suggestedMessage: string };
      setMessage(data.suggestedMessage);
    } catch {
      setRegenError("Couldn't regenerate. Try again.");
    } finally {
      setIsRegenerating(false);
    }
  }

  // ── Message sub-card ──────────────────────────────────────────────────────

  function MessageSubCard() {
    if (isRegenerating) {
      return (
        <div className="bg-white border border-brand-gold-border rounded-card-sm p-3 mb-3">
          <p className="text-[13px] text-ink-400 italic leading-relaxed">Regenerating draft...</p>
        </div>
      );
    }
    if (regenError) {
      return (
        <div className="bg-white border border-brand-gold-border rounded-card-sm p-3 mb-3">
          <p className="text-[13px] text-danger leading-relaxed">{regenError}</p>
        </div>
      );
    }
    if (isEditing) {
      return (
        <div className="mb-3 space-y-2">
          <textarea
            className="w-full min-h-[80px] rounded-card-sm border border-brand-gold-border bg-white px-3 py-2 text-[13px] text-ink-900 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-brand-gold"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={isSaving}
            autoFocus
          />
          {!editValue.trim() && (
            <p className="text-[11px] text-danger">Message can&apos;t be empty</p>
          )}
          {saveError && <p className="text-[11px] text-danger">{saveError}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="h-7 px-3 text-xs" onClick={cancelEdit} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              variant="gold"
              className="rounded-btn h-7 px-3 text-xs"
              onClick={handleSave}
              disabled={isSaving || !editValue.trim()}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      );
    }
    if (!messageIsReady(message)) return null;
    return (
      <>
        <div className="bg-white border border-brand-gold-border rounded-card-sm p-3 mb-1">
          <p className="text-[13px] text-ink-500 leading-relaxed">{message}</p>
        </div>
        {showSaved && (
          <p
            className="text-[11px] text-success mb-2"
            style={{ opacity: savedFading ? 0 : 1, transition: "opacity 500ms" }}
          >
            Saved
          </p>
        )}
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-brand-gold-tint-light border border-brand-gold-border rounded-card p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <IconSparkles size={16} className="text-brand-gold shrink-0" />
        <span className="text-[12px] font-medium text-brand-gold">AI insight</span>
      </div>

      <p className="text-[14px] text-ink-900 leading-relaxed mb-3">{initial.reason}</p>

      <MessageSubCard />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="gold"
          className="rounded-btn h-7 px-3 text-xs gap-1.5"
          onClick={handleSend}
          disabled={isEditing || busy}
        >
          Send
        </Button>

        {!isEditing && (
          <Button
            variant="ghost"
            className="text-brand-gold hover:text-brand-gold hover:bg-transparent h-7 px-3 text-xs"
            onClick={startEdit}
            disabled={busy}
          >
            Edit
          </Button>
        )}

        <Button
          variant="ghost"
          className="h-7 px-3 text-xs text-ink-400 hover:text-ink-600 hover:bg-transparent flex items-center gap-1"
          onClick={handleRegenerate}
          disabled={busy || isEditing}
        >
          <IconRefresh size={12} />
          {isRegenerating ? "Regenerating..." : "Regenerate"}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          {isDismissing ? (
            <>
              <span className="text-[12px] text-ink-500">Sure?</span>
              <button
                className="text-[12px] text-danger underline leading-none"
                onClick={confirmDismiss}
              >
                Yes
              </button>
              <button
                className="text-[12px] text-ink-400 underline leading-none"
                onClick={cancelDismiss}
              >
                Never mind
              </button>
            </>
          ) : (
            <Button
              variant="ghost"
              className="h-7 px-3 text-xs text-ink-400 hover:text-ink-600 hover:bg-transparent"
              onClick={requestDismiss}
              disabled={busy || isEditing}
            >
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
