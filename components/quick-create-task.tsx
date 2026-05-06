"use client";

import { useState, useTransition, forwardRef } from "react";
import { toast } from "sonner";
import { createTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

type Props = {
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
  onCreated: (task: SerializedTask) => void;
};

function toDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export const QuickCreateTask = forwardRef<HTMLInputElement, Props>(
  function QuickCreateTask({ contactId, dealId, workspaceId, onCreated }, ref) {
    const [title, setTitle] = useState("");
    const [dueAt, setDueAt] = useState("");
    const [pending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!title.trim()) return;

      startTransition(async () => {
        const fd = new FormData();
        fd.set("title", title.trim());
        if (dueAt) fd.set("dueAt", dueAt);
        if (contactId) fd.set("contactId", contactId);
        if (dealId) fd.set("dealId", dealId);
        if (workspaceId) fd.set("workspaceId", workspaceId);

        const result = await createTask(fd);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          onCreated(result.task);
          setTitle("");
          setDueAt("");
          toast.success("Task added");
        }
      });
    }

    const quickBtnClass =
      "rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors";
    const quickBtnActive =
      "bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700";

    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Title input */}
        <div className="flex gap-2">
          <input
            ref={ref}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task…"
            disabled={pending}
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-900 disabled:opacity-40"
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>

        {/* Date row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Quick-set buttons */}
          <button
            type="button"
            onClick={() => setDueAt(dueAt === addDays(0) ? "" : addDays(0))}
            className={cn(quickBtnClass, dueAt === addDays(0) && quickBtnActive)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDueAt(dueAt === addDays(1) ? "" : addDays(1))}
            className={cn(quickBtnClass, dueAt === addDays(1) && quickBtnActive)}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setDueAt(dueAt === addDays(7) ? "" : addDays(7))}
            className={cn(quickBtnClass, dueAt === addDays(7) && quickBtnActive)}
          >
            Next Week
          </button>

          {/* Date input */}
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </form>
    );
  },
);

// Need cn helper — inline since it's just used here
function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
