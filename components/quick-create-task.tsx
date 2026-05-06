"use client";

import { useState, useTransition, forwardRef } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

type Props = {
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
  onCreated: (task: SerializedTask) => void;
  onOpenAdvanced: (title: string, dueDate: string) => void;
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
  function QuickCreateTask(
    { contactId, dealId, workspaceId, onCreated, onOpenAdvanced },
    ref,
  ) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [pending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!title.trim()) return;

      startTransition(async () => {
        const fd = new FormData();
        fd.set("title", title.trim());
        if (dueDate) fd.set("dueDate", dueDate);
        if (contactId) fd.set("contactId", contactId);
        if (dealId) fd.set("dealId", dealId);
        if (workspaceId) fd.set("workspaceId", workspaceId);

        const result = await createTask(fd);
        if ("error" in result) {
          toast.error(result.error);
        } else {
          onCreated(result.task);
          setTitle("");
          setDueDate("");
          toast.success("Task added");
        }
      });
    }

    const quickBtnClass =
      "rounded px-2 py-1 text-xs font-medium text-[#3D5775] hover:bg-[#E2F0EE] hover:text-[#3D5775] transition-colors";
    const quickBtnActive = "bg-[#E2F0EE] text-[#1F8A8A] hover:bg-[#E2F0EE] hover:text-[#1F8A8A]";

    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex gap-2">
          <input
            ref={ref}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task…"
            disabled={pending}
            className="min-w-0 flex-1 rounded-md border border-[#E8DFC8] px-3 py-2 text-sm placeholder-[#3D5775] focus:outline-none focus:ring-2 focus:ring-[#1F8A8A] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded-md bg-[#1F8A8A] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1A7575] disabled:opacity-40"
          >
            {pending ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => onOpenAdvanced(title, dueDate)}
            className="rounded-md border border-[#E8DFC8] px-3 py-2 text-xs font-medium text-[#3D5775] hover:bg-[#E2F0EE] hover:text-[#3D5775]"
          >
            Advanced…
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDueDate(dueDate === addDays(0) ? "" : addDays(0))}
            className={cn(quickBtnClass, dueDate === addDays(0) && quickBtnActive)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDueDate(dueDate === addDays(1) ? "" : addDays(1))}
            className={cn(quickBtnClass, dueDate === addDays(1) && quickBtnActive)}
          >
            Tomorrow
          </button>
          <button
            type="button"
            onClick={() => setDueDate(dueDate === addDays(7) ? "" : addDays(7))}
            className={cn(quickBtnClass, dueDate === addDays(7) && quickBtnActive)}
          >
            Next Week
          </button>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-[#E8DFC8] px-2 py-1 text-xs text-[#3D5775] focus:outline-none focus:ring-1 focus:ring-[#1F8A8A]"
          />
        </div>
      </form>
    );
  },
);
