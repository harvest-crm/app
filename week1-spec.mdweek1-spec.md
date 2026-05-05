# Week 1 Spec: Harvest-CRM Foundation

## Project context

Building Harvest-CRM, a multi-tenant CRM for solo founders and professionals across multiple verticals. Phase 1 is single-user (me) but architecture is SaaS-ready with `organization_id` scoping on every table. Real estate is the primary go-to-market vertical, but the product supports profession templates for web design, coaching, consulting, and generic.

Internal working name only. No public branding decisions yet.

## Stack

- Next.js 14 App Router + TypeScript
- Neon (serverless Postgres) — connection string in env
- Clerk for auth (organizations, multi-tenancy, magic links built in)
- Cloudflare R2 for file storage (deferred to week 3, no setup needed yet)
- Prisma ORM (use `db push`, not migrations)
- Tailwind CSS + shadcn/ui
- Vercel deploy
- Domain: crm.dstormconsulting.com

## Repo

`harvest-crm/app` under a dedicated `harvest-crm` GitHub org.

## Important architecture note: Clerk handles organizations natively

Clerk provides a built-in Organization concept with members, roles, and switching. We map Clerk Organizations to our app's tenancy:

- Clerk Organization ID stored as `clerkOrgId` on our `Organization` table
- Clerk User ID stored as `clerkUserId` on `OrganizationMember`
- Use Clerk's `<OrganizationSwitcher />` component or build our own using `useOrganization()` hook
- All our queries scope by our internal `organizationId` (cuid), looked up from `clerkOrgId` on the active session
- 2FA is deferred to Phase 2 (requires Clerk Pro upgrade)

## Week 1 goals

1. Scaffold Next.js + Prisma + Neon + Clerk
2. Build the full data model (15 tables, all with `organizationId`)
3. Clerk auth wired up with organizations
4. Auto-sync Clerk Organization to our `Organization` table on first login (webhook)
5. Workspace switcher in nav with profession template chooser
6. Contacts: list view, detail view, full CRUD
7. Tags: org-scoped, with CRUD and apply-to-contact UI
8. Profession template seeder (real_estate, web_design, coaching, consulting, generic)

## Environment variables expected

```env
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
```

## Data model (Prisma schema)

```prisma
model Organization {
  id         String   @id @default(cuid())
  clerkOrgId String   @unique
  name       String
  plan       String   @default("free")
  createdAt  DateTime @default(now())

  members                OrganizationMember[]
  workspaces             Workspace[]
  contacts               Contact[]
  deals                  Deal[]
  activities             Activity[]
  tasks                  Task[]
  tags                   Tag[]
  customFieldDefinitions CustomFieldDefinition[]
  documents              Document[]
}

model OrganizationMember {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  clerkUserId    String
  email          String
  role           String       @default("owner")
  createdAt      DateTime     @default(now())

  @@unique([organizationId, clerkUserId])
}

model Workspace {
  id                 String       @id @default(cuid())
  organizationId     String
  organization       Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name               String
  slug               String
  color              String       @default("#1E293B")
  professionTemplate String
  webhookToken       String       @unique
  sortOrder          Int          @default(0)
  createdAt          DateTime     @default(now())

  stages                 Stage[]
  contactWorkspaces      ContactWorkspace[]
  deals                  Deal[]
  activities             Activity[]
  tasks                  Task[]
  customFieldDefinitions CustomFieldDefinition[]
  documents              Document[]

  @@unique([organizationId, slug])
}

model Contact {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  firstName       String
  lastName        String?
  email           String?
  phone           String?
  birthday        DateTime?
  homeAnniversary DateTime?
  source          String?
  sourceDetail    String?
  temperature     String       @default("warm")
  notes           String?      @db.Text
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  contactWorkspaces ContactWorkspace[]
  contactTags       ContactTag[]
  deals             Deal[]
  activities        Activity[]
  tasks             Task[]
  documents         Document[]

  @@index([organizationId])
}

model ContactWorkspace {
  id          String    @id @default(cuid())
  contactId   String
  contact     Contact   @relation(fields: [contactId], references: [id], onDelete: Cascade)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  roleLabel   String?
  addedAt     DateTime  @default(now())

  @@unique([contactId, workspaceId])
}

model Stage {
  id              String    @id @default(cuid())
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  name            String
  sortOrder       Int
  isTerminal      Boolean   @default(false)
  terminalOutcome String?

  deals Deal[]
}

model Deal {
  id                String       @id @default(cuid())
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  workspaceId       String
  workspace         Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  contactId         String?
  contact           Contact?     @relation(fields: [contactId], references: [id])
  stageId           String
  stage             Stage        @relation(fields: [stageId], references: [id])
  title             String
  value             Decimal?     @db.Decimal(12, 2)
  expectedCloseDate DateTime?
  status            String       @default("open")
  notes             String?      @db.Text
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  activities Activity[]
  tasks      Task[]
  documents  Document[]

  @@index([organizationId, workspaceId])
}

model Activity {
  id                   String       @id @default(cuid())
  organizationId       String
  organization         Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  workspaceId          String?
  workspace            Workspace?   @relation(fields: [workspaceId], references: [id])
  contactId            String?
  contact              Contact?     @relation(fields: [contactId], references: [id])
  dealId               String?
  deal                 Deal?        @relation(fields: [dealId], references: [id])
  type                 String
  body                 String       @db.Text
  occurredAt           DateTime     @default(now())
  createdByClerkUserId String?
  createdAt            DateTime     @default(now())

  @@index([organizationId])
  @@index([contactId])
  @@index([dealId])
}

model Task {
  id                    String       @id @default(cuid())
  organizationId        String
  organization          Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  workspaceId           String
  workspace             Workspace    @relation(fields: [workspaceId], references: [id])
  contactId             String?
  contact               Contact?     @relation(fields: [contactId], references: [id])
  dealId                String?
  deal                  Deal?        @relation(fields: [dealId], references: [id])
  title                 String
  dueAt                 DateTime?
  completedAt           DateTime?
  assignedToClerkUserId String?
  createdAt             DateTime     @default(now())

  @@index([organizationId, dueAt])
}

model Tag {
  id              String       @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  name            String
  color           String       @default("#64748B")
  professionScope String?

  contactTags ContactTag[]

  @@unique([organizationId, name])
}

model ContactTag {
  contactId String
  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)
  tagId     String
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([contactId, tagId])
}

model CustomFieldDefinition {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  workspaceId    String?
  workspace      Workspace?   @relation(fields: [workspaceId], references: [id])
  entityType     String
  fieldKey       String
  fieldLabel     String
  fieldType      String
  options        Json?
  isRequired     Boolean      @default(false)
  sortOrder      Int          @default(0)
  createdAt      DateTime     @default(now())

  values CustomFieldValue[]

  @@unique([organizationId, workspaceId, entityType, fieldKey])
}

model CustomFieldValue {
  id           String                @id @default(cuid())
  definitionId String
  definition   CustomFieldDefinition @relation(fields: [definitionId], references: [id], onDelete: Cascade)
  entityType   String
  entityId     String
  value        Json

  @@unique([definitionId, entityId])
  @@index([entityType, entityId])
}

model Document {
  id             String       @id @default(cuid())
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  workspaceId    String
  workspace      Workspace    @relation(fields: [workspaceId], references: [id])
  contactId      String?
  contact        Contact?     @relation(fields: [contactId], references: [id])
  dealId         String?
  deal           Deal?        @relation(fields: [dealId], references: [id])
  r2Key          String
  fileName       String
  fileSize       Int
  mimeType       String
  uploadedAt     DateTime     @default(now())
}
```

## Auth flow with Clerk

1. User signs up via Clerk's hosted page or embedded `<SignUp />` component
2. Clerk requires every user to belong to an organization (configured), so first-time users are prompted to create one
3. Clerk webhook fires `organization.created` → handler creates `Organization` row with `clerkOrgId`
4. Clerk webhook fires `organizationMembership.created` → handler creates `OrganizationMember` row
5. On every request, Clerk middleware exposes `auth().orgId` (Clerk org ID), look up our internal `organizationId` and scope queries
6. Webhook endpoint: `POST /api/webhooks/clerk` — verify with svix using `CLERK_WEBHOOK_SECRET`

## Profession templates (seeder)

When a workspace is created, seed default Stages, Tags, and CustomFieldDefinitions based on `professionTemplate`:

**real_estate**
- Stages: New Lead, Qualified, Showing/Listing, Offer, Under Contract, Closed Won, Closed Lost (terminal)
- Tags: Buyer, Seller, First-Time Buyer, Investor, Past Client, Sphere, VA Loan, FHA, Cash Buyer, Referral
- Contact custom fields: price_range_min (number), price_range_max (number), neighborhoods (multiselect), beds (number), baths (number), timeline (select: ASAP, 30 days, 60 days, 90 days, 6 months, 12 months)
- Deal custom fields: property_address (text), mls_number (text), commission_pct (number), listing_side (select: buyer, seller, dual)

**web_design**
- Stages: Inquiry, Discovery, Proposal, Negotiation, Won, Lost (terminal)
- Tags: New Build, Redesign, Maintenance, E-commerce, Faith-Based, Local Business
- Deal custom fields: project_type (select), budget_tier (select), tech_stack (multiselect), launch_target_date (date)

**coaching**
- Stages: Lead, Discovery Call, Proposal, Active Client, Completed
- Tags: 1:1, Group, Cohort, Past Client, Referral

**consulting**
- Stages: Inquiry, Scoping, Proposal, Engaged, Completed
- Tags: Strategy, Implementation, Audit, Ongoing

**generic**
- Stages: Lead, Qualified, Proposal, Won, Lost (terminal)
- Tags: empty

## UI structure

```
/app
  /(auth)
    /sign-in/[[...sign-in]]
    /sign-up/[[...sign-up]]
  /(app)
    layout.tsx
    /                   # redirects to /today
    /today              # stub for week 1
    /contacts
    /contacts/[id]
    /contacts/new
    /workspaces/[slug]
      /
      /deals            # week 2
      /tasks            # week 3
    /tags
    /settings
      /profile
      /workspaces
      /custom-fields    # week 2
  /api
    /webhooks/clerk     # syncs Clerk orgs/users to our DB
```

## Conventions

- Server actions for mutations, not API routes
- React Hook Form + Zod for form state
- All queries scoped to `organizationId` derived from Clerk's active org
- No em dashes or hyphens in user-facing copy
- shadcn/ui components only
- TypeScript strict mode

## Week 1 deliverables

- [ ] Repo initialized with `pnpm create next-app@latest`
- [ ] Prisma schema written, `db push` run successfully against Neon
- [ ] Clerk middleware configured
- [ ] Clerk webhook receiving organization and membership events
- [ ] Sign-up flow working end-to-end (create user, create org, both synced to DB)
- [ ] Workspace CRUD with profession template chooser
- [ ] Profession template seeder for all 5 templates
- [ ] Workspace switcher in top nav (using Clerk's component)
- [ ] Contacts list with search and workspace filter
- [ ] Contact detail page with workspace memberships displayed
- [ ] Contact create/edit/delete
- [ ] Tags CRUD
- [ ] Apply tags to contacts UI

## Non-goals for Week 1

Skip everything not on the deliverables list. No deals, no kanban, no custom fields UI, no activities, no tasks, no documents, no CSV import, no webhooks beyond Clerk's, no search.

## Start here

1. Initialize project: `pnpm create next-app@latest .` (TypeScript yes, Tailwind yes, App Router yes, ESLint yes, src dir no, import alias `@/*`)
2. Install Prisma, Clerk SDK, shadcn/ui, react-hook-form, zod, svix
3. Set up Prisma schema pointing at Neon
4. Run `prisma db push`
5. Wire up Clerk middleware
6. Build the webhook handler first so org sync works
7. Build sign-up flow and verify a user + org sync to the DB
8. Then proceed through deliverables
