import { db } from "@/lib/db";

type Params = {
  templateId: string;
  attachTo: { type: "contact" | "deal"; id: string };
  organizationId: string;
  userId: string;
};

export async function applyTaskTemplate(
  params: Params,
): Promise<{ tasksCreated: number }> {
  const { templateId, attachTo, organizationId, userId } = params;

  try {
    // 1. Fetch template + items
    const template = await db.taskTemplate.findFirst({
      where: { id: templateId, organizationId },
      include: { tasks: { orderBy: { sortOrder: "asc" } } },
    });
    if (!template) return { tasksCreated: 0 };

    // 2. Resolve workspace + contactId/dealId
    let workspaceId: string | null = null;
    let contactId: string | null = null;
    let dealId: string | null = null;

    if (attachTo.type === "contact") {
      contactId = attachTo.id;
      const cw = await db.contactWorkspace.findFirst({
        where: { contactId: attachTo.id },
        orderBy: { addedAt: "asc" },
        select: { workspaceId: true },
      });
      workspaceId = cw?.workspaceId ?? null;
    } else {
      dealId = attachTo.id;
      const deal = await db.deal.findUnique({
        where: { id: attachTo.id },
        select: { workspaceId: true, contactId: true },
      });
      workspaceId = deal?.workspaceId ?? null;
      contactId   = deal?.contactId  ?? null;
    }

    // 3. Create tasks
    const now = new Date();
    const createdTitles: string[] = [];

    for (const item of template.tasks) {
      const dueAt = new Date(now);
      dueAt.setUTCHours(9, 0, 0, 0);
      dueAt.setUTCDate(dueAt.getUTCDate() + item.dueOffsetDays);

      const reminderAt =
        item.reminderOffsetMinutes != null
          ? new Date(dueAt.getTime() - item.reminderOffsetMinutes * 60_000)
          : null;

      await db.task.create({
        data: {
          organizationId,
          workspaceId,
          contactId,
          dealId,
          title: item.title,
          description: item.description ?? null,
          taskType: item.taskType,
          priority: item.priority,
          dueAt,
          reminderAt,
          completedAt: null,
          assignedToClerkUserId: userId,
        },
      });
      createdTitles.push(item.title);
    }

    // 4. Log activity
    const bodyText = `Applied template: ${template.name}\n\nCreated ${createdTitles.length} task${createdTitles.length !== 1 ? "s" : ""}: ${createdTitles.join(", ").slice(0, 100)}${createdTitles.join(", ").length > 100 ? "…" : ""}`;
    await db.activity.create({
      data: {
        organizationId,
        workspaceId,
        contactId,
        dealId,
        type: "template_applied",
        body: bodyText,
        createdByClerkUserId: userId,
      },
    });

    return { tasksCreated: createdTitles.length };
  } catch (err) {
    console.error("[applyTaskTemplate] error:", err);
    return { tasksCreated: 0 };
  }
}
