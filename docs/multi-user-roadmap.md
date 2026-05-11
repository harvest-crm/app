# Multi-User Data Isolation Roadmap

## Phase A — Shipped

Each member of an organization sees only their own records. Every list query, single-record permission check, and mutation is scoped to `ownerClerkUserId` (Contact, Deal, AiInsight) or `assignedToClerkUserId` (Task).

**What shipped:**
- `ownerClerkUserId` added to Contact, Deal, AiInsight; `assignedToClerkUserId` already existed on Task
- All new records auto-assigned to the creating user on create
- Backfill: all pre-existing records assigned to the org founding member
- `lib/access.ts`: `getVisibleUserIds`, `getAccessControl`, `ownerFilter`, `assigneeFilter`
- All list pages use `getAccessControl` + filter helpers: contacts, deals (kanban + list), tasks, today dashboard, contact detail insight
- All mutation server actions enforce ownership on `findFirst` before write
- Import and lead-capture contacts auto-assigned to importing user / org founder respectively
- AI insight generation (cron) sets `ownerClerkUserId` from the parent contact's owner
- Activity visibility inherited from parent contact/deal — `createdByClerkUserId` is attribution only, not access control

**Known gap:** If a member is deactivated, their records become invisible to all users including admins until Phase B ships. No auto-reassignment on deactivation.

---

## Phase B — Planned

**View-as toggle for admins and owners**

Privileged users (role = admin or owner) gain a "View as" selector in the UI that lets them see records as another member, or see everything across the org. The `getVisibleUserIds` helper already accepts `viewAsParam` and returns the right filter — no backend logic changes needed. Phase B is purely a UI addition (dropdown, URL param, breadcrumb indicator).

**Orphaned records admin queue**

Records where `ownerClerkUserId` does not match any active `OrganizationMember.isActive = true` become invisible to everyone in Phase A. Phase B will add an admin panel query surfacing these records for bulk reassignment. Structured log warning already emitted when a member is deactivated.

---

## Future

- Shared contacts: a contact visible to multiple specific users without being org-wide
- Team-owned records: assign a record to a group rather than an individual
- Audit log per record: who viewed, edited, reassigned

