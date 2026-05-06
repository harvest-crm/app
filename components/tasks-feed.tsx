"use client";

import { useState } from "react";
import { toast } from "sonner";
import { QuickCreateTask } from "@/components/quick-create-task";
import { TaskList } from "@/components/task-list";
import { TaskDialog } from "@/components/task-dialog";
import { completeTask, reopenTask } from "@/app/actions/tasks";
import type { SerializedTask } from "@/app/actions/tasks";

type Props = {
  initialTasks: SerializedTask[];
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
};

export function TasksFeed({ initialTasks, contactId, dealId, workspaceId }: Props) {
  const [tasks, setTasks] = useState<SerializedTask[]>(initialTasks);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<SerializedTask | null>(null);
  const [dialogTitle, setDialogTitle] = useState("");

  function handleToggle(task: SerializedTask) {
    const wasCompleted = !!task.completedAt;
    const optimistic: SerializedTask = {
      ...task,
      completedAt: wasCompleted ? null : new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));

    (wasCompleted ? reopenTask(task.id) : completeTask(task.id)).then((result) => {
      if ("error" in result) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        toast.error("Failed to update task");
      }
    });
  }

  function openCreate(title = "") {
    setDialogTitle(title);
    setEditingTask(null);
    setDialogMode("create");
  }

  return (
    <div className="space-y-4">
      <QuickCreateTask
        contactId={contactId}
        dealId={dealId}
        workspaceId={workspaceId}
        onCreated={(t) => setTasks((prev) => [t, ...prev])}
        onOpenAdvanced={(title) => openCreate(title)}
      />
      <TaskList
        tasks={tasks}
        onToggle={handleToggle}
        onOpenEdit={(task) => { setEditingTask(task); setDialogMode("edit"); }}
        onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />

      {dialogMode && (
        <TaskDialog
          mode={dialogMode}
          task={dialogMode === "edit" ? (editingTask ?? undefined) : undefined}
          initialTitle={dialogMode === "create" ? dialogTitle : undefined}
          contactId={contactId}
          dealId={dealId}
          workspaceId={workspaceId}
          onCreated={(t) => { setTasks((prev) => [t, ...prev]); setDialogMode(null); }}
          onUpdated={(t) => {
            setTasks((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            setDialogMode(null);
          }}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setDialogMode(null);
          }}
          onClose={() => setDialogMode(null)}
        />
      )}
    </div>
  );
}
