"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createActivity } from "@/app/actions/activities";
import { ACTIVITY_TYPE_CONFIG } from "@/components/activity-timeline";
import type { SerializedActivity } from "@/app/actions/activities";

const TYPES = ["note", "call", "email", "meeting", "sms"] as const;

type Props = {
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
  onCreated: (activity: SerializedActivity) => void;
};

export function QuickLogActivity({ contactId, dealId, workspaceId, onCreated }: Props) {
  const [type, setType] = useState<string>("note");
  const [body, setBody] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("body", body.trim());
      if (contactId) fd.set("contactId", contactId);
      if (dealId) fd.set("dealId", dealId);
      if (workspaceId) fd.set("workspaceId", workspaceId);
      if (occurredAt) fd.set("occurredAt", occurredAt);

      const result = await createActivity(fd);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        onCreated(result.activity);
        setBody("");
        setOccurredAt("");
        toast.success("Activity logged");
      }
    });
  }

  const activeCfg = ACTIVITY_TYPE_CONFIG[type as keyof typeof ACTIVITY_TYPE_CONFIG];

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5">
      {/* Type selector */}
      <div className="flex flex-wrap gap-1.5">
        {TYPES.map((t) => {
          const cfg = ACTIVITY_TYPE_CONFIG[t];
          const Icon = cfg.icon;
          const active = type === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? `${cfg.bg} ${cfg.text}`
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            handleSubmit(e as unknown as React.FormEvent);
          }
        }}
        rows={3}
        placeholder={`Log a ${activeCfg?.label.toLowerCase() ?? "note"}…`}
        disabled={pending}
        className="w-full resize-none rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />

      <div className="flex items-center justify-between gap-3">
        {/* Optional date/time */}
        <input
          type="datetime-local"
          value={occurredAt}
          onChange={(e) => setOccurredAt(e.target.value)}
          title="Date/time (defaults to now)"
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-900 disabled:opacity-40"
        >
          {pending ? "Logging…" : "Log activity"}
        </button>
      </div>
    </form>
  );
}
