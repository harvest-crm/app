"use client";

import { useState, useTransition } from "react";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateActivity, deleteActivity } from "@/app/actions/activities";
import type { SerializedActivity } from "@/app/actions/activities";

// ── Config (exported so QuickLogActivity can reuse) ───────────────────────────

export const ACTIVITY_TYPE_CONFIG = {
  call:    { icon: Phone,         bg: "bg-blue-50",   text: "text-blue-600",   label: "Call"    },
  email:   { icon: Mail,          bg: "bg-indigo-50", text: "text-indigo-600", label: "Email"   },
  meeting: { icon: Calendar,      bg: "bg-purple-50", text: "text-purple-600", label: "Meeting" },
  note:    { icon: FileText,      bg: "bg-slate-100", text: "text-slate-500",  label: "Note"    },
  sms:     { icon: MessageSquare, bg: "bg-green-50",  text: "text-green-600",  label: "SMS"     },
} as const;

// ── Time formatting ───────────────────────────────────────────────────────────

function formatOccurredAt(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const ms = now.getTime() - date.getTime();
  if (ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── ActivityItem ──────────────────────────────────────────────────────────────

function ActivityItem({
  activity,
  onUpdated,
  onDeleted,
  readOnly,
  contactInfo,
}: {
  activity: SerializedActivity;
  onUpdated?: (a: SerializedActivity) => void;
  onDeleted?: (id: string) => void;
  readOnly?: boolean;
  contactInfo?: { name: string; id: string };
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(activity.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const cfg =
    ACTIVITY_TYPE_CONFIG[activity.type as keyof typeof ACTIVITY_TYPE_CONFIG] ??
    ACTIVITY_TYPE_CONFIG.note;
  const Icon = cfg.icon;

  function handleSave() {
    if (!editBody.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("body", editBody.trim());
      fd.set("type", activity.type);
      fd.set("occurredAt", activity.occurredAt);
      const result = await updateActivity(activity.id, fd);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        onUpdated?.(result.activity);
        setEditing(false);
        toast.success("Activity updated");
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteActivity(activity.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        onDeleted?.(activity.id);
        toast.success("Activity deleted");
      }
    });
  }

  return (
    <div className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50">
      {/* Type icon */}
      <div
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          cfg.bg,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", cfg.text)} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-semibold", cfg.text)}>{cfg.label}</span>
          <span className="text-xs text-slate-400">{formatOccurredAt(activity.occurredAt)}</span>
        </div>

        {editing ? (
          <div className="mt-1.5 space-y-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={3}
              autoFocus
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={pending || !editBody.trim()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-40"
              >
                {pending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditBody(activity.body);
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{activity.body}</p>
        )}

        {contactInfo && (
          <a
            href={`/contacts/${contactInfo.id}`}
            className="mt-0.5 block text-xs text-blue-600 hover:underline"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {contactInfo.name}
          </a>
        )}

        {/* Inline delete confirm */}
        {!editing && confirmDelete && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-xs text-slate-500">Delete this activity?</span>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-40"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Hover actions — hidden in readOnly mode */}
      {!readOnly && !editing && !confirmDelete && (
        <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => setEditing(true)}
            title="Edit"
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            title="Delete"
            className="rounded p-1 text-slate-400 hover:bg-red-100 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── ActivityTimeline ──────────────────────────────────────────────────────────

export function ActivityTimeline({
  activities,
  onUpdated,
  onDeleted,
  readOnly,
  contacts,
}: {
  activities: SerializedActivity[];
  onUpdated?: (a: SerializedActivity) => void;
  onDeleted?: (id: string) => void;
  readOnly?: boolean;
  contacts?: Record<string, { name: string; id: string }>;
}) {
  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-slate-400">
        No activity yet. Log a call, email, meeting, or note above.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {activities.map((a) => (
        <ActivityItem
          key={a.id}
          activity={a}
          readOnly={readOnly}
          contactInfo={a.contactId ? contacts?.[a.contactId] : undefined}
          onUpdated={onUpdated}
          onDeleted={onDeleted}
        />
      ))}
    </div>
  );
}
