# Design: email notification on new problem submission

Date: 2026-09-22
Status: approved, ready for planning

## Problem

A submitted problem is born `approved: false` and nothing happens next. The only
way a teacher learns that something is waiting is to open the dashboard and look
at the **⏳ Pending** tab. If nobody looks, a submission sits indefinitely — the
submitter was told to expect review, and no review comes.

## Goal

When someone submits a problem, every super user gets an email within about five
minutes, with enough detail to triage from a phone and a link straight to the
review queue.

## Decisions taken during brainstorming

| Question | Decision | Reasoning |
|---|---|---|
| Channel | Email | Works everywhere, nothing to install, persists in the inbox until dealt with |
| Timing | Near-instant (~5 min) | Matches the actual need; a digest-only design leaves a Monday submission until Tuesday |
| Recipients | Everyone in `config/superusers.emails` | The list already exists; a second list would drift |
| Host | Cloudflare Workers | See "Host selection" below |
| Sender | Brevo | Only mainstream provider left with a permanent free tier (300/day) that verifies a *single sender address* rather than a whole domain — we do not control DNS for `dawsonschool.org` |
| Bursts | One digest email per poll cycle | A class of 30 submitting together produces one email, not thirty |
| Failure visibility | Weekly heartbeat email | Makes silence meaningful |

### Host selection

Firebase Cloud Functions was the natural first choice and was rejected: it
requires the Blaze plan, which requires a card on file. Expected cost was
$0.00/month (2M free invocations against ~50 used), but the project is funded by
a school card at a tax-exempt organisation, and the institutional friction of
putting that card on a Google Cloud billing account outweighs a feature of this
size. Latency was the only thing given up — seconds becomes ~5 minutes, which is
indistinguishable for a review queue.

Among the card-free options:

| | Cloudflare Workers | Netlify Functions | GitHub Actions |
|---|---|---|---|
| New account | Yes | Yes | No |
| Cron punctuality | On time | On time | 10–30 min late, sometimes skipped |
| Auto-disables | No | No | Yes, after 60 days without commits |
| Free tier | 100K req/day, stable for years | 125K/month, tightened over time | Unlimited on public repos |
| Free KV store | Yes | Yes (Blobs) | No |
| Runtime | V8 isolates (not Node) | Node | Node |

**Cloudflare won on security, not cost.** Every option must hold a Firebase
service-account key, which bypasses `firestore.rules` entirely — the thing
hardened in Phase 1. Cloudflare's free KV gives the poller its own place to
remember what it has already emailed, so the Firebase credential can be
**read-only**. Without a free KV store the natural design writes a `notifiedAt`
flag back into Firestore, forcing a write-capable key.

The cost of that choice is that Workers are not Node, so `firebase-admin` will
not run and the service-account auth path (JWT → OAuth token → Firestore REST)
is written by hand. That is roughly forty lines, written once, unit-testable,
and not the kind of code that spontaneously breaks.

GitHub Actions' 60-day auto-disable was the deciding objection against the
zero-new-account option: a summer break with no commits would silently switch
the notifier off, and it would stay off when school resumed.

## Architecture

A Cloudflare Worker in a new top-level `notifier/` directory in this repo,
deployed with Wrangler. The existing pipeline is untouched — GitHub Pages still
builds and deploys the site on push to `main`; the Worker deploys separately
with `wrangler deploy`, the same way `firestore.rules` deploys separately today.

```
Cloudflare cron (*/5 * * * *)  →  Worker.scheduled()
    ├─ KV read:   which problem IDs have I already emailed?
    ├─ Firestore: problems where approved == false
    ├─ partitionByReview()   ← imported from src/lib/moderation.ts
    ├─ new = pending IDs − already-emailed IDs
    ├─ if new is non-empty:
    │     ├─ Firestore: config/superusers → recipient list
    │     └─ Brevo: one digest email
    └─ KV write (only after the email succeeds)
```

The Worker performs **no Firestore writes**. That property is what keeps the
credential read-only, and it should be treated as an invariant of this design.

## How "new" is decided

Deliberately **not** a timestamp watermark. `createdAt` is set by `Date.now()` in
the submitter's browser (`src/components/SubmitWizard.tsx:158`). A device with a
slow clock would create a document stamped *behind* the watermark, and it would
be skipped silently and permanently — precisely the failure this feature exists
to prevent.

Instead, KV holds a **set of already-notified document IDs**, pruned every cycle
to only IDs still present in the pending set:

```
new       = currentPendingIds − storedIds
storedIds = (storedIds ∩ currentPendingIds) ∪ new     // written only after send
```

Properties:

- **Bounded** by the size of the review queue, not by elapsed time.
- **No clock dependency** — immune to client and server skew alike.
- **Self-healing** — a problem approved or rejected between cycles drops out of
  both sets naturally.
- **At-least-once.** If the email send fails, KV is not written and the next
  cycle retries. A duplicate email is an annoyance; a missed one defeats the
  feature. The bias is intentional.
- **First run seeds silently.** An empty KV means the Worker records the current
  pending IDs and sends nothing, rather than emailing the entire back catalogue.

### Query shape and cost

The query is `problems where approved == false`, with **no `orderBy`**, sorted in
the Worker. This matters for three reasons:

1. A single-field equality filter uses Firestore's automatic index, so
   `firestore.indexes.json` needs no change. (The existing composite is
   `approved ASC + createdAt DESC`, which would not serve an ascending sort
   anyway.)
2. It returns only pending + rejected documents — a small set — so 288 polls/day
   costs a few thousand of the 50,000 free daily reads.
3. Polling *unfiltered* would have exceeded the free read quota once the bank
   passed roughly 170 problems. Filtering is not an optimisation here; it is a
   correctness requirement for staying inside the free tier.

`partitionByReview` from `src/lib/moderation.ts` separates pending from rejected.
That module is pure TypeScript with zero imports, so the Worker imports it
directly and the definition of "pending" stays in one already-tested place.

## Modules

| File | Responsibility | Test strategy |
|---|---|---|
| `notifier/src/selection.ts` | The set logic above. Pure. | Unit |
| `notifier/src/email.ts` | `buildDigest(problems, pendingCount)` and `buildHeartbeat(pendingCount)` → `{subject, text, html}`. Pure. | Unit |
| `notifier/src/firestore.ts` | Service-account JWT (RS256 via WebCrypto `SubtleCrypto`) → Google OAuth2 token → Firestore REST `runQuery` and `get`. | Injected `fetch` |
| `notifier/src/brevo.ts` | One POST to Brevo's transactional endpoint. | Injected `fetch` |
| `notifier/src/index.ts` | `scheduled()` handler. Orchestration only; no business logic. | Manual + dry run |
| `src/lib/dashboardTabs.ts` | `initialTab(search, isSuperUser)` — parses `?tab=`. Pure. | Unit |

The root `npm test` glob extends to cover `notifier/src/**/*.test.ts`, so CI runs
these and a broken notifier blocks deployment like any other failing test.

**HTML escaping is a requirement, not a nicety.** Titles and descriptions are
anonymous, unauthenticated user input being interpolated into an HTML email.
`buildDigest` escapes them, and the test suite includes a title containing
`<script>`.

## Email content

Enough to triage from a phone, then one tap to act. The submitter's contact
address is **deliberately omitted** — it is PII, it is already in the app, and
email inboxes retain it indefinitely.

```
Subject: New problem submitted — Cafeteria line backs up at 11:40

A new problem is waiting for review.

  Cafeteria line backs up at 11:40
  From: Jamie Rivera (Student)
  Severity: High · Space & Facilities, Time

  The single serving line means the last 40 students
  get under 10 minutes to eat before 5th period...

  → Review it
     csuter931.github.io/design-problem-bank/dashboard/?tab=pending

2 problems are now waiting for review.
```

When a cycle finds several, the email lists each with the same three-line block
and the subject becomes `3 new problems submitted`.

## Dashboard change

`?tab=pending` opens the review queue directly, so the email's link lands where
the teacher needs to be. Parsing lives in a pure `initialTab()` helper; the
existing effect at `src/components/StudentDashboard.tsx:108` already forces
non-super-users back to Available, so the parameter degrades safely for anyone
else who receives a forwarded link.

## Heartbeat

A second cron, `0 14 * * 1`. Cloudflare cron is UTC-only, so this is Monday 7am
Mountain in winter and 8am in summer; the drift is accepted in preference to
maintaining two schedules. It sends one email either way — "nothing pending,
notifier healthy" or "N still waiting for review" — so that silence on a Monday
is itself a signal. It also surfaces anything approved-later-and-forgotten.

The heartbeat is **read-only with respect to KV**: it reports the pending count
and does not touch the already-notified set. A Monday heartbeat and a 5-minute
poll firing in the same minute are therefore independent, and neither can cause
the other to skip a submission.

## Setup and secrets

Three one-time accounts, all free, no card anywhere:

1. **GCP service account** `problem-notifier@dawson-problem-bank-24a9c.iam.gserviceaccount.com`,
   granted `roles/datastore.viewer` only. A leak of this key would expose pending
   and rejected submissions and submitter contact details for reading; it could
   not write or delete anything.
2. **Cloudflare** — one Worker, one KV namespace. Both the service-account JSON
   and the Brevo API key are set via `wrangler secret put` and never enter the
   repo.
3. **Brevo** — account plus a verified sender address.

The implementation plan carries the step-by-step runbook for all three.

## Known risks

- **Deliverability.** Mail sent through Brevo "from" a `dawsonschool.org` address
  is not DKIM-aligned with that domain, so Gmail may classify it as spam.
  Mitigation is a one-time Gmail filter; verifying first-run delivery is an
  explicit step in the runbook.
- **Legacy documents missing `approved` entirely** would not match the query.
  Only possible for pre-moderation documents, and that collection was empty when
  the hardened rules were deployed on 2026-09-03. Noted, not fixed.
- **Rejected problems accumulate** in the query result over years, slowly raising
  the per-poll read count. Tens per year; revisit only if it becomes material.
- **Duplicate email** if the Brevo send succeeds but the subsequent KV write
  fails. Rare, and the accepted side of the at-least-once trade.

## Out of scope

- Notifications for claims, comments, upvotes, or status changes.
- Per-teacher notification preferences or an unsubscribe flow. The recipient list
  is `config/superusers`, edited in the Firebase console.
- Any Firestore write from the Worker.
- Changing the Firebase billing plan.
