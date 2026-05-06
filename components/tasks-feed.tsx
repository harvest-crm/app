"use client";

import { useState } from "react";
import { toast } from "sonner";
import { QuickCreateTask } from "@/components/quick-create-task";
import { TaskList } from "@/components/task-list";
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

  function handleToggle(task: SerializedTask) {
    const wasCompleted = !!task.completedAt;
    // Optimistic update
    const optimistic: SerializedTask = {
      ...task,
      completedAt: wasCompleted ? null : new Date().toISOString(),
    };
    setTasks((prev) => prev.map((t) => (t.id === task.id ? optimistic : t)));

    // Server — no success toast (too noisy for checkbox)
    (wasCompleted ? reopenTask(task.id) : completeTask(task.id)).then((result) => {
      if ("error" in result) {
        // Revert
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        toast.error("Failed to update task");
      }
    });
  }

  return (
    <div className="space-y-4">
      <QuickCreateTask
        contactId={contactId}
        dealId={dealId}
        workspaceId={workspaceId}
        onCreated={(t) => setTasks((prev) => [t, ...prev])}
      />
      <TaskList
        tasks={tasks}
        onToggle={handleToggle}
        onUpdated={(updated) =>
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }
        onDeleted={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
