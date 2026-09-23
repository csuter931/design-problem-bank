# Design: email notification on new problem submission

Date: 2026-09-22
Status: approved, ready for planning

> **Post-review correction (2026-09-23).** This design and its "Credentials"
> decision below assumed a read-only Firestore OAuth scope existed. It does
> not: Firestore's REST API accepts exactly two scopes, `datastore` and
> `cloud-platform` — both write-capable — and rejects
> `cloud-platform.read-only` with `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`. Found
> during the feature's final review, before first deploy. The manifest now
> declares `datastore`; the "notifier never writes" guarantee is enforced by
> code (`notifier/src/env.ts`, `notifier/src/firestore.ts`) and the test
> suite, not by the OAuth scope. The sections below are corrected in place —
> nothing past this note still claims the old, unachievable guarantee.

> **Post-rebase reconciliation (2026-09-23).** "Email content" below argued
> that the submitter's contact address must be deliberately left out of the
> email because it is PII. While this branch was in flight, `main` merged
> commit `a680d00`, which moved `submitterContact` (and `internalNotes`) off
> the `problems/{id}` document entirely, into a `problems/{id}/private/detail`
> subcollection readable only by a signed-in Dawson account (see
> `src/lib/privateDetail.ts`). This notifier's `runQuery` reads only
> `problems/{id}`, so the contact is no longer something it chooses to omit —
> it is something it cannot see. "Email content" is corrected in place to
> say so. This does not retire the `toPending` allowlist in
> `notifier/src/main.ts`: that allowlist is what stops some other field —
> present today or added later — from reaching an email body, and is still
> the reason a reader can trust the email builder without re-checking it
> against the current document shape.

## Problem

A submitted problem is born `approved: false` and nothing happens next. The only
way a teacher learns that something is waiting is to open the dashboard and look
at the **⏳ Pending** tab. If nobody looks, a submission sits indefinitely — the
submitter was told to expect review, and no review comes.

## Goal

When someone submits a problem, every super user gets an email within about five
minutes, with enough detail to triage from a phone and a link straight to the
review queue.

## Decisions

| Question | Decision | Reasoning |
|---|---|---|
| Channel | Email | Works everywhere, nothing to install, persists in the inbox until dealt with |
| Timing | Near-instant (~5 min poll) | A digest-only design leaves a Monday-afternoon submission until Tuesday |
| Recipients | Everyone in `config/superusers.emails` | The list already exists; a second list would drift |
| Host | **Google Apps Script** | See "How we got here" |
| Sender | `csupiro@dawsonschool.org`, display name "Dawson Problem Bank" | Google sends it, so it authenticates natively |
| Credentials | **None stored** | `ScriptApp.getOAuthToken()`, scoped to `datastore` — the narrowest Firestore scope Google offers; there is no read-only one |
| Bursts | One digest email per poll cycle | A class of 30 submitting together produces one email, not thirty |
| Failure visibility | Weekly heartbeat email | Makes silence meaningful |

## How we got here

The design moved three times, each time on evidence rather than preference. The
chain is recorded because the rejected options are all reasonable and someone
will reasonably propose them again.

**Firebase Cloud Functions** was the natural first choice — a Firestore
`onDocumentCreated` trigger, instant, inside the project we already run.
Rejected because it requires the Blaze plan and therefore a card on file.
Expected cost was genuinely $0.00/month (2M free invocations against ~50 used),
but the project is funded by a school card at a tax-exempt organisation, and the
institutional friction of attaching that card to a Google Cloud billing account
outweighs a feature this size. The only thing given up was latency — seconds
becomes ~5 minutes, which is indistinguishable for a review queue.

**Cloudflare Workers** was then chosen over Netlify and GitHub Actions. GitHub
Actions lost on its 60-day auto-disable: a summer break with no commits would
silently switch the notifier off and leave it off when school resumed. Netlify
lost on free-tier durability. Cloudflare won on a security argument — its free
KV store meant the Firebase service-account key could be read-only, where a
host without free storage forces a `notifiedAt` write back into Firestore and a
write-capable key.

**Apps Script** then displaced Cloudflare on two findings.

The first was a DNS lookup. `dawsonschool.org` publishes:

```
_dmarc.dawsonschool.org   v=DMARC1; p=quarantine; pct=100; rua=mailto:admin@dawsonschool.org
dawsonschool.org          v=spf1 ...:_spf.google.com ... -all
MX                        Google Workspace
```

Any third-party sender emitting mail with `From: …@dawsonschool.org` fails SPF
(hard `-all`, and no Brevo include) and fails DKIM alignment (Brevo signs with
its own domain). DMARC therefore fails, and the published policy quarantines
100% of it. A user-level Gmail filter does not reliably override a domain
owner's quarantine policy, and the hardest case is the one we would have been
in — From and To both `@dawsonschool.org`, which Workspace's inbound spoofing
protection guards most aggressively. Worse, `rua=mailto:admin@dawsonschool.org`
means Dawson's IT administrator receives aggregate reports naming the third
party as an unauthorised sender spoofing the school domain.

The second finding removed the credential entirely. Apps Script can call the
Firestore REST API with `ScriptApp.getOAuthToken()` — the owner's own Google
identity — so there is **no service-account key to store, leak, or rotate**.
The manifest declares the `datastore` scope, the narrowest one Firestore's
REST API accepts; there is no read-only variant, so the scope alone cannot
make a write impossible. The safety property is the code instead: no write
call exists in `notifier/src/firestore.ts`, and the test suite pins that.
That is weaker than "impossible by construction", but going without a stored
key at all is still strictly better than the Cloudflare design, which needed
one.

Accepted in exchange: the script belongs to a person rather than to the school
(see Risks), and the build is fiddlier than `wrangler deploy`.

## Architecture

An Apps Script project, source-controlled in a new top-level `notifier/`
directory and pushed with `clasp`. The existing pipeline is untouched — GitHub
Pages still builds and deploys the site on push to `main`; the notifier deploys
separately, the same way `firestore.rules` deploys separately today.

Two time-driven triggers, two entry points:

```
Trigger: every 5 minutes  →  pollForNewSubmissions()
    ├─ PropertiesService:  which problem IDs have I already emailed?
    ├─ UrlFetchApp:        Firestore runQuery, problems where approved == false
    ├─ partitionByReview()  ← imported from src/lib/moderation.ts
    ├─ new = pending IDs − already-emailed IDs
    ├─ if new is non-empty:
    │     ├─ UrlFetchApp:  config/superusers → recipient list
    │     └─ MailApp:      one digest email
    └─ PropertiesService write (only after the email sends)

Trigger: Mondays 07:00  →  weeklyHeartbeat()
    └─ pending count → one email either way; does not touch stored state
```

The script performs **no Firestore writes**. Firestore's OAuth scopes offer no
read-only option, so this is enforced by code rather than by the API: the
`env.ts` seam is the only place a write call could be added, `firestore.ts`
contains no such call, and the test suite exercises every branch. Treat it as
an invariant anyway — adding a write would compile and deploy cleanly, so
catching it is review's job now, not the scope's.

### Authentication

`ScriptApp.getOAuthToken()` returns a short-lived token for the signed-in
owner, passed as `Authorization: Bearer …` to
`https://firestore.googleapis.com/v1/projects/dawson-problem-bank-24a9c/databases/(default)/documents:runQuery`.

Because this is the owner's Google identity acting through IAM, Firestore
security rules are bypassed — the same as any admin access — so pending and
rejected documents are readable. The `appsscript.json` manifest declares:

- `https://www.googleapis.com/auth/datastore` — Firestore reads (the narrowest
  scope Firestore's REST API accepts; there is no read-only variant — see the
  correction note at the top of this document)
- `https://www.googleapis.com/auth/script.external_request` — `UrlFetchApp`
- `https://www.googleapis.com/auth/script.send_mail` — `MailApp`

This requires attaching the Apps Script project to the standard GCP project
`dawson-problem-bank-24a9c` rather than its default hidden one. That project's
OAuth consent screen is **already configured** — Google Sign-in works on the
live site today — which removes the most likely setup snag.

## How "new" is decided

Deliberately **not** a timestamp watermark. `createdAt` is set by `Date.now()` in
the submitter's browser (`src/components/SubmitWizard.tsx:158`). A device with a
slow clock would create a document stamped *behind* the watermark, and it would
be skipped silently and permanently — precisely the failure this feature exists
to prevent.

Instead, `PropertiesService` holds a **set of already-notified document IDs**,
pruned every cycle to only IDs still present in the pending set:

```
new    = currentPendingIds − storedIds
stored = (storedIds ∩ currentPendingIds) ∪ new     // written only after send
```

Properties:

- **Bounded** by the size of the review queue, not by elapsed time.
- **No clock dependency** — immune to client and server skew alike.
- **Self-healing** — a problem approved or rejected between cycles drops out of
  both sets naturally.
- **At-least-once.** If the send fails, stored state is not written and the next
  cycle retries. A duplicate email is an annoyance; a missed one defeats the
  feature. The bias is intentional.
- **First run seeds silently.** Empty stored state means the script records the
  current pending IDs and sends nothing, rather than emailing the back
  catalogue.

`PropertiesService` caps a single property value at 9 KB, which holds roughly
390 document IDs. A review queue will never approach that, but the writer prunes
oldest-first if it ever would, rather than throwing.

### Query shape and cost

The query is `problems where approved == false`, with **no `orderBy`**, sorted in
the script. This matters for three reasons:

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
That module is pure TypeScript with zero imports, so the notifier imports it
directly and the definition of "pending" stays in one already-tested place.

## Modules

| File | Responsibility | Test strategy |
|---|---|---|
| `notifier/src/selection.ts` | The set logic above. Pure. | Unit |
| `notifier/src/email.ts` | `buildDigest(problems, pendingCount)` and `buildHeartbeat(pendingCount)` → `{subject, text, html}`. Pure. | Unit |
| `notifier/src/firestore.ts` | Builds the `runQuery` body; parses Firestore's typed-value JSON into plain objects. Takes an injected `(url, options) => {status, body}` so it never names `UrlFetchApp`. | Unit with a fake |
| `notifier/src/main.ts` | `poll()` and `heartbeat()` — orchestration only. | Manual |
| `notifier/src/env.ts` | The only file touching `UrlFetchApp`, `MailApp`, `ScriptApp`, `PropertiesService`. | Not tested |
| `src/lib/dashboardTabs.ts` | `initialTab(search, isSuperUser)` — parses `?tab=`. Pure. | Unit |

The root `npm test` glob extends to cover `notifier/src/**/*.test.ts`, so CI runs
these and a broken notifier blocks deployment like any other failing test.

Confining every Apps Script global to `env.ts` is what makes the rest testable
in plain Node, and is also what would make a later move off Apps Script cheap —
roughly fifty lines would be rewritten and nothing else.

**HTML escaping is a requirement, not a nicety.** Titles and descriptions are
anonymous, unauthenticated user input being interpolated into an HTML email.
`buildDigest` escapes them, and the test suite includes a title containing
`<script>`.

### Build

Apps Script does not support ES modules, so `esbuild` bundles
`notifier/src/main.ts` into a single flat `notifier/build/Code.js`, and a footer
exposes the two trigger entry points as globals:

```js
function pollForNewSubmissions() { return notifier.poll() }
function weeklyHeartbeat()       { return notifier.heartbeat() }
```

`clasp push` from `notifier/build` deploys. `notifier/build/` is gitignored; the
source of truth is `notifier/src`.

## Email content

Enough to triage from a phone, then one tap to act. The submitter's contact
address never appears — it lives in `problems/{id}/private/detail`, not on
the `problems/{id}` document this notifier queries, so there is nothing to
omit at the point the email is built (see the reconciliation note at the top
of this document). It would still be wrong to email regardless: it's PII,
it's already in the app, and inboxes retain it indefinitely — which is why
`notifier/src/main.ts`'s `toPending` allowlist stays in place as defence in
depth, guarding against some other field, present today or added later,
reaching an email body.

```
From:    Dawson Problem Bank <csupiro@dawsonschool.org>
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

A weekly trigger, Mondays at 07:00. The manifest sets
`"timeZone": "America/Denver"`, so this is genuinely 7am Mountain year-round
rather than drifting with daylight saving.

It sends one email either way — "nothing pending, notifier healthy" or "N still
waiting for review" — so that silence on a Monday is itself a signal. It also
surfaces anything approved-later-and-forgotten.

The heartbeat is **read-only with respect to stored state**: it reports the
pending count and does not touch the already-notified set. A Monday heartbeat
and a 5-minute poll firing in the same minute are therefore independent, and
neither can cause the other to skip a submission.

Google separately emails a daily failure summary when a script throws, which
covers errors. The heartbeat covers the case failure emails do not: a trigger
that has quietly stopped firing at all.

## Setup

No new accounts and no stored credentials. One-time steps, all in the runbook
the implementation plan will carry:

1. Create the Apps Script project and attach it to GCP project
   `dawson-problem-bank-24a9c`.
2. Set the manifest scopes and timezone; authorise once.
3. Create the two time-driven triggers.
4. `clasp push`, then run `pollForNewSubmissions` by hand and confirm the first
   run seeds silently.
5. Submit a test problem through the live wizard and confirm the email arrives
   in the inbox within five minutes.

## Risks

- **Workspace admin restrictions may block it.** Dawson's Google admin can
  restrict Apps Script or require OAuth app allowlisting, which would stop the
  script obtaining its token. Accepted knowingly rather than verified up front;
  if it blocks, fall back to Appendix A. Discovered at setup step 2, before any
  significant work is wasted.
- **The script belongs to a person, not the school.** It runs as
  `csupiro@dawsonschool.org`, and Apps Script triggers belong to the user who
  created them — sharing the project lets another teacher read and edit the
  code, but they would have to create their own trigger, which would then double
  every email. If the account is suspended or leaves Dawson, notifications stop.
  The weekly heartbeat is the detection mechanism. There is no clean
  department-owned model; this is the one structural advantage the Cloudflare
  design retains.
- **Editor drift.** Someone edits the script in the Apps Script web editor and
  the repo copy goes stale. Mitigation is discipline: `clasp pull` before
  editing, and a note in CLAUDE.md.
- **Legacy documents missing `approved` entirely** would not match the query.
  Only possible for pre-moderation documents, and that collection was empty when
  the hardened rules were deployed on 2026-09-03. Noted, not fixed.
- **Rejected problems accumulate** in the query result over years, slowly raising
  the per-poll read count. Tens per year; revisit only if it becomes material.
- **Duplicate email** if the send succeeds but the subsequent state write fails.
  Rare, and the accepted side of the at-least-once trade.

## Out of scope

- Notifications for claims, comments, upvotes, or status changes.
- Per-teacher notification preferences or an unsubscribe flow. The recipient list
  is `config/superusers`, edited in the Firebase console.
- Any Firestore write from the notifier.
- Changing the Firebase billing plan.

---

## Appendix A — fallback if Workspace blocks Apps Script

A Cloudflare Worker, free tier, no card. Same selection logic, same query shape,
same email content, same heartbeat; only the host and the transport change.

- **State:** a Cloudflare KV namespace in place of `PropertiesService`.
- **Firestore auth:** a dedicated service account
  `problem-notifier@dawson-problem-bank-24a9c.iam.gserviceaccount.com` with
  `roles/datastore.viewer` only, its key held via `wrangler secret put`. Workers
  are V8 isolates rather than Node, so `firebase-admin` will not run and the
  JWT (RS256 via WebCrypto) → OAuth → REST path is written by hand.
- **Sending:** Brevo's free tier (300/day), which verifies a single sender
  address rather than a whole domain.
- **Sender:** a purpose-made mailbox such as
  `Dawson Problem Bank <dawsonproblembank@gmail.com>`, with `Reply-To` set to
  `csupiro@dawsonschool.org`. It **must not** be an `@dawsonschool.org` From
  address — see the DMARC finding above.
- **Cron:** `*/5 * * * *` and `0 14 * * 1`. Cloudflare cron is UTC-only, so the
  heartbeat lands at 7am Mountain in winter and 8am in summer.

Cost of the fallback: three new accounts, two stored credentials, a From line
that is not the teacher's, and occasional spam-foldering. Its one advantage is
that it belongs to the project rather than to an individual.
