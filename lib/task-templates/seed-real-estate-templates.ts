import { db } from "@/lib/db";

type Item = {
  title: string;
  taskType: string;
  priority: string;
  dueOffsetDays: number;
  reminderOffsetMinutes?: number;
};

type TemplateSpec = {
  name: string;
  description: string;
  appliesTo: "contact" | "deal" | "both";
  items: Item[];
};

const SPECS: TemplateSpec[] = [
  {
    name: "Buyer Onboarding",
    description: "Initial intake and prep for a new buyer client",
    appliesTo: "contact",
    items: [
      { title: "Schedule discovery call",                 taskType: "call",            priority: "high",   dueOffsetDays: 0,  reminderOffsetMinutes: 60   },
      { title: "Send buyer presentation deck",            taskType: "email",           priority: "medium", dueOffsetDays: 1,  reminderOffsetMinutes: 1440 },
      { title: "Confirm pre-approval letter received",    taskType: "follow_up",       priority: "high",   dueOffsetDays: 2,  reminderOffsetMinutes: 1440 },
      { title: "Set up MLS auto-alerts",                  taskType: "other",           priority: "medium", dueOffsetDays: 2 },
      { title: "Schedule first showing tour",             taskType: "meeting_prep",    priority: "high",   dueOffsetDays: 5,  reminderOffsetMinutes: 1440 },
      { title: "Send lender referral list",               taskType: "email",           priority: "medium", dueOffsetDays: 3 },
      { title: "Send buyer's market report",              taskType: "email",           priority: "low",    dueOffsetDays: 7 },
      { title: "30-day check-in call",                    taskType: "call",            priority: "medium", dueOffsetDays: 30, reminderOffsetMinutes: 1440 },
    ],
  },
  {
    name: "Listing Prep",
    description: "Pre-listing prep for a new seller client",
    appliesTo: "contact",
    items: [
      { title: "Schedule listing appointment",            taskType: "call",            priority: "high",   dueOffsetDays: 0,  reminderOffsetMinutes: 60   },
      { title: "Prepare CMA (comparative market analysis)", taskType: "document_review", priority: "high", dueOffsetDays: 1,  reminderOffsetMinutes: 1440 },
      { title: "Order pre-listing inspection",            taskType: "call",            priority: "high",   dueOffsetDays: 3,  reminderOffsetMinutes: 1440 },
      { title: "Schedule professional photography",       taskType: "call",            priority: "high",   dueOffsetDays: 5,  reminderOffsetMinutes: 1440 },
      { title: "Coordinate staging consultation",         taskType: "call",            priority: "medium", dueOffsetDays: 5 },
      { title: "Draft listing description and marketing copy", taskType: "document_review", priority: "medium", dueOffsetDays: 7 },
      { title: "Confirm sign install date",               taskType: "call",            priority: "medium", dueOffsetDays: 7 },
      { title: "Enter listing in MLS",                    taskType: "other",           priority: "high",   dueOffsetDays: 10, reminderOffsetMinutes: 1440 },
      { title: "Launch social media announcement",        taskType: "other",           priority: "medium", dueOffsetDays: 10 },
      { title: "First broker open house",                 taskType: "meeting_prep",    priority: "medium", dueOffsetDays: 14, reminderOffsetMinutes: 1440 },
    ],
  },
  {
    name: "New Lead Nurture",
    description: "30-day nurture sequence for a fresh lead",
    appliesTo: "contact",
    items: [
      { title: "Initial outreach call",                   taskType: "call",  priority: "high",   dueOffsetDays: 0,  reminderOffsetMinutes: 60   },
      { title: "Send personalized welcome email",         taskType: "email", priority: "medium", dueOffsetDays: 0 },
      { title: "Send neighborhood market report",         taskType: "email", priority: "medium", dueOffsetDays: 7 },
      { title: "Follow-up call: how's the search going?", taskType: "call",  priority: "medium", dueOffsetDays: 14, reminderOffsetMinutes: 1440 },
      { title: "Send featured listings email",            taskType: "email", priority: "low",    dueOffsetDays: 21 },
      { title: "30-day check-in",                         taskType: "call",  priority: "medium", dueOffsetDays: 30, reminderOffsetMinutes: 1440 },
    ],
  },
  {
    name: "Closing Preparation",
    description: "Final-stretch tasks for a deal under contract",
    appliesTo: "deal",
    items: [
      { title: "Confirm final loan approval",                  taskType: "call",  priority: "high",   dueOffsetDays: 1, reminderOffsetMinutes: 1440 },
      { title: "Coordinate final walk-through",                taskType: "call",  priority: "high",   dueOffsetDays: 2, reminderOffsetMinutes: 1440 },
      { title: "Confirm closing date and location",            taskType: "call",  priority: "high",   dueOffsetDays: 3, reminderOffsetMinutes: 1440 },
      { title: "Send closing day instructions to client",      taskType: "email", priority: "high",   dueOffsetDays: 5, reminderOffsetMinutes: 1440 },
      { title: "Confirm wire instructions received",           taskType: "email", priority: "high",   dueOffsetDays: 5, reminderOffsetMinutes: 1440 },
      { title: "Prepare closing gift",                         taskType: "other", priority: "medium", dueOffsetDays: 5 },
      { title: "Day-of: confirm attendance and timing",        taskType: "call",  priority: "high",   dueOffsetDays: 7, reminderOffsetMinutes: 60 },
      { title: "Post-close: thank you note + review request",  taskType: "email", priority: "medium", dueOffsetDays: 8 },
    ],
  },
];

export async function seedRealEstateTemplates(params: {
  organizationId: string;
  workspaceId: string | null;
  userId: string;
}): Promise<{ templatesCreated: number }> {
  const { organizationId, workspaceId, userId } = params;

  let count = 0;
  for (let i = 0; i < SPECS.length; i++) {
    const spec = SPECS[i];
    await db.taskTemplate.create({
      data: {
        organizationId,
        workspaceId,
        name: spec.name,
        description: spec.description,
        appliesTo: spec.appliesTo,
        sortOrder: i,
        createdBy: userId,
        tasks: {
          create: spec.items.map((item, idx) => ({
            title: item.title,
            taskType: item.taskType,
            priority: item.priority,
            dueOffsetDays: item.dueOffsetDays,
            reminderOffsetMinutes: item.reminderOffsetMinutes ?? null,
            sortOrder: idx,
          })),
        },
      },
    });
    count++;
  }

  return { templatesCreated: count };
}
