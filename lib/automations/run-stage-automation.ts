import { db } from "@/lib/db";

type Params = {
  dealId: string;
  newStageId: string;
  oldStageId: string;
  organizationId: string;
  userId: string;
  contactId: string | null;
};

export async function runStageAutomation(
  params: Params,
): Promise<{ tasksCreated: number; activitiesCreated: number }> {
  const { dealId, newStageId, oldStageId, organizationId, userId, contactId } = params;

  // Skip if not actually moving
  if (newStageId === oldStageId) return { tasksCreated: 0, activitiesCreated: 0 };

  try {
    // 1. Look up automation
    const automation = await db.stageAutomation.findUnique({
      where: { stageId: newStageId },
      include: { tasks: { orderBy: { sortOrder: "asc" } }, stage: true },
    });

    if (!automation || !automation.isEnabled) {
      // Still log the stage-change activity even without task automation
      await logStageChangeActivity({ dealId, newStageId, organizationId, userId, contactId, taskCount: 0 });
      return { tasksCreated: 0, activitiesCreated: 1 };
    }

    // 2. Fetch deal workspace
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { workspaceId: true },
    });
    if (!deal) return { tasksCreated: 0, activitiesCreated: 0 };

    // 3. Create tasks
    const now = new Date();
    const createdTasks: { title: string }[] = [];

    for (const tmpl of automation.tasks) {
      const dueAt = new Date(now);
      dueAt.setUTCHours(9, 0, 0, 0);
      dueAt.setUTCDate(dueAt.getUTCDate() + tmpl.dueOffsetDays);

      const reminderAt =
        tmpl.reminderOffsetMinutes != null
          ? new Date(dueAt.getTime() - tmpl.reminderOffsetMinutes * 60_000)
          : null;

      await db.task.create({
        data: {
          organizationId,
          workspaceId: deal.workspaceId,
          dealId,
          contactId,
          title: tmpl.title,
          description: tmpl.description ?? null,
          taskType: tmpl.taskType,
          priority: tmpl.priority,
          dueAt,
          reminderAt,
          completedAt: null,
          assignedToClerkUserId: userId,
        },
      });
      createdTasks.push({ title: tmpl.title });
    }

    // 4. Log stage-change activity
    await logStageChangeActivity({
      dealId, newStageId, organizationId, userId, contactId,
      stageName: automation.stage.name,
      taskCount: createdTasks.length,
      taskTitles: createdTasks.map((t) => t.title),
    });

    return { tasksCreated: createdTasks.length, activitiesCreated: 1 };
  } catch (err) {
    // Automation errors must never break the deal move itself
    console.error("[runStageAutomation] error:", err);
    return { tasksCreated: 0, activitiesCreated: 0 };
  }
}

async function logStageChangeActivity(opts: {
  dealId: string;
  newStageId: string;
  organizationId: string;
  userId: string;
  contactId: string | null;
  stageName?: string;
  taskCount?: number;
  taskTitles?: string[];
}) {
  try {
    const { dealId, organizationId, userId, contactId, stageName, taskCount = 0, taskTitles = [] } = opts;

    // Get workspace for deal
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { workspaceId: true },
    });

    const stageLabel = stageName ?? "new stage";
    const body =
      taskCount > 0
        ? `Moved to ${stageLabel}. Auto-created ${taskCount} task${taskCount !== 1 ? "s" : ""}: ${taskTitles.join(", ")}.`
        : `Moved to ${stageLabel}.`;

    await db.activity.create({
      data: {
        organizationId,
        workspaceId: deal?.workspaceId ?? null,
        dealId,
        contactId,
        type: "stage_change",
        body,
        createdByClerkUserId: userId,
      },
    });
  } catch (err) {
    console.error("[runStageAutomation] activity log error:", err);
  }
}
