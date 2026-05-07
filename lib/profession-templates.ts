import { Prisma } from "@/app/generated/prisma/client";
import { db } from "./db";

type StageInput = {
  name: string;
  sortOrder: number;
  isTerminal?: boolean;
  terminalOutcome?: string;
};

type TagInput = {
  name: string;
  color?: string;
};

type FieldInput = {
  entityType: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  options?: unknown;
  isRequired?: boolean;
  sortOrder: number;
};

export type AutomationTaskInput = {
  title: string;
  description?: string;
  taskType: string;
  priority: string;
  dueOffsetDays: number;
  reminderOffsetMinutes?: number;
  sortOrder: number;
};

type Template = {
  stages: StageInput[];
  tags: TagInput[];
  fields: FieldInput[];
};

const TEMPLATES: Record<string, Template> = {
  real_estate: {
    stages: [
      { name: "New Lead", sortOrder: 0 },
      { name: "Qualified", sortOrder: 1 },
      { name: "Showing/Listing", sortOrder: 2 },
      { name: "Offer", sortOrder: 3 },
      { name: "Under Contract", sortOrder: 4 },
      { name: "Closed Won", sortOrder: 5, isTerminal: true, terminalOutcome: "won" },
      { name: "Closed Lost", sortOrder: 6, isTerminal: true, terminalOutcome: "lost" },
    ],
    tags: [
      { name: "Buyer" }, { name: "Seller" }, { name: "First-Time Buyer" },
      { name: "Investor" }, { name: "Past Client" }, { name: "Sphere" },
      { name: "VA Loan" }, { name: "FHA" }, { name: "Cash Buyer" }, { name: "Referral" },
    ],
    fields: [
      { entityType: "contact", fieldKey: "price_range_min", fieldLabel: "Price Range Min", fieldType: "number", sortOrder: 0 },
      { entityType: "contact", fieldKey: "price_range_max", fieldLabel: "Price Range Max", fieldType: "number", sortOrder: 1 },
      { entityType: "contact", fieldKey: "neighborhoods", fieldLabel: "Neighborhoods", fieldType: "multiselect", options: { choices: [] }, sortOrder: 2 },
      { entityType: "contact", fieldKey: "beds", fieldLabel: "Beds", fieldType: "number", sortOrder: 3 },
      { entityType: "contact", fieldKey: "baths", fieldLabel: "Baths", fieldType: "number", sortOrder: 4 },
      { entityType: "contact", fieldKey: "timeline", fieldLabel: "Timeline", fieldType: "select", options: { choices: ["ASAP", "30 days", "60 days", "90 days", "6 months", "12 months"] }, sortOrder: 5 },
      { entityType: "deal", fieldKey: "property_address", fieldLabel: "Property Address", fieldType: "text", sortOrder: 0 },
      { entityType: "deal", fieldKey: "mls_number", fieldLabel: "MLS Number", fieldType: "text", sortOrder: 1 },
      { entityType: "deal", fieldKey: "commission_pct", fieldLabel: "Commission %", fieldType: "number", sortOrder: 2 },
      { entityType: "deal", fieldKey: "listing_side", fieldLabel: "Listing Side", fieldType: "select", options: { choices: ["buyer", "seller", "dual"] }, sortOrder: 3 },
    ],
  },

  web_design: {
    stages: [
      { name: "Inquiry", sortOrder: 0 }, { name: "Discovery", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 }, { name: "Negotiation", sortOrder: 3 },
      { name: "Won", sortOrder: 4, isTerminal: true, terminalOutcome: "won" },
      { name: "Lost", sortOrder: 5, isTerminal: true, terminalOutcome: "lost" },
    ],
    tags: [
      { name: "New Build" }, { name: "Redesign" }, { name: "Maintenance" },
      { name: "E-commerce" }, { name: "Faith-Based" }, { name: "Local Business" },
    ],
    fields: [
      { entityType: "deal", fieldKey: "project_type", fieldLabel: "Project Type", fieldType: "select", options: { choices: ["New Build", "Redesign", "Maintenance", "E-commerce"] }, sortOrder: 0 },
      { entityType: "deal", fieldKey: "budget_tier", fieldLabel: "Budget Tier", fieldType: "select", options: { choices: ["Under $1k", "$1k-$5k", "$5k-$15k", "$15k+"] }, sortOrder: 1 },
      { entityType: "deal", fieldKey: "tech_stack", fieldLabel: "Tech Stack", fieldType: "multiselect", options: { choices: ["WordPress", "Webflow", "Next.js", "Shopify", "Squarespace"] }, sortOrder: 2 },
      { entityType: "deal", fieldKey: "launch_target_date", fieldLabel: "Launch Target Date", fieldType: "date", sortOrder: 3 },
    ],
  },

  coaching: {
    stages: [
      { name: "Lead", sortOrder: 0 }, { name: "Discovery Call", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 }, { name: "Active Client", sortOrder: 3 },
      { name: "Completed", sortOrder: 4, isTerminal: true, terminalOutcome: "won" },
    ],
    tags: [{ name: "1:1" }, { name: "Group" }, { name: "Cohort" }, { name: "Past Client" }, { name: "Referral" }],
    fields: [],
  },

  consulting: {
    stages: [
      { name: "Inquiry", sortOrder: 0 }, { name: "Scoping", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 }, { name: "Engaged", sortOrder: 3 },
      { name: "Completed", sortOrder: 4, isTerminal: true, terminalOutcome: "won" },
    ],
    tags: [{ name: "Strategy" }, { name: "Implementation" }, { name: "Audit" }, { name: "Ongoing" }],
    fields: [],
  },

  generic: {
    stages: [
      { name: "Lead", sortOrder: 0 }, { name: "Qualified", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 },
      { name: "Won", sortOrder: 3, isTerminal: true, terminalOutcome: "won" },
      { name: "Lost", sortOrder: 4, isTerminal: true, terminalOutcome: "lost" },
    ],
    tags: [],
    fields: [],
  },
};

// ── Real Estate Residential automation templates ──────────────────────────────
// Exported so app/actions/automations.ts can reuse for the backfill feature.

export const REAL_ESTATE_RESIDENTIAL_STAGE_TEMPLATES: Array<{
  name: string;
  sortOrder: number;
  isTerminal?: boolean;
  terminalOutcome?: string;
  automationTasks: AutomationTaskInput[];
}> = [
  { name: "New Lead",           sortOrder: 0, automationTasks: [] },
  { name: "Qualified",          sortOrder: 1, automationTasks: [] },
  {
    name: "Showing Scheduled", sortOrder: 2,
    automationTasks: [
      { title: "Confirm showing time with client", taskType: "call",            priority: "high",   dueOffsetDays: 0, reminderOffsetMinutes: 60,   sortOrder: 0 },
      { title: "Pull comps for property",          taskType: "document_review", priority: "medium", dueOffsetDays: 0,                              sortOrder: 1 },
    ],
  },
  {
    name: "Offer Submitted", sortOrder: 3,
    automationTasks: [
      { title: "Follow up with listing agent",      taskType: "call",            priority: "high",   dueOffsetDays: 1, reminderOffsetMinutes: 1440, sortOrder: 0 },
      { title: "Prepare counter-offer scenarios",   taskType: "document_review", priority: "medium", dueOffsetDays: 2,                              sortOrder: 1 },
    ],
  },
  {
    name: "Under Contract", sortOrder: 4,
    automationTasks: [
      { title: "Send contract to client for signature", taskType: "email",        priority: "high",   dueOffsetDays: 0,  reminderOffsetMinutes: 60,   sortOrder: 0 },
      { title: "Order inspection",                      taskType: "call",         priority: "high",   dueOffsetDays: 2,  reminderOffsetMinutes: 1440, sortOrder: 1 },
      { title: "Order appraisal",                       taskType: "call",         priority: "high",   dueOffsetDays: 3,  reminderOffsetMinutes: 1440, sortOrder: 2 },
      { title: "Submit financing application",           taskType: "follow_up",    priority: "high",   dueOffsetDays: 5,  reminderOffsetMinutes: 1440, sortOrder: 3 },
      { title: "Option period ends",                     taskType: "meeting_prep", priority: "high",   dueOffsetDays: 10, reminderOffsetMinutes: 1440, sortOrder: 4 },
      { title: "Schedule final walk-through",            taskType: "call",         priority: "medium", dueOffsetDays: 25, reminderOffsetMinutes: 1440, sortOrder: 5 },
      { title: "Confirm closing date and location",      taskType: "call",         priority: "high",   dueOffsetDays: 28, reminderOffsetMinutes: 1440, sortOrder: 6 },
    ],
  },
  {
    name: "Closed Won", sortOrder: 5, isTerminal: true, terminalOutcome: "won",
    automationTasks: [
      { title: "Send thank-you note + closing gift",     taskType: "follow_up", priority: "medium", dueOffsetDays: 1,  sortOrder: 0 },
      { title: "Request review on Google + HAR",         taskType: "email",     priority: "medium", dueOffsetDays: 7,  reminderOffsetMinutes: 1440, sortOrder: 1 },
      { title: "Add to past-client nurture sequence",    taskType: "other",     priority: "low",    dueOffsetDays: 14, sortOrder: 2 },
    ],
  },
  {
    name: "Closed Lost", sortOrder: 6, isTerminal: true, terminalOutcome: "lost",
    automationTasks: [
      { title: "Log reason for loss in notes",        taskType: "other",     priority: "low", dueOffsetDays: 0,  sortOrder: 0 },
      { title: "Add to long-term nurture sequence",   taskType: "follow_up", priority: "low", dueOffsetDays: 30, sortOrder: 1 },
    ],
  },
];

// Same custom fields as real_estate
const REAL_ESTATE_RESIDENTIAL_FIELDS = TEMPLATES.real_estate.fields;
const REAL_ESTATE_RESIDENTIAL_TAGS   = TEMPLATES.real_estate.tags;

// ── Seeder ────────────────────────────────────────────────────────────────────

export async function seedWorkspaceTemplate(
  workspaceId: string,
  organizationId: string,
  professionTemplate: string,
) {
  if (professionTemplate === "real_estate_residential") {
    await seedRealEstateResidential(workspaceId, organizationId);
    return;
  }

  const template = TEMPLATES[professionTemplate] ?? TEMPLATES.generic;

  await db.$transaction([
    db.stage.createMany({
      data: template.stages.map((s) => ({
        workspaceId, name: s.name, sortOrder: s.sortOrder,
        isTerminal: s.isTerminal ?? false, terminalOutcome: s.terminalOutcome ?? null,
      })),
    }),
    ...(template.tags.length > 0 ? [
      db.tag.createMany({
        data: template.tags.map((t) => ({
          organizationId, name: t.name, color: t.color ?? "#64748B",
          professionScope: professionTemplate,
        })),
        skipDuplicates: true,
      }),
    ] : []),
    ...(template.fields.length > 0 ? [
      db.customFieldDefinition.createMany({
        data: template.fields.map((f) => ({
          organizationId, workspaceId, entityType: f.entityType,
          fieldKey: f.fieldKey, fieldLabel: f.fieldLabel, fieldType: f.fieldType,
          options: f.options ? (f.options as Prisma.InputJsonValue) : Prisma.DbNull,
          isRequired: f.isRequired ?? false, sortOrder: f.sortOrder,
        })),
        skipDuplicates: true,
      }),
    ] : []),
  ]);
}

async function seedRealEstateResidential(workspaceId: string, organizationId: string) {
  await db.$transaction(async (tx) => {
    // 1. Create stages individually to capture IDs
    for (const stageData of REAL_ESTATE_RESIDENTIAL_STAGE_TEMPLATES) {
      const stage = await tx.stage.create({
        data: {
          workspaceId, name: stageData.name, sortOrder: stageData.sortOrder,
          isTerminal: stageData.isTerminal ?? false,
          terminalOutcome: stageData.terminalOutcome ?? null,
        },
      });

      if (stageData.automationTasks.length > 0) {
        await tx.stageAutomation.create({
          data: {
            organizationId, workspaceId, stageId: stage.id, isEnabled: true,
            tasks: {
              create: stageData.automationTasks.map((t) => ({
                title: t.title,
                description: t.description ?? null,
                taskType: t.taskType,
                priority: t.priority,
                dueOffsetDays: t.dueOffsetDays,
                reminderOffsetMinutes: t.reminderOffsetMinutes ?? null,
                sortOrder: t.sortOrder,
              })),
            },
          },
        });
      }
    }

    // 2. Tags (same as real_estate)
    if (REAL_ESTATE_RESIDENTIAL_TAGS.length > 0) {
      await tx.tag.createMany({
        data: REAL_ESTATE_RESIDENTIAL_TAGS.map((t) => ({
          organizationId, name: t.name, color: t.color ?? "#64748B",
          professionScope: "real_estate_residential",
        })),
        skipDuplicates: true,
      });
    }

    // 3. Custom fields (same as real_estate)
    if (REAL_ESTATE_RESIDENTIAL_FIELDS.length > 0) {
      await tx.customFieldDefinition.createMany({
        data: REAL_ESTATE_RESIDENTIAL_FIELDS.map((f) => ({
          organizationId, workspaceId, entityType: f.entityType,
          fieldKey: f.fieldKey, fieldLabel: f.fieldLabel, fieldType: f.fieldType,
          options: f.options ? (f.options as Prisma.InputJsonValue) : Prisma.DbNull,
          isRequired: f.isRequired ?? false, sortOrder: f.sortOrder,
        })),
        skipDuplicates: true,
      });
    }
  });
}
