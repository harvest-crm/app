# Closed Beta Roadmap

## Shipped

- `accessStatus` enum (PENDING, APPROVED, REJECTED) and `tier` enum (INTERNAL, LIFETIME_FREE, BROKERAGE, STANDARD) on Organization
- Layout-level access gate in `app/(app)/layout.tsx` — PENDING redirects to `/pending`, REJECTED to `/rejected`, platform admins bypass both
- `/pending` and `/rejected` holding pages with sign-out button
- `/admin/organizations/pending` approval queue with inline tier selector, Approve and Reject actions
- Badge on Organizations nav in admin sidebar showing count of pending applications
- Sidebar feedback link to thomas@dstormpg.com

## Deferred

- Email notification to thomas@dstormpg.com on new signup (new org webhook fires, send alert). Deferred until beta grows beyond 12 users and manual queue checking becomes impractical.

## Before Public Launch

- Harden `requireOrg()` in `lib/auth.ts` to check `accessStatus === APPROVED` and throw/redirect on PENDING or REJECTED. Server actions and API routes currently bypass the layout-level gate — a savvy user could call server actions directly if they know the endpoint. Acceptable for private beta with known users; not acceptable before public launch.

- Wire tier to Stripe billing: map OrgTier values to Stripe price IDs, check limits server-side (contact count cap, workspace count cap, seat count cap per tier).

- Stripe webhook handler to sync subscription status back to `tier` and `accessStatus` on cancellation.
