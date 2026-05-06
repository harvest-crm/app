"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createDeal, updateDeal, deleteDeal } from "@/app/actions/deals";
import { listActivitiesForDeal } from "@/app/actions/activities";
import { listTasksForDeal } from "@/app/actions/tasks";
import { ActivityFeed } from "@/components/activity-feed";
import { TasksFeed } from "@/components/tasks-feed";
import type { SerializedDeal, SerializedStage, ContactOption } from "./types";
import type { SerializedActivity } from "@/app/actions/activities";
import type { SerializedTask } from "@/app/actions/tasks";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  contactId: z.string().optional(),
  stageId: z.string().min(1, "Stage is required"),
  value: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  mode: "create" | "edit";
  deal?: SerializedDeal;
  stages: SerializedStage[];
  contacts: ContactOption[];
  workspaceId: string;
  defaultStageId?: string;
  onCreated: (deal: SerializedDeal) => void;
  onUpdated: (deal: SerializedDeal, originalStageId: string) => void;
  onDeleted: (dealId: string, stageId: string) => void;
  onClose: () => void;
};

export function DealDialog({
  mode,
  deal,
  stages,
  contacts,
  workspaceId,
  defaultStageId,
  onCreated,
  onUpdated,
  onDeleted,
  onClose,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Tasks section
  const [tasksOpen, setTasksOpen] = useState(false);
  const [dealTasks, setDealTasks] = useState<SerializedTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  useEffect(() => {
    if (tasksOpen && !tasksLoaded && deal) {
      listTasksForDeal(deal.id).then((rows) => {
        setDealTasks(rows);
        setTasksLoaded(true);
      });
    }
  }, [tasksOpen, tasksLoaded, deal]);

  // Activity section
  const [activityOpen, setActivityOpen] = useState(false);
  const [dealActivities, setDealActivities] = useState<SerializedActivity[]>([]);
  const [activitiesLoaded, setActivitiesLoaded] = useState(false);

  useEffect(() => {
    if (activityOpen && !activitiesLoaded && deal) {
      listActivitiesForDeal(deal.id).then((rows) => {
        setDealActivities(rows);
        setActivitiesLoaded(true);
      });
    }
  }, [activityOpen, activitiesLoaded, deal]);

  const firstNonTerminalId = stages.find((s) => !s.isTerminal)?.id ?? stages[0]?.id;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: deal?.title ?? "",
      contactId: deal?.contactId ?? "",
      stageId: deal?.stageId ?? defaultStageId ?? firstNonTerminalId ?? "",
      value: deal?.value != null ? String(deal.value) : "",
      notes: deal?.notes ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", values.title);
      fd.set("workspaceId", workspaceId);
      fd.set("stageId", values.stageId);
      if (values.contactId) fd.set("contactId", values.contactId);
      if (values.value) fd.set("value", values.value);
      if (values.notes) fd.set("notes", values.notes);

      if (mode === "create") {
        const result = await createDeal(fd);
        if ("error" in result) {
          setServerError(result.error);
        } else {
          onCreated(result.deal);
        }
      } else if (deal) {
        const result = await updateDeal(deal.id, fd);
        if ("error" in result) {
          setServerError(result.error);
        } else {
          onUpdated(result.deal, deal.stageId);
        }
      }
    });
  }

  function handleDelete() {
    if (!deal) return;
    startTransition(async () => {
      const result = await deleteDeal(deal.id);
      if ("error" in result) {
        setServerError(result.error);
      } else {
        onDeleted(deal.id, deal.stageId);
      }
    });
  }

  const workspaceContacts = contacts.filter((c) => c.isInWorkspace);
  const otherContacts = contacts.filter((c) => !c.isInWorkspace);

  const selectClass =
    "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {mode === "create" ? "New Deal" : "Edit Deal"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Deal form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Deal name</Label>
              <Input id="title" {...register("title")} placeholder="e.g. 123 Oak Street" />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactId">Contact</Label>
              <select id="contactId" {...register("contactId")} className={selectClass}>
                <option value="">— No contact —</option>
                {workspaceContacts.length > 0 && (
                  <optgroup label="Workspace Contacts">
                    {workspaceContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName ?? ""}
                      </option>
                    ))}
                  </optgroup>
                )}
                {otherContacts.length > 0 && (
                  <optgroup label="Other Contacts">
                    {otherContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName ?? ""}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="stageId">Stage</Label>
                <select id="stageId" {...register("stageId")} className={selectClass}>
                  {stages.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {errors.stageId && (
                  <p className="text-xs text-red-600">{errors.stageId.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 350000"
                  {...register("value")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">
                Notes{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Textarea id="notes" rows={3} {...register("notes")} />
            </div>

            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                {serverError}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              {mode === "edit" && deal ? (
                <div>
                  {confirmDelete ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Sure?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={pending}
                        className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        Yes, delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="text-xs font-medium text-red-500 hover:text-red-700"
                    >
                      Delete deal
                    </button>
                  )}
                </div>
              ) : (
                <span />
              )}

              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Saving…" : mode === "create" ? "Create Deal" : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>

          {/* Tasks section — edit mode only */}
          {mode === "edit" && deal && (
            <div className="border-t">
              <button
                type="button"
                onClick={() => setTasksOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    tasksOpen && "rotate-90",
                  )}
                />
                Tasks
                {tasksLoaded && dealTasks.length > 0 && (
                  <span className="ml-auto font-normal normal-case text-slate-400">
                    {dealTasks.filter((t) => !t.completedAt).length} open
                  </span>
                )}
              </button>

              {tasksOpen && (
                <div className="px-5 pb-4">
                  {tasksLoaded ? (
                    <TasksFeed
                      key={deal.id + "-tasks"}
                      initialTasks={dealTasks}
                      contactId={deal.contactId ?? undefined}
                      dealId={deal.id}
                      workspaceId={deal.workspaceId}
                    />
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-400">Loading…</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Activity section — edit mode only */}
          {mode === "edit" && deal && (
            <div className="border-t">
              <button
                type="button"
                onClick={() => setActivityOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
              >
                <ChevronRight
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    activityOpen && "rotate-90",
                  )}
                />
                Activity
                {activitiesLoaded && dealActivities.length > 0 && (
                  <span className="ml-auto font-normal normal-case text-slate-400">
                    {dealActivities.length}
                  </span>
                )}
              </button>

              {activityOpen && (
                <div className="px-5 pb-5">
                  {activitiesLoaded ? (
                    <ActivityFeed
                      key={deal.id}
                      initialActivities={dealActivities}
                      contactId={deal.contactId ?? undefined}
                      dealId={deal.id}
                      workspaceId={deal.workspaceId}
                    />
                  ) : (
                    <p className="py-4 text-center text-xs text-slate-400">Loading…</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
