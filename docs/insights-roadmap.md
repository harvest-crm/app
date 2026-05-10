# Insights Roadmap

## Shipped

| Session | Signal | Status |
|---------|--------|--------|
| 1/3 | RE_ENGAGEMENT — active-stage contact, lastContactAt 14–90 days ago | Done |
| 1/3 | PREAPPROVAL_EXPIRING — buyer pre-approval expires within 30 days | Done |
| 1/3 | ANNIVERSARY — home anniversary within 30 days | Done |
| 2/3 | LLM message generation (replaces "Pending generation." stub) | Planned |
| 3/3 | Act-on-insight UI wiring (Send / Edit / Skip actions) | Planned |

---

## Future Rule Candidates

### NEVER_CONTACTED

**Signal:** A contact in an active lifecycle stage (`LEAD`, `WORKING`, `ACTIVE_BUYER`, `ACTIVE_SELLER`) has `lastContactAt = null` and was created at least N days ago.

**Distinction from RE_ENGAGEMENT:** `RE_ENGAGEMENT` requires `lastContactAt` to be non-null — it fires when contact went cold. `NEVER_CONTACTED` is the prior step: you added the lead but never reached out at all.

**Proposed behavior:**
- Default threshold: N = 7 days after `createdAt`
- N should be configurable (org-level setting or rule constant)
- Priority: `HIGH` — a lead sitting untouched for a week is high urgency
- Suggested message template: "You haven't reached out to {firstName} yet. They were added {N} days ago."
- Dedupe: same pattern — skip if a `PENDING` insight of type `NEVER_CONTACTED` already exists

**Out of scope:** Sessions 1, 2, and 3.

---

## Notes

- All rules run once daily at 6 AM Central via Vercel Cron (`0 12 * * *`).
- Dedupe key: `(contactId, organizationId, type, status = PENDING)` — one pending insight per signal per contact.
- Insights expire 30 days after generation (`expiresAt`). Expiry cleanup not yet implemented.
