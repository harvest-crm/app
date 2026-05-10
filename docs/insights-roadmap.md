# Insights Roadmap

## Shipped

| Session | Signal | Status |
|---------|--------|--------|
| 1/3 | RE_ENGAGEMENT — active-stage contact, lastContactAt 14–90 days ago | Done |
| 1/3 | PREAPPROVAL_EXPIRING — buyer pre-approval expires within 30 days | Done |
| 1/3 | ANNIVERSARY — home anniversary within 30 days | Done |
| 2/3 | LLM message generation (replaces "Pending generation." stub) | Done |
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
- Generation model: `claude-haiku-4-5-20251001` per rule (constant in `lib/insights/message-generator.ts`). Promote individual rules to Sonnet 4.6 if message quality warrants.
- Generation retries: `generationAttempts` increments on each failure; cron retries up to 3 times before abandoning.
- Sentinel values: `"Pending generation."` (not yet attempted) and `"__generation_failed"` (all attempts exhausted). UI hides the message sub-card for both.

### Watch-point: Vercel Hobby plan function timeout

Vercel Hobby limits serverless functions to **60 seconds**. The cron route runs detection + sequential LLM generation for all orgs. At ~1s per Haiku call with a 15s timeout ceiling, 60 contacts across 3 rules = up to 60s of generation alone. If the cron approaches the limit:

1. Separate detection and generation into two cron routes running back-to-back (detection at 06:00, generation at 06:05).
2. Or upgrade to Vercel Pro (300s limit).
3. Or batch generation into a background queue (more complex, not warranted until Phase 2 multi-tenancy).

Monitor `durationMs` in the cron response to catch this before it becomes a silent timeout.
