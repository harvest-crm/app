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
      { name: "Buyer" },
      { name: "Seller" },
      { name: "First-Time Buyer" },
      { name: "Investor" },
      { name: "Past Client" },
      { name: "Sphere" },
      { name: "VA Loan" },
      { name: "FHA" },
      { name: "Cash Buyer" },
      { name: "Referral" },
    ],
    fields: [
      { entityType: "contact", fieldKey: "price_range_min", fieldLabel: "Price Range Min", fieldType: "number", sortOrder: 0 },
      { entityType: "contact", fieldKey: "price_range_max", fieldLabel: "Price Range Max", fieldType: "number", sortOrder: 1 },
      {
        entityType: "contact",
        fieldKey: "neighborhoods",
        fieldLabel: "Neighborhoods",
        fieldType: "multiselect",
        options: { choices: [] },
        sortOrder: 2,
      },
      { entityType: "contact", fieldKey: "beds", fieldLabel: "Beds", fieldType: "number", sortOrder: 3 },
      { entityType: "contact", fieldKey: "baths", fieldLabel: "Baths", fieldType: "number", sortOrder: 4 },
      {
        entityType: "contact",
        fieldKey: "timeline",
        fieldLabel: "Timeline",
        fieldType: "select",
        options: { choices: ["ASAP", "30 days", "60 days", "90 days", "6 months", "12 months"] },
        sortOrder: 5,
      },
      { entityType: "deal", fieldKey: "property_address", fieldLabel: "Property Address", fieldType: "text", sortOrder: 0 },
      { entityType: "deal", fieldKey: "mls_number", fieldLabel: "MLS Number", fieldType: "text", sortOrder: 1 },
      { entityType: "deal", fieldKey: "commission_pct", fieldLabel: "Commission %", fieldType: "number", sortOrder: 2 },
      {
        entityType: "deal",
        fieldKey: "listing_side",
        fieldLabel: "Listing Side",
        fieldType: "select",
        options: { choices: ["buyer", "seller", "dual"] },
        sortOrder: 3,
      },
    ],
  },

  web_design: {
    stages: [
      { name: "Inquiry", sortOrder: 0 },
      { name: "Discovery", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 },
      { name: "Negotiation", sortOrder: 3 },
      { name: "Won", sortOrder: 4, isTerminal: true, terminalOutcome: "won" },
      { name: "Lost", sortOrder: 5, isTerminal: true, terminalOutcome: "lost" },
    ],
    tags: [
      { name: "New Build" },
      { name: "Redesign" },
      { name: "Maintenance" },
      { name: "E-commerce" },
      { name: "Faith-Based" },
      { name: "Local Business" },
    ],
    fields: [
      {
        entityType: "deal",
        fieldKey: "project_type",
        fieldLabel: "Project Type",
        fieldType: "select",
        options: { choices: ["New Build", "Redesign", "Maintenance", "E-commerce"] },
        sortOrder: 0,
      },
      {
        entityType: "deal",
        fieldKey: "budget_tier",
        fieldLabel: "Budget Tier",
        fieldType: "select",
        options: { choices: ["Under $1k", "$1k-$5k", "$5k-$15k", "$15k+"] },
        sortOrder: 1,
      },
      {
        entityType: "deal",
        fieldKey: "tech_stack",
        fieldLabel: "Tech Stack",
        fieldType: "multiselect",
        options: { choices: ["WordPress", "Webflow", "Next.js", "Shopify", "Squarespace"] },
        sortOrder: 2,
      },
      { entityType: "deal", fieldKey: "launch_target_date", fieldLabel: "Launch Target Date", fieldType: "date", sortOrder: 3 },
    ],
  },

  coaching: {
    stages: [
      { name: "Lead", sortOrder: 0 },
      { name: "Discovery Call", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 },
      { name: "Active Client", sortOrder: 3 },
      { name: "Completed", sortOrder: 4, isTerminal: true, terminalOutcome: "won" },
    ],
    tags: [
      { name: "1:1" },
      { name: "Group" },
      { name: "Cohort" },
      { name: "Past Client" },
      { name: "Referral" },
    ],
    fields: [],
  },

  consulting: {
    stages: [
      { name: "Inquiry", sortOrder: 0 },
      { name: "Scoping", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 },
      { name: "Engaged", sortOrder: 3 },
      { name: "Completed", sortOrder: 4, isTerminal: true, terminalOutcome: "won" },
    ],
    tags: [
      { name: "Strategy" },
      { name: "Implementation" },
      { name: "Audit" },
      { name: "Ongoing" },
    ],
    fields: [],
  },

  generic: {
    stages: [
      { name: "Lead", sortOrder: 0 },
      { name: "Qualified", sortOrder: 1 },
      { name: "Proposal", sortOrder: 2 },
      { name: "Won", sortOrder: 3, isTerminal: true, terminalOutcome: "won" },
      { name: "Lost", sortOrder: 4, isTerminal: true, terminalOutcome: "lost" },
    ],
    tags: [],
    fields: [],
  },
};

export async function seedWorkspaceTemplate(
  workspaceId: string,
  organizationId: string,
  professionTemplate: string,
) {
  const template = TEMPLATES[professionTemplate] ?? TEMPLATES.generic;

  await db.$transaction([
    db.stage.createMany({
      data: template.stages.map((s) => ({
        workspaceId,
        name: s.name,
        sortOrder: s.sortOrder,
        isTerminal: s.isTerminal ?? false,
        terminalOutcome: s.terminalOutcome ?? null,
      })),
    }),
    ...(template.tags.length > 0
      ? [
          db.tag.createMany({
            data: template.tags.map((t) => ({
              organizationId,
              name: t.name,
              color: t.color ?? "#64748B",
              professionScope: professionTemplate,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    ...(template.fields.length > 0
      ? [
          db.customFieldDefinition.createMany({
            data: template.fields.map((f) => ({
              organizationId,
              workspaceId,
              entityType: f.entityType,
              fieldKey: f.fieldKey,
              fieldLabel: f.fieldLabel,
              fieldType: f.fieldType,
              options: f.options ? (f.options as Prisma.InputJsonValue) : Prisma.DbNull,
              isRequired: f.isRequired ?? false,
              sortOrder: f.sortOrder,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}
