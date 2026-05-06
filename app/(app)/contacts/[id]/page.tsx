import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { ContactForm } from "@/components/contact-form";
import { ContactTagManager } from "@/components/contact-tag-manager";
import { ContactWorkspaceManager } from "@/components/contact-workspace-manager";
import { DeleteContactButton } from "@/components/delete-contact-button";
import { TasksFeed } from "@/components/tasks-feed";
import { ActivityFeed } from "@/components/activity-feed";
import type { SerializedTask } from "@/app/actions/tasks";
import type { SerializedActivity } from "@/app/actions/activities";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const { id } = await params;
  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (!org) return null;

  const [contact, allTags, allWorkspaces, rawTasks, rawActivities] =
    await Promise.all([
      db.contact.findFirst({
        where: { id, organizationId: org.id },
        include: {
          contactTags: { include: { tag: true } },
          contactWorkspaces: { include: { workspace: true } },
        },
      }),
      db.tag.findMany({
        where: { organizationId: org.id },
        orderBy: { name: "asc" },
      }),
      db.workspace.findMany({
        where: { organizationId: org.id },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      db.task.findMany({
        where: { contactId: id, organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.activity.findMany({
        where: { contactId: id, organizationId: org.id },
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
    ]);

  if (!contact) notFound();

  const tasks: SerializedTask[] = rawTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    taskType: t.taskType,
    dueAt: t.dueAt?.toISOString() ?? null,
    reminderAt: t.reminderAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    contactId: t.contactId,
    dealId: t.dealId,
    workspaceId: t.workspaceId,
    createdAt: t.createdAt.toISOString(),
  }));

  const activities: SerializedActivity[] = rawActivities.map((a) => ({
    id: a.id,
    type: a.type,
    body: a.body,
    occurredAt: a.occurredAt.toISOString(),
    createdAt: a.createdAt.toISOString(),
    contactId: a.contactId,
    dealId: a.dealId,
    workspaceId: a.workspaceId,
  }));

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          {contact.firstName} {contact.lastName}
        </h1>
        <DeleteContactButton contactId={contact.id} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Details
            </h2>
            <ContactForm contact={contact} />
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Tasks
            </h2>
            <TasksFeed initialTasks={tasks} contactId={contact.id} />
          </div>

          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Activity
            </h2>
            <ActivityFeed initialActivities={activities} contactId={contact.id} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Tags
            </h2>
            <ContactTagManager
              contactId={contact.id}
              contactTags={contact.contactTags.map((ct) => ct.tag)}
              allTags={allTags}
            />
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Workspaces
            </h2>
            <ContactWorkspaceManager
              contactId={contact.id}
              contactWorkspaces={contact.contactWorkspaces}
              allWorkspaces={allWorkspaces}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
