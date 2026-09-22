# Submission Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Email every super user within ~5 minutes when a new problem is submitted, so nothing sits unreviewed in the Pending queue.

**Architecture:** A Google Apps Script project, source-controlled in `notifier/` and pushed with `clasp`, runs two time-driven triggers. A 5-minute poll reads `problems where approved == false` from the Firestore REST API using the owner's own OAuth token, diffs the pending document IDs against a set held in `PropertiesService`, and sends one digest email via `MailApp`. A Monday trigger sends a heartbeat. Every Apps Script global is confined to `notifier/src/env.ts`; everything else is plain TypeScript unit-tested by `npm test`.

**Tech Stack:** TypeScript, Google Apps Script (V8), `clasp`, `esbuild`, `node:test` with `--experimental-strip-types`, Firestore REST v1.

**Spec:** [docs/superpowers/specs/2026-09-22-submission-notifications-design.md](../specs/2026-09-22-submission-notifications-design.md)

## Global Constraints

- **The notifier must never write to Firestore.** Its only declared Firestore scope is `https://www.googleapis.com/auth/cloud-platform.read-only`. Adding a write means widening that scope, which is a deliberate decision requiring its own review — not something to do in passing.
- **No credentials are stored anywhere.** Authentication is `ScriptApp.getOAuthToken()`. Do not introduce a service-account key, and do not commit a script ID, API key, or token.
- **`erasableSyntaxOnly: true`** is set across this repo. No `enum`, no parameter properties, no namespaces — the test runner strips types rather than compiling them.
- **`verbatimModuleSyntax: true`** — type-only imports must use `import type`.
- Firebase project ID is `dawson-problem-bank-24a9c`.
- Dashboard URL is `https://csuter931.github.io/design-problem-bank/dashboard/`; the deep link adds `?tab=pending`.
- Tests live beside their source as `*.test.ts`, use `node:test` + `node:assert/strict`, and import with an explicit `.ts` extension — match `src/lib/moderation.test.ts`.
- The submitter's contact address (`submitterContact`) must never appear in an email body.
- Commit after every task. Do not push to `main`.

---

### Task 1: Notifier scaffolding and the selection logic

The set arithmetic that decides what counts as "new". Pure, and the load-bearing correctness of the whole feature.

**Files:**
- Create: `notifier/src/selection.ts`
- Create: `notifier/src/selection.test.ts`
- Create: `tsconfig.notifier.json`
- Modify: `tsconfig.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `selectNew(pendingIds: string[], storedIds: string[] | null): { newIds: string[]; nextStoredIds: string[] }` and the constant `MAX_STORED_IDS: number`.

- [ ] **Step 1: Install the dev dependencies**

```bash
npm install --save-dev esbuild@^0.25.0 @google/clasp@^2.4.2 @types/google-apps-script@^1.0.97
```

- [ ] **Step 2: Create `tsconfig.notifier.json`**

This makes `npm run build` type-check the notifier, so a type error there blocks deployment exactly like one in `src/`. It mirrors `tsconfig.node.json` but points at `notifier/src` and pulls in the Apps Script globals.

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.notifier.tsbuildinfo",
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "types": ["google-apps-script"],
    "skipLibCheck": true,

    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,

    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["notifier/src"],
  "exclude": ["notifier/src/**/*.test.ts"]
}
```

- [ ] **Step 3: Reference it from the root `tsconfig.json`**

Replace the whole file with:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.notifier.json" }
  ]
}
```

- [ ] **Step 4: Extend the test glob in `package.json`**

Change the `test` script from:

```json
"test": "node --test --experimental-strip-types \"src/**/*.test.ts\"",
```

to:

```json
"test": "node --test --experimental-strip-types \"src/**/*.test.ts\" \"notifier/src/**/*.test.ts\"",
```

- [ ] **Step 5: Write the failing test**

Create `notifier/src/selection.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectNew, MAX_STORED_IDS } from './selection.ts'

test('first run seeds silently — nothing is new, everything is remembered', () => {
  const { newIds, nextStoredIds } = selectNew(['a', 'b'], null)
  assert.deepEqual(newIds, [])
  assert.deepEqual(nextStoredIds, ['a', 'b'])
})

test('an id not seen before is new', () => {
  const { newIds } = selectNew(['a', 'b', 'c'], ['a'])
  assert.deepEqual(newIds, ['b', 'c'])
})

test('nothing is new when every pending id is already stored', () => {
  const { newIds } = selectNew(['a', 'b'], ['a', 'b'])
  assert.deepEqual(newIds, [])
})

test('stored ids that are no longer pending are pruned', () => {
  // 'a' was approved between cycles, so it drops out of both sets.
  const { nextStoredIds } = selectNew(['b'], ['a', 'b'])
  assert.deepEqual(nextStoredIds, ['b'])
})

test('next stored set is exactly the current pending set', () => {
  const { nextStoredIds } = selectNew(['b', 'c'], ['a', 'b'])
  assert.deepEqual(nextStoredIds, ['b', 'c'])
})

test('an empty pending queue clears the stored set', () => {
  const { newIds, nextStoredIds } = selectNew([], ['a', 'b'])
  assert.deepEqual(newIds, [])
  assert.deepEqual(nextStoredIds, [])
})

test('an empty stored array is not treated as a first run', () => {
  // [] means "seeded, nothing pending last time"; null means "never run".
  const { newIds } = selectNew(['a'], [])
  assert.deepEqual(newIds, ['a'])
})

test('duplicate pending ids are collapsed', () => {
  const { newIds, nextStoredIds } = selectNew(['a', 'a'], [])
  assert.deepEqual(newIds, ['a'])
  assert.deepEqual(nextStoredIds, ['a'])
})

test('the stored set is capped, keeping the newest ids', () => {
  const pending = Array.from({ length: MAX_STORED_IDS + 5 }, (_, i) => `id${i}`)
  const { nextStoredIds } = selectNew(pending, [])
  assert.equal(nextStoredIds.length, MAX_STORED_IDS)
  // Pending arrives oldest-first, so the tail is what we keep.
  assert.equal(nextStoredIds[nextStoredIds.length - 1], `id${MAX_STORED_IDS + 4}`)
})
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module` for `./selection.ts`.

- [ ] **Step 7: Write the implementation**

Create `notifier/src/selection.ts`:

```ts
// Decides which pending problems the notifier has not yet emailed about.
//
// Deliberately NOT a timestamp watermark. `createdAt` is set by the submitter's
// browser (`Date.now()` in SubmitWizard), so a device with a slow clock would
// produce a document stamped behind the watermark and be skipped silently and
// permanently — exactly the failure this feature exists to prevent. Tracking
// ids has no clock dependency at all.
//
// The next stored set is just the current pending set: (stored ∩ pending) ∪
// (pending − stored) == pending. Pruning therefore happens for free — an id
// drops out the moment its problem is approved or rejected.

/**
 * PropertiesService caps one value at 9 KB. A 20-character document id costs
 * about 23 bytes inside a JSON array, so ~390 ids fit. 300 leaves headroom.
 * Overflowing re-notifies the oldest entries rather than dropping new ones —
 * noisy, not silent, which is the right direction to fail.
 */
export const MAX_STORED_IDS = 300

export interface Selection {
  newIds: string[]
  nextStoredIds: string[]
}

/**
 * @param pendingIds Ids of every problem currently awaiting review, oldest first.
 * @param storedIds  Ids already emailed about, or `null` on the very first run.
 */
export function selectNew(pendingIds: string[], storedIds: string[] | null): Selection {
  const pending = dedupe(pendingIds)
  const nextStoredIds = pending.slice(-MAX_STORED_IDS)

  // A first run seeds without sending, so a notifier switched on mid-year does
  // not email the entire back catalogue.
  if (storedIds === null) return { newIds: [], nextStoredIds }

  const seen = new Set(storedIds)
  return { newIds: pending.filter(id => !seen.has(id)), nextStoredIds }
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids))
}
```

- [ ] **Step 8: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, and the existing `src/lib` tests still pass.

- [ ] **Step 9: Verify the type-check wiring**

```bash
npm run build
```

Expected: succeeds. If `tsconfig.notifier.json` were wrong, `tsc -b` would fail here.

- [ ] **Step 10: Commit**

```bash
git add notifier/src/selection.ts notifier/src/selection.test.ts tsconfig.json tsconfig.notifier.json package.json package-lock.json
git commit -m "feat(notifier): id-set selection logic, type-checked and under npm test"
```

---

### Task 2: Email builders

Pure formatting. Produces both a plain-text and an HTML body.

**Files:**
- Create: `notifier/src/email.ts`
- Create: `notifier/src/email.test.ts`

**Interfaces:**
- Consumes: `SEVERITY_LABEL` and `CATEGORY_OPTIONS` from `src/lib/problemMeta.ts`.
- Produces:
  - `interface NotifiableProblem { id: string; title?: string; description?: string; submitterName?: string; submitterRole?: string; severity?: number; categories?: string[] }`
  - `interface BuiltEmail { subject: string; text: string; html: string }`
  - `buildDigest(problems: NotifiableProblem[], pendingCount: number, dashboardUrl: string): BuiltEmail`
  - `buildHeartbeat(pendingCount: number, dashboardUrl: string): BuiltEmail`
  - `escapeHtml(s: string): string`

- [ ] **Step 1: Write the failing test**

Create `notifier/src/email.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDigest, buildHeartbeat, escapeHtml, type NotifiableProblem } from './email.ts'

const URL = 'https://csuter931.github.io/design-problem-bank/dashboard/?tab=pending'

const one: NotifiableProblem = {
  id: 'abc123',
  title: 'Cafeteria line backs up at 11:40',
  description: 'The single serving line means the last 40 students get under ten minutes to eat.',
  submitterName: 'Jamie Rivera',
  submitterRole: 'Student',
  severity: 4,
  categories: ['workspace', 'safety'],
}

test('a single problem names itself in the subject', () => {
  const { subject } = buildDigest([one], 2, URL)
  assert.equal(subject, 'New problem submitted — Cafeteria line backs up at 11:40')
})

test('several problems are counted in the subject', () => {
  const { subject } = buildDigest([one, { id: 'b', title: 'Second' }, { id: 'c', title: 'Third' }], 3, URL)
  assert.equal(subject, '3 new problems submitted')
})

test('the text body carries title, byline, severity, categories and the link', () => {
  const { text } = buildDigest([one], 2, URL)
  assert.match(text, /Cafeteria line backs up at 11:40/)
  assert.match(text, /From: Jamie Rivera \(Student\)/)
  assert.match(text, /Severity: Serious/)
  assert.match(text, /Workspace, Safety/)
  assert.ok(text.includes(URL))
  assert.match(text, /2 problems are now waiting for review\./)
})

test('the pending tail is singular for one', () => {
  const { text } = buildDigest([one], 1, URL)
  assert.match(text, /1 problem is now waiting for review\./)
})

test('the submitter contact is never included', () => {
  const withContact = { ...one, submitterContact: 'jrivera@dawsonstudents.org' } as NotifiableProblem
  const { text, html } = buildDigest([withContact], 1, URL)
  assert.ok(!text.includes('jrivera@dawsonstudents.org'))
  assert.ok(!html.includes('jrivera@dawsonstudents.org'))
})

test('a hostile title cannot inject markup into the HTML body', () => {
  const nasty: NotifiableProblem = { id: 'x', title: '<script>alert(1)</script>' }
  const { html } = buildDigest([nasty], 1, URL)
  assert.ok(!html.includes('<script>'))
  assert.match(html, /&lt;script&gt;/)
})

test('the plain-text body is not escaped', () => {
  const { text } = buildDigest([{ id: 'x', title: 'Doors & windows' }], 1, URL)
  assert.match(text, /Doors & windows/)
})

test('missing optional fields degrade rather than printing undefined', () => {
  const bare: NotifiableProblem = { id: 'x', title: 'Bare' }
  const { text, html } = buildDigest([bare], 1, URL)
  assert.ok(!text.includes('undefined'))
  assert.ok(!html.includes('undefined'))
  assert.ok(!text.includes('From:'))
})

test('a problem with no title is labelled rather than left blank', () => {
  const { subject } = buildDigest([{ id: 'x' }], 1, URL)
  assert.equal(subject, 'New problem submitted — Untitled problem')
})

test('a long description is truncated with an ellipsis', () => {
  const long = { id: 'x', title: 'T', description: 'w'.repeat(400) }
  const { text } = buildDigest([long], 1, URL)
  assert.ok(text.includes('…'))
  assert.ok(!text.includes('w'.repeat(200)))
})

test('an unknown category value renders as stored rather than vanishing', () => {
  const legacy: NotifiableProblem = { id: 'x', title: 'T', categories: ['space-and-facilities'] }
  const { text } = buildDigest([legacy], 1, URL)
  assert.match(text, /space-and-facilities/)
})

test('an out-of-range severity is dropped rather than printing a blank label', () => {
  const { text } = buildDigest([{ id: 'x', title: 'T', severity: 99 }], 1, URL)
  assert.ok(!text.includes('Severity:'))
})

test('the heartbeat reports a healthy empty queue', () => {
  const { subject, text } = buildHeartbeat(0, URL)
  assert.match(subject, /nothing pending/i)
  assert.match(text, /healthy/i)
})

test('the heartbeat reports a non-empty queue with the count', () => {
  const { subject, text } = buildHeartbeat(3, URL)
  assert.match(subject, /3/)
  assert.ok(text.includes(URL))
})

test('escapeHtml covers the five dangerous characters', () => {
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;')
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module` for `./email.ts`.

- [ ] **Step 3: Write the implementation**

Create `notifier/src/email.ts`:

```ts
// Builds the notification emails. Pure — no Apps Script globals, no network,
// no clock. Both a plain-text and an HTML body are produced because MailApp
// sends multipart and some clients will only render one of them.
//
// The submitter's contact address is deliberately absent: it is PII, it is
// already in the app, and inboxes keep it forever. There is a test guarding
// this; do not add the field.

import { SEVERITY_LABEL, CATEGORY_OPTIONS } from '../../src/lib/problemMeta.ts'

export interface NotifiableProblem {
  id: string
  title?: string
  description?: string
  submitterName?: string
  submitterRole?: string
  severity?: number
  categories?: string[]
}

export interface BuiltEmail {
  subject: string
  text: string
  html: string
}

const SNIPPET_CHARS = 160
const UNTITLED = 'Untitled problem'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Legacy tag values from older taxonomies have no option; show them as stored. */
function categoryLabel(value: string): string {
  const match = CATEGORY_OPTIONS.find(o => o.value === value)
  return match ? match.label : value
}

function titleOf(p: NotifiableProblem): string {
  const t = (p.title ?? '').trim()
  return t.length > 0 ? t : UNTITLED
}

function byline(p: NotifiableProblem): string {
  const name = (p.submitterName ?? '').trim()
  if (!name) return ''
  const role = (p.submitterRole ?? '').trim()
  return role ? `${name} (${role})` : name
}

function metaLine(p: NotifiableProblem): string {
  const bits: string[] = []
  const label = p.severity === undefined ? '' : (SEVERITY_LABEL[p.severity] ?? '')
  if (label) bits.push(`Severity: ${label}`)
  const cats = (p.categories ?? []).map(categoryLabel).filter(c => c.length > 0)
  if (cats.length > 0) bits.push(cats.join(', '))
  return bits.join(' · ')
}

function snippet(description: string | undefined): string {
  const d = (description ?? '').trim().replace(/\s+/g, ' ')
  if (d.length <= SNIPPET_CHARS) return d
  return d.slice(0, SNIPPET_CHARS).trimEnd() + '…'
}

function pendingTail(pendingCount: number): string {
  return pendingCount === 1
    ? '1 problem is now waiting for review.'
    : `${pendingCount} problems are now waiting for review.`
}

function textBlock(p: NotifiableProblem): string {
  const lines = [`  ${titleOf(p)}`]
  const from = byline(p)
  if (from) lines.push(`  From: ${from}`)
  const meta = metaLine(p)
  if (meta) lines.push(`  ${meta}`)
  const s = snippet(p.description)
  if (s) lines.push('', `  ${s}`)
  return lines.join('\n')
}

function htmlBlock(p: NotifiableProblem): string {
  const parts = [
    `<p style="margin:0 0 4px;font-size:16px;font-weight:600;">${escapeHtml(titleOf(p))}</p>`,
  ]
  const from = byline(p)
  if (from) parts.push(`<p style="margin:0;color:#555;font-size:13px;">From: ${escapeHtml(from)}</p>`)
  const meta = metaLine(p)
  if (meta) parts.push(`<p style="margin:0;color:#555;font-size:13px;">${escapeHtml(meta)}</p>`)
  const s = snippet(p.description)
  if (s) parts.push(`<p style="margin:8px 0 0;font-size:14px;">${escapeHtml(s)}</p>`)
  return `<div style="margin:0 0 20px;padding:0 0 0 12px;border-left:3px solid #7BB0D4;">${parts.join('')}</div>`
}

function wrapHtml(intro: string, blocks: string, dashboardUrl: string, tail: string): string {
  return [
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;color:#111;">',
    `<p style="margin:0 0 20px;font-size:15px;">${escapeHtml(intro)}</p>`,
    blocks,
    `<p style="margin:0 0 20px;"><a href="${escapeHtml(dashboardUrl)}" style="background:#0033A0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;">Review in the dashboard</a></p>`,
    `<p style="margin:0;color:#555;font-size:13px;">${escapeHtml(tail)}</p>`,
    '</div>',
  ].join('')
}

export function buildDigest(
  problems: NotifiableProblem[],
  pendingCount: number,
  dashboardUrl: string,
): BuiltEmail {
  const n = problems.length
  const subject = n === 1
    ? `New problem submitted — ${titleOf(problems[0])}`
    : `${n} new problems submitted`
  const intro = n === 1
    ? 'A new problem is waiting for review.'
    : `${n} new problems are waiting for review.`
  const tail = pendingTail(pendingCount)

  const text = [
    intro,
    '',
    problems.map(textBlock).join('\n\n'),
    '',
    '  → Review it',
    `     ${dashboardUrl}`,
    '',
    tail,
  ].join('\n')

  return { subject, text, html: wrapHtml(intro, problems.map(htmlBlock).join(''), dashboardUrl, tail) }
}

export function buildHeartbeat(pendingCount: number, dashboardUrl: string): BuiltEmail {
  const healthy = pendingCount === 0
  const subject = healthy
    ? 'Problem Bank — nothing pending'
    : `Problem Bank — ${pendingCount} waiting for review`
  const intro = healthy
    ? 'Nothing is waiting for review. The notifier ran and is healthy.'
    : pendingTail(pendingCount)

  const text = [intro, '', '  → Open the review queue', `     ${dashboardUrl}`, '', 'This is the weekly check-in. If it stops arriving, the notifier has stopped running.'].join('\n')

  return { subject, text, html: wrapHtml(intro, '', dashboardUrl, 'This is the weekly check-in. If it stops arriving, the notifier has stopped running.') }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add notifier/src/email.ts notifier/src/email.test.ts
git commit -m "feat(notifier): digest and heartbeat email builders with HTML escaping"
```

---

### Task 3: Firestore REST client

Builds the query, parses Firestore's typed-value JSON. Takes an injected fetcher so it never names `UrlFetchApp` and can be tested in Node.

**Files:**
- Create: `notifier/src/firestore.ts`
- Create: `notifier/src/firestore.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type FirestoreValue = Record<string, unknown>`
  - `interface FirestoreDoc { id: string; [key: string]: unknown }`
  - `interface HttpResponse { status: number; body: string }`
  - `type HttpFetcher = (url: string, init: { method: 'get' | 'post'; headers: Record<string, string>; payload?: string }) => HttpResponse`
  - `buildPendingQueryBody(): string`
  - `decodeValue(v: FirestoreValue): unknown`
  - `decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown>`
  - `parseRunQueryResponse(body: string): FirestoreDoc[]`
  - `parseSuperuserEmails(body: string): string[]`
  - `fetchUnapprovedProblems(fetcher: HttpFetcher, projectId: string, token: string): FirestoreDoc[]`
  - `fetchSuperuserEmails(fetcher: HttpFetcher, projectId: string, token: string): string[]`

- [ ] **Step 1: Write the failing test**

Create `notifier/src/firestore.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPendingQueryBody, decodeValue, parseRunQueryResponse, parseSuperuserEmails,
  fetchUnapprovedProblems, fetchSuperuserEmails, type HttpFetcher,
} from './firestore.ts'

const PROJECT = 'dawson-problem-bank-24a9c'

function fakeFetcher(status: number, body: string, calls: Array<{ url: string; method: string; payload?: string }> = []): HttpFetcher {
  return (url, init) => {
    calls.push({ url, method: init.method, payload: init.payload })
    return { status, body }
  }
}

test('the query filters on approved == false and does not order', () => {
  const q = JSON.parse(buildPendingQueryBody())
  assert.deepEqual(q.structuredQuery.from, [{ collectionId: 'problems' }])
  assert.deepEqual(q.structuredQuery.where.fieldFilter, {
    field: { fieldPath: 'approved' },
    op: 'EQUAL',
    value: { booleanValue: false },
  })
  // An orderBy would demand a composite index; sorting happens in the script.
  assert.equal(q.structuredQuery.orderBy, undefined)
})

test('integerValue is decoded to a number, not the string Firestore sends', () => {
  assert.equal(decodeValue({ integerValue: '1758499200000' }), 1758499200000)
  assert.equal(typeof decodeValue({ integerValue: '4' }), 'number')
})

test('each scalar value type decodes', () => {
  assert.equal(decodeValue({ stringValue: 'hi' }), 'hi')
  assert.equal(decodeValue({ booleanValue: false }), false)
  assert.equal(decodeValue({ doubleValue: 1.5 }), 1.5)
  assert.equal(decodeValue({ nullValue: null }), null)
})

test('arrays and maps decode recursively', () => {
  assert.deepEqual(
    decodeValue({ arrayValue: { values: [{ stringValue: 'a' }, { integerValue: '2' }] } }),
    ['a', 2],
  )
  assert.deepEqual(decodeValue({ arrayValue: {} }), [])
  assert.deepEqual(
    decodeValue({ mapValue: { fields: { k: { stringValue: 'v' } } } }),
    { k: 'v' },
  )
})

test('runQuery rows become plain objects carrying the document id', () => {
  const body = JSON.stringify([
    {
      document: {
        name: `projects/${PROJECT}/databases/(default)/documents/problems/DOC1`,
        fields: {
          title: { stringValue: 'Leaky tap' },
          approved: { booleanValue: false },
          severity: { integerValue: '3' },
          createdAt: { integerValue: '1758499200000' },
          categories: { arrayValue: { values: [{ stringValue: 'safety' }] } },
        },
      },
    },
  ])
  const docs = parseRunQueryResponse(body)
  assert.equal(docs.length, 1)
  assert.equal(docs[0].id, 'DOC1')
  assert.equal(docs[0].title, 'Leaky tap')
  assert.equal(docs[0].approved, false)
  assert.equal(docs[0].severity, 3)
  assert.deepEqual(docs[0].categories, ['safety'])
})

test('rejectedAt decodes as a number so isRejected recognises it', () => {
  const body = JSON.stringify([{
    document: {
      name: `projects/${PROJECT}/databases/(default)/documents/problems/D`,
      fields: { approved: { booleanValue: false }, rejectedAt: { integerValue: '1758499200000' } },
    },
  }])
  assert.equal(typeof parseRunQueryResponse(body)[0].rejectedAt, 'number')
})

test('an empty result set returns no documents', () => {
  // Firestore answers an empty runQuery with a single readTime-only row.
  assert.deepEqual(parseRunQueryResponse(JSON.stringify([{ readTime: '2026-09-22T00:00:00Z' }])), [])
})

test('a field literally named id cannot shadow the document id', () => {
  const body = JSON.stringify([{
    document: {
      name: `projects/${PROJECT}/databases/(default)/documents/problems/REAL`,
      fields: { id: { stringValue: 'SPOOFED' } },
    },
  }])
  assert.equal(parseRunQueryResponse(body)[0].id, 'REAL')
})

test('a document with no fields still yields its id', () => {
  const body = JSON.stringify([{
    document: { name: `projects/${PROJECT}/databases/(default)/documents/problems/EMPTY` },
  }])
  assert.equal(parseRunQueryResponse(body)[0].id, 'EMPTY')
})

test('superuser emails are extracted from the config document', () => {
  const body = JSON.stringify({
    name: `projects/${PROJECT}/databases/(default)/documents/config/superusers`,
    fields: { emails: { arrayValue: { values: [{ stringValue: 'a@dawsonschool.org' }, { stringValue: 'b@dawsonschool.org' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body), ['a@dawsonschool.org', 'b@dawsonschool.org'])
})

test('a config document with no emails field yields an empty list', () => {
  assert.deepEqual(parseSuperuserEmails(JSON.stringify({ fields: {} })), [])
  assert.deepEqual(parseSuperuserEmails(JSON.stringify({})), [])
})

test('non-string entries in the emails array are discarded', () => {
  const body = JSON.stringify({
    fields: { emails: { arrayValue: { values: [{ stringValue: 'a@dawsonschool.org' }, { integerValue: '7' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body), ['a@dawsonschool.org'])
})

test('fetchUnapprovedProblems posts to runQuery with a bearer token', () => {
  const calls: Array<{ url: string; method: string; payload?: string }> = []
  fetchUnapprovedProblems(fakeFetcher(200, '[]', calls), PROJECT, 'TOKEN123')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].method, 'post')
  assert.ok(calls[0].url.endsWith(`/projects/${PROJECT}/databases/(default)/documents:runQuery`))
  assert.ok(calls[0].payload?.includes('"approved"'))
})

test('fetchSuperuserEmails gets the config document', () => {
  const calls: Array<{ url: string; method: string; payload?: string }> = []
  fetchSuperuserEmails(fakeFetcher(200, JSON.stringify({ fields: {} }), calls), PROJECT, 'TOKEN123')
  assert.equal(calls[0].method, 'get')
  assert.ok(calls[0].url.endsWith('/documents/config/superusers'))
})

test('a non-200 throws rather than returning silently empty', () => {
  // Returning [] on a 403 would look exactly like "nothing to review", which
  // is the one wrong answer this feature must never give.
  assert.throws(
    () => fetchUnapprovedProblems(fakeFetcher(403, '{"error":"denied"}'), PROJECT, 'T'),
    /403/,
  )
  assert.throws(
    () => fetchSuperuserEmails(fakeFetcher(500, 'boom'), PROJECT, 'T'),
    /500/,
  )
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module` for `./firestore.ts`.

- [ ] **Step 3: Write the implementation**

Create `notifier/src/firestore.ts`:

```ts
// Firestore REST v1 access for the notifier. Read-only by design — the script's
// OAuth scope is cloud-platform.read-only, so a write would fail at the API
// even if one were added here.
//
// The HTTP call is injected rather than imported so this module never names
// UrlFetchApp and can be unit-tested in plain Node. env.ts supplies the real
// implementation.

export type FirestoreValue = Record<string, unknown>

export interface FirestoreDoc {
  id: string
  [key: string]: unknown
}

export interface HttpResponse {
  status: number
  body: string
}

export type HttpFetcher = (
  url: string,
  init: { method: 'get' | 'post'; headers: Record<string, string>; payload?: string },
) => HttpResponse

const BASE = 'https://firestore.googleapis.com/v1/projects'

/**
 * `approved == false` with no orderBy, on purpose:
 *  - a single-field equality filter uses Firestore's automatic index, so
 *    firestore.indexes.json needs no change;
 *  - it returns only pending + rejected docs, keeping ~288 polls/day well
 *    inside the 50,000/day free read quota. An unfiltered poll would exceed
 *    that quota once the bank passed roughly 170 problems.
 * Sorting happens in the caller.
 */
export function buildPendingQueryBody(): string {
  return JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'problems' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'approved' },
          op: 'EQUAL',
          value: { booleanValue: false },
        },
      },
    },
  })
}

export function decodeValue(v: FirestoreValue): unknown {
  if (typeof v.stringValue === 'string') return v.stringValue
  if (typeof v.booleanValue === 'boolean') return v.booleanValue
  // Firestore returns 64-bit integers as strings; createdAt, severity and
  // rejectedAt all arrive this way and must come back as numbers or
  // lib/moderation's `typeof rejectedAt === 'number'` check misfires.
  if (v.integerValue !== undefined) return Number(v.integerValue)
  if (v.doubleValue !== undefined) return Number(v.doubleValue)
  if (v.nullValue !== undefined) return null
  if (typeof v.timestampValue === 'string') return v.timestampValue
  if (v.arrayValue !== undefined) {
    const arr = v.arrayValue as { values?: FirestoreValue[] }
    return (arr.values ?? []).map(decodeValue)
  }
  if (v.mapValue !== undefined) {
    const map = v.mapValue as { fields?: Record<string, FirestoreValue> }
    return decodeFields(map.fields ?? {})
  }
  return undefined
}

export function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(fields)) out[key] = decodeValue(fields[key])
  return out
}

export function parseRunQueryResponse(body: string): FirestoreDoc[] {
  const rows = JSON.parse(body) as Array<{
    document?: { name: string; fields?: Record<string, FirestoreValue> }
  }>
  const docs: FirestoreDoc[] = []
  for (const row of rows) {
    // An empty result comes back as a single { readTime } row with no document.
    if (!row.document) continue
    const segments = row.document.name.split('/')
    docs.push({
      // Spread first so a stored field named `id` cannot shadow the real id.
      ...decodeFields(row.document.fields ?? {}),
      id: segments[segments.length - 1],
    })
  }
  return docs
}

export function parseSuperuserEmails(body: string): string[] {
  const doc = JSON.parse(body) as { fields?: Record<string, FirestoreValue> }
  const emails = decodeFields(doc.fields ?? {}).emails
  if (!Array.isArray(emails)) return []
  return emails.filter((e): e is string => typeof e === 'string')
}

export function fetchUnapprovedProblems(
  fetcher: HttpFetcher,
  projectId: string,
  token: string,
): FirestoreDoc[] {
  const url = `${BASE}/${projectId}/databases/(default)/documents:runQuery`
  const res = fetcher(url, { method: 'post', headers: authHeaders(token), payload: buildPendingQueryBody() })
  // Throwing matters: returning [] on a 403 is indistinguishable from
  // "nothing to review", which is the one wrong answer this must never give.
  if (res.status !== 200) throw new Error(`Firestore runQuery failed: ${res.status} ${res.body}`)
  return parseRunQueryResponse(res.body)
}

export function fetchSuperuserEmails(
  fetcher: HttpFetcher,
  projectId: string,
  token: string,
): string[] {
  const url = `${BASE}/${projectId}/databases/(default)/documents/config/superusers`
  const res = fetcher(url, { method: 'get', headers: authHeaders(token) })
  if (res.status !== 200) throw new Error(`Firestore get config/superusers failed: ${res.status} ${res.body}`)
  return parseSuperuserEmails(res.body)
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add notifier/src/firestore.ts notifier/src/firestore.test.ts
git commit -m "feat(notifier): Firestore REST reader with injected fetcher"
```

---

### Task 4: Orchestration and the Apps Script environment

`main.ts` holds the two flows and is fully testable against a fake environment. `env.ts` is the only file in the project allowed to name an Apps Script global.

**Files:**
- Create: `notifier/src/main.ts`
- Create: `notifier/src/main.test.ts`
- Create: `notifier/src/env.ts`
- Create: `notifier/src/entry.ts`

**Interfaces:**
- Consumes: `selectNew` and `MAX_STORED_IDS` (Task 1); `buildDigest`, `buildHeartbeat`, `NotifiableProblem`, `BuiltEmail` (Task 2); `fetchUnapprovedProblems`, `fetchSuperuserEmails`, `HttpFetcher`, `FirestoreDoc` (Task 3); `partitionByReview` from `src/lib/moderation.ts`.
- Produces:
  - `interface NotifierEnv { projectId: string; dashboardUrl: string; fetchJson: HttpFetcher; getToken(): string; readStoredIds(): string[] | null; writeStoredIds(ids: string[]): void; sendEmail(recipients: string[], email: BuiltEmail): void; log(message: string): void }`
  - `poll(env: NotifierEnv): void`
  - `heartbeat(env: NotifierEnv): void`
  - `appsScriptEnv(): NotifierEnv`
  - Global entry points `pollForNewSubmissions()` and `weeklyHeartbeat()` (created by the build footer in Task 5).

- [ ] **Step 1: Write the failing test**

Create `notifier/src/main.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { poll, heartbeat } from './main.ts'
import type { NotifierEnv } from './env.ts'
import type { BuiltEmail } from './email.ts'

const PROJECT = 'test-project'
const URL = 'https://example.test/dashboard/?tab=pending'

interface Sent { recipients: string[]; email: BuiltEmail }

interface Harness {
  env: NotifierEnv
  sent: Sent[]
  writes: string[][]
  logs: string[]
}

/** @param docs Firestore documents as the REST parser would hand them over. */
function harness(docs: Array<Record<string, unknown>>, stored: string[] | null, emails = ['t@dawsonschool.org']): Harness {
  const sent: Sent[] = []
  const writes: string[][] = []
  const logs: string[] = []
  let current = stored
  const env: NotifierEnv = {
    projectId: PROJECT,
    dashboardUrl: URL,
    fetchJson: (url) => {
      if (url.endsWith(':runQuery')) {
        return {
          status: 200,
          body: JSON.stringify(docs.map(d => ({
            document: {
              name: `projects/${PROJECT}/databases/(default)/documents/problems/${d.id}`,
              fields: toFields(d),
            },
          }))),
        }
      }
      return {
        status: 200,
        body: JSON.stringify({ fields: { emails: { arrayValue: { values: emails.map(e => ({ stringValue: e })) } } } }),
      }
    },
    getToken: () => 'TOKEN',
    readStoredIds: () => current,
    writeStoredIds: (ids) => { writes.push(ids); current = ids },
    sendEmail: (recipients, email) => { sent.push({ recipients, email }) },
    log: (m) => { logs.push(m) },
  }
  return { env, sent, writes, logs }
}

function toFields(d: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const key of Object.keys(d)) {
    if (key === 'id') continue
    const v = d[key]
    if (typeof v === 'string') fields[key] = { stringValue: v }
    else if (typeof v === 'boolean') fields[key] = { booleanValue: v }
    else if (typeof v === 'number') fields[key] = { integerValue: String(v) }
  }
  return fields
}

const pendingDoc = (id: string, title: string) => ({ id, title, approved: false })

test('the first run seeds without emailing', () => {
  const h = harness([pendingDoc('a', 'One')], null)
  poll(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [['a']])
})

test('a new pending problem produces exactly one email', () => {
  const h = harness([pendingDoc('a', 'One')], [])
  poll(h.env)
  assert.equal(h.sent.length, 1)
  assert.match(h.sent[0].email.subject, /One/)
  assert.deepEqual(h.sent[0].recipients, ['t@dawsonschool.org'])
})

test('several new problems collapse into one digest', () => {
  const h = harness([pendingDoc('a', 'One'), pendingDoc('b', 'Two'), pendingDoc('c', 'Three')], [])
  poll(h.env)
  assert.equal(h.sent.length, 1)
  assert.equal(h.sent[0].email.subject, '3 new problems submitted')
})

test('a second poll with nothing new sends nothing', () => {
  const h = harness([pendingDoc('a', 'One')], ['a'])
  poll(h.env)
  assert.equal(h.sent.length, 0)
})

test('rejected problems are not treated as pending', () => {
  const h = harness([{ id: 'r', title: 'Rejected', approved: false, rejectedAt: 1758499200000 }], [])
  poll(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [[]])
})

test('state is written only after a successful send', () => {
  const h = harness([pendingDoc('a', 'One')], [])
  h.env.sendEmail = () => { throw new Error('Brevo down') }
  assert.throws(() => poll(h.env), /Brevo down/)
  assert.deepEqual(h.writes, [], 'a failed send must leave state untouched so the next cycle retries')
})

test('no configured super users means no send and no state write', () => {
  const h = harness([pendingDoc('a', 'One')], [], [])
  poll(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [])
  assert.match(h.logs.join(' '), /super user/i)
})

test('the digest counts the whole pending queue, not just the new arrivals', () => {
  const h = harness([pendingDoc('a', 'Old'), pendingDoc('b', 'New')], ['a'])
  poll(h.env)
  assert.match(h.sent[0].email.text, /2 problems are now waiting for review/)
})

test('the heartbeat sends and never touches stored state', () => {
  const h = harness([pendingDoc('a', 'One')], ['a'])
  heartbeat(h.env)
  assert.equal(h.sent.length, 1)
  assert.match(h.sent[0].email.subject, /1 waiting/)
  assert.deepEqual(h.writes, [])
})

test('the heartbeat reports an empty queue as healthy', () => {
  const h = harness([], [])
  heartbeat(h.env)
  assert.match(h.sent[0].email.subject, /nothing pending/i)
})

test('a Firestore error propagates instead of looking like an empty queue', () => {
  const h = harness([], [])
  h.env.fetchJson = () => ({ status: 403, body: 'denied' })
  assert.throws(() => poll(h.env), /403/)
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module` for `./main.ts`.

- [ ] **Step 3: Write `env.ts`**

Create `notifier/src/env.ts`:

```ts
// The seam between the notifier's logic and Google Apps Script.
//
// THIS IS THE ONLY FILE PERMITTED TO NAME AN APPS SCRIPT GLOBAL. Everything
// else takes NotifierEnv as a parameter, which is what keeps the rest of the
// project unit-testable in plain Node — and what would make a move off Apps
// Script cost roughly this file and nothing else.

import type { BuiltEmail } from './email.ts'
import type { HttpFetcher } from './firestore.ts'

export const PROJECT_ID = 'dawson-problem-bank-24a9c'
export const DASHBOARD_URL = 'https://csuter931.github.io/design-problem-bank/dashboard/?tab=pending'

/** Key in the script's property store holding the already-notified id set. */
export const STORED_IDS_KEY = 'notifiedProblemIds'

/** Display name on the From line; the address itself is the script owner's. */
export const SENDER_NAME = 'Dawson Problem Bank'

export interface NotifierEnv {
  projectId: string
  dashboardUrl: string
  fetchJson: HttpFetcher
  getToken(): string
  readStoredIds(): string[] | null
  writeStoredIds(ids: string[]): void
  sendEmail(recipients: string[], email: BuiltEmail): void
  log(message: string): void
}

export function appsScriptEnv(): NotifierEnv {
  const props = PropertiesService.getScriptProperties()

  return {
    projectId: PROJECT_ID,
    dashboardUrl: DASHBOARD_URL,

    fetchJson: (url, init) => {
      const res = UrlFetchApp.fetch(url, {
        method: init.method,
        headers: init.headers,
        payload: init.payload,
        contentType: 'application/json',
        muteHttpExceptions: true,
      })
      return { status: res.getResponseCode(), body: res.getContentText() }
    },

    // The owner's own short-lived token. No service-account key exists.
    getToken: () => ScriptApp.getOAuthToken(),

    readStoredIds: () => {
      const raw = props.getProperty(STORED_IDS_KEY)
      // null means "never run" and triggers a silent seed; do not conflate it
      // with an empty array, which means "ran, queue was empty".
      if (raw === null) return null
      try {
        const parsed: unknown = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
      } catch {
        // Corrupt state re-seeds rather than crashing every five minutes.
        return null
      }
    },

    writeStoredIds: (ids) => { props.setProperty(STORED_IDS_KEY, JSON.stringify(ids)) },

    sendEmail: (recipients, email) => {
      // Recipients share a To line deliberately: super users are a handful of
      // teachers and seeing who else was told is useful, not a leak.
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: email.subject,
        body: email.text,
        htmlBody: email.html,
        name: SENDER_NAME,
      })
    },

    log: (message) => { console.log(message) },
  }
}
```

- [ ] **Step 4: Write `main.ts`**

Create `notifier/src/main.ts`:

```ts
// The two flows. No Apps Script globals, no I/O except through NotifierEnv,
// so every branch below is covered by main.test.ts.

import { partitionByReview } from '../../src/lib/moderation.ts'
import { buildDigest, buildHeartbeat, type NotifiableProblem } from './email.ts'
import type { NotifierEnv } from './env.ts'
import { fetchSuperuserEmails, fetchUnapprovedProblems, type FirestoreDoc } from './firestore.ts'
import { selectNew } from './selection.ts'

/** Runs every five minutes. */
export function poll(env: NotifierEnv): void {
  const token = env.getToken()
  const pending = readPending(env, token)
  const { newIds, nextStoredIds } = selectNew(pending.map(p => p.id), env.readStoredIds())

  if (newIds.length === 0) {
    // Safe to write with nothing sent: this both seeds a first run and prunes
    // ids whose problems have since been approved or rejected.
    env.writeStoredIds(nextStoredIds)
    return
  }

  const recipients = fetchSuperuserEmails(env.fetchJson, env.projectId, token)
  if (recipients.length === 0) {
    // Deliberately no state write — once a super user is configured, the next
    // cycle will still report these as new.
    env.log('No super user emails configured; nothing sent.')
    return
  }

  const fresh = new Set(newIds)
  const arrivals = pending.filter(p => fresh.has(p.id))
  env.sendEmail(recipients, buildDigest(arrivals, pending.length, env.dashboardUrl))

  // Last, and only on success. A throw above leaves state untouched so the
  // next cycle retries: at-least-once, because a duplicate email is an
  // annoyance and a missed one defeats the feature.
  env.writeStoredIds(nextStoredIds)
}

/** Runs Monday mornings. Read-only with respect to stored state. */
export function heartbeat(env: NotifierEnv): void {
  const token = env.getToken()
  const pending = readPending(env, token)
  const recipients = fetchSuperuserEmails(env.fetchJson, env.projectId, token)
  if (recipients.length === 0) {
    env.log('No super user emails configured; heartbeat not sent.')
    return
  }
  env.sendEmail(recipients, buildHeartbeat(pending.length, env.dashboardUrl))
}

/** Pending problems, oldest first, as the email builders want them. */
function readPending(env: NotifierEnv, token: string): PendingProblem[] {
  const docs = fetchUnapprovedProblems(env.fetchJson, env.projectId, token)
  const reviewable = docs.map(d => ({
    doc: d,
    approved: boolOr(d.approved),
    rejectedAt: numberOrUndefined(d.rejectedAt),
  }))
  return partitionByReview(reviewable)
    .pending
    .map(r => toPending(r.doc))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
}

interface PendingProblem extends NotifiableProblem {
  createdAt?: number
}

/**
 * An explicit allowlist, not a cast. Only these fields can ever reach an email
 * body, which is what makes "submitterContact is never emailed" a structural
 * guarantee rather than something a test has to keep catching.
 */
function toPending(d: FirestoreDoc): PendingProblem {
  return {
    id: d.id,
    title: stringOrUndefined(d.title),
    description: stringOrUndefined(d.description),
    submitterName: stringOrUndefined(d.submitterName),
    submitterRole: stringOrUndefined(d.submitterRole),
    severity: numberOrUndefined(d.severity),
    categories: Array.isArray(d.categories)
      ? d.categories.filter((c): c is string => typeof c === 'string')
      : undefined,
    createdAt: numberOrUndefined(d.createdAt),
  }
}

function stringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

function boolOr(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}
```

- [ ] **Step 5: Write `entry.ts`**

Create `notifier/src/entry.ts`:

```ts
// esbuild's entry point. The build footer turns these two exports into the
// top-level globals that Apps Script time-driven triggers can call by name.

import { appsScriptEnv } from './env.ts'
import { heartbeat, poll } from './main.ts'

export function pollForNewSubmissions(): void {
  poll(appsScriptEnv())
}

export function weeklyHeartbeat(): void {
  heartbeat(appsScriptEnv())
}
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS. `main.test.ts` imports `env.ts` for its type only, so no Apps Script global is evaluated under Node.

- [ ] **Step 7: Type-check**

```bash
npm run build
```

Expected: succeeds. If `@types/google-apps-script` is missing, `PropertiesService` and friends error here.

- [ ] **Step 8: Commit**

```bash
git add notifier/src/main.ts notifier/src/main.test.ts notifier/src/env.ts notifier/src/entry.ts
git commit -m "feat(notifier): poll and heartbeat flows behind an injected environment"
```

---

### Task 5: Build pipeline, manifest and clasp wiring

Turns the TypeScript into the single flat file Apps Script requires.

**Files:**
- Create: `notifier/build.mjs`
- Create: `notifier/appsscript.json`
- Create: `notifier/.clasp.json.example`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: `notifier/src/entry.ts` (Task 4).
- Produces: `notifier/build/Code.js` with globals `pollForNewSubmissions()` and `weeklyHeartbeat()`; npm scripts `notifier:build` and `notifier:push`.

- [ ] **Step 1: Write the Apps Script manifest**

Create `notifier/appsscript.json`. The scopes are the whole security story — `cloud-platform.read-only` makes a Firestore write impossible rather than merely unintended.

```json
{
  "timeZone": "America/Denver",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/cloud-platform.read-only",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/script.send_mail"
  ]
}
```

- [ ] **Step 2: Write the build script**

Create `notifier/build.mjs`:

```js
// Apps Script has no module system, so the TypeScript is bundled into one flat
// file and the two trigger entry points are re-exposed as top-level globals.
import { build } from 'esbuild'
import { copyFileSync, mkdirSync } from 'node:fs'

const OUT_DIR = 'notifier/build'

mkdirSync(OUT_DIR, { recursive: true })

await build({
  entryPoints: ['notifier/src/entry.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'NOTIFIER',
  target: 'es2020',
  outfile: `${OUT_DIR}/Code.js`,
  legalComments: 'none',
  // Apps Script triggers call a bare function name, which the IIFE would
  // otherwise hide. esbuild appends the footer outside the wrapper, so these
  // two land at top level where the trigger scheduler can see them.
  footer: {
    js: [
      'function pollForNewSubmissions() { return NOTIFIER.pollForNewSubmissions() }',
      'function weeklyHeartbeat() { return NOTIFIER.weeklyHeartbeat() }',
    ].join('\n'),
  },
})

copyFileSync('notifier/appsscript.json', `${OUT_DIR}/appsscript.json`)
console.log(`notifier: built ${OUT_DIR}/Code.js`)
```

- [ ] **Step 3: Add the clasp config example**

The real `.clasp.json` holds a script id that only exists once the Apps Script project has been created, so it is generated during setup and gitignored. Create `notifier/.clasp.json.example`:

```json
{
  "scriptId": "PASTE_THE_SCRIPT_ID_FROM_APPS_SCRIPT_PROJECT_SETTINGS",
  "rootDir": "build"
}
```

- [ ] **Step 4: Update `.gitignore`**

Append to the end of the file:

```gitignore
# Apps Script notifier — generated bundle and the per-install script id
notifier/build/
notifier/.clasp.json
```

- [ ] **Step 5: Add the npm scripts**

In `package.json`, add these two entries alongside the existing scripts:

```json
"notifier:build": "node notifier/build.mjs",
"notifier:push": "node notifier/build.mjs && cd notifier && clasp push --force",
```

- [ ] **Step 6: Run the build and inspect the output**

```bash
npm run notifier:build
```

Expected: `notifier: built notifier/build/Code.js`.

```bash
tail -3 notifier/build/Code.js
```

Expected: the two `function pollForNewSubmissions()` / `function weeklyHeartbeat()` declarations.

- [ ] **Step 7: Verify the bundle has no leftover module syntax**

Apps Script rejects `import` and `export` statements outright.

```bash
grep -nE "^(import|export)[ {]" notifier/build/Code.js || echo "clean: no module syntax"
```

Expected: `clean: no module syntax`.

- [ ] **Step 8: Verify the build output is not tracked**

```bash
git status --porcelain notifier/build
```

Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add notifier/build.mjs notifier/appsscript.json notifier/.clasp.json.example .gitignore package.json
git commit -m "build(notifier): esbuild bundle, Apps Script manifest and clasp wiring"
```

---

### Task 6: `?tab=pending` deep link in the dashboard

So the email's link lands on the review queue rather than the default tab.

**Files:**
- Create: `src/lib/dashboardTabs.ts`
- Create: `src/lib/dashboardTabs.test.ts`
- Modify: `src/components/StudentDashboard.tsx` (imports at line 1; `Tab` type at line 21; new effect beside the existing one at lines 108–111)

**Interfaces:**
- Consumes: nothing.
- Produces: `type DashboardTab = 'available' | 'mine' | 'solved' | 'all' | 'pending'` and `initialTab(search: string, isSuperUser: boolean): DashboardTab`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/dashboardTabs.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialTab } from './dashboardTabs.ts'

test('no query string means the default tab', () => {
  assert.equal(initialTab('', true), 'available')
  assert.equal(initialTab('?', true), 'available')
})

test('a super user following the notification link lands on Pending', () => {
  assert.equal(initialTab('?tab=pending', true), 'pending')
})

test('a non-super-user cannot reach Pending through the URL', () => {
  // The tab does not exist for them, and the rules would reject its query.
  assert.equal(initialTab('?tab=pending', false), 'available')
})

test('the other tabs work for anyone', () => {
  assert.equal(initialTab('?tab=solved', false), 'solved')
  assert.equal(initialTab('?tab=mine', false), 'mine')
  assert.equal(initialTab('?tab=all', false), 'all')
})

test('an unknown tab falls back rather than rendering nothing', () => {
  assert.equal(initialTab('?tab=nonsense', true), 'available')
  assert.equal(initialTab('?tab=', true), 'available')
})

test('tab is found among other parameters and is case-insensitive', () => {
  assert.equal(initialTab('?utm_source=email&tab=pending', true), 'pending')
  assert.equal(initialTab('?tab=Pending', true), 'pending')
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module` for `./dashboardTabs.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/dashboardTabs.ts`:

```ts
// Which dashboard tab a URL asks for. Split out from StudentDashboard so the
// notifier's ?tab=pending deep link is testable without mounting React.

export type DashboardTab = 'available' | 'mine' | 'solved' | 'all' | 'pending'

const TABS: DashboardTab[] = ['available', 'mine', 'solved', 'all', 'pending']
const DEFAULT_TAB: DashboardTab = 'available'

/**
 * @param search      `window.location.search`, with or without the leading '?'.
 * @param isSuperUser Pending is a super-user-only queue; anyone else asking for
 *                    it gets the default rather than an empty tab.
 */
export function initialTab(search: string, isSuperUser: boolean): DashboardTab {
  const requested = new URLSearchParams(search).get('tab')?.toLowerCase() ?? ''
  const match = TABS.find(t => t === requested)
  if (!match) return DEFAULT_TAB
  if (match === 'pending' && !isSuperUser) return DEFAULT_TAB
  return match
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 5: Wire it into the dashboard**

In `src/components/StudentDashboard.tsx`, change the React import on line 1 from:

```tsx
import { useState, useEffect } from 'react'
```

to:

```tsx
import { useState, useEffect, useRef } from 'react'
```

Add this import beside the other `@/lib` imports (below the `partitionByReview` import):

```tsx
import { initialTab, type DashboardTab } from '@/lib/dashboardTabs'
```

Replace the local `Tab` type declaration at line 21:

```tsx
type Tab = 'available' | 'mine' | 'solved' | 'all' | 'pending'
```

with an alias to the shared type, so the two can never drift:

```tsx
type Tab = DashboardTab
```

- [ ] **Step 6: Add the deep-link effect**

Immediately after the existing effect at lines 108–111 (`// The Pending tab only exists for super users; fall back if that flips off.`), add:

```tsx
  // Honour ?tab= from the notification email. isSuperUser resolves
  // asynchronously and the effect above forces 'pending' back to 'available'
  // until it does, so this waits for the flag rather than running on mount.
  // The ref makes it fire once — otherwise a teacher who clicked away would be
  // dragged back to Pending on the next render.
  const deepLinkApplied = useRef(false)
  useEffect(() => {
    if (deepLinkApplied.current) return
    const requested = initialTab(window.location.search, isSuperUser)
    if (requested === 'available') return
    setTab(requested)
    deepLinkApplied.current = true
  }, [isSuperUser])
```

- [ ] **Step 7: Type-check and lint**

```bash
npm run build && npm run lint
```

Expected: both succeed. `noUnusedLocals` will catch a stray import here.

- [ ] **Step 8: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:5173/design-problem-bank/dashboard/?tab=pending`, sign in with the super-user account, and confirm the Pending tab is selected once sign-in resolves. Then click to another tab and confirm you are not pulled back. Finally open the same URL signed out, sign in with a non-super-user account if one is available, and confirm it lands on Available.

- [ ] **Step 9: Commit**

```bash
git add src/lib/dashboardTabs.ts src/lib/dashboardTabs.test.ts src/components/StudentDashboard.tsx
git commit -m "feat(dashboard): open the review queue from a ?tab=pending link"
```

---

### Task 7: Deployment runbook and project documentation

The setup is manual and one-time. It must be written down or it is unreproducible.

**Files:**
- Create: `notifier/README.md`
- Modify: `CLAUDE.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: everything above.
- Produces: no code.

- [ ] **Step 1: Write the runbook**

Create `notifier/README.md`:

````markdown
# Submission notifier

Emails every super user within ~5 minutes when a problem is submitted, so the
Pending queue never sits unwatched. Design:
[docs/superpowers/specs/2026-09-22-submission-notifications-design.md](../docs/superpowers/specs/2026-09-22-submission-notifications-design.md).

It is a Google Apps Script project owned by a teacher's Dawson account. Google
sends the mail, so it authenticates as that account and lands in the inbox;
`dawsonschool.org` publishes `DMARC p=quarantine` behind an SPF `-all`, so a
third-party sender using an `@dawsonschool.org` From line would be quarantined.

**It cannot write to Firestore.** Its only Firestore scope is
`cloud-platform.read-only`, and there is no stored credential of any kind —
authentication is `ScriptApp.getOAuthToken()`. Keep it that way.

## Layout

| Path | What it is |
|---|---|
| `src/selection.ts` | Which pending ids have not been emailed yet |
| `src/email.ts` | Digest and heartbeat bodies (text + HTML) |
| `src/firestore.ts` | Firestore REST reads, with the HTTP call injected |
| `src/main.ts` | The `poll` and `heartbeat` flows |
| `src/env.ts` | **The only file allowed to name an Apps Script global** |
| `src/entry.ts` | esbuild entry; the build footer exposes the trigger globals |
| `build/` | Generated bundle — gitignored |

Tests run under the repo's `npm test`, so CI blocks a deploy on a broken
notifier.

## First-time setup

1. **Create the project.** <https://script.google.com> → New project. Rename it
   "Problem Bank notifier". Project Settings → copy the **Script ID**.
2. **Create `.clasp.json`.** Copy `.clasp.json.example` to `notifier/.clasp.json`
   and paste the Script ID in. It is gitignored — it is per-install, not shared.
3. **Attach the Cloud project.** Project Settings → Google Cloud Platform (GCP)
   Project → Change project → enter the project **number** for
   `dawson-problem-bank-24a9c` (Firebase console → Project settings → General).
   The OAuth consent screen is already configured, because Google Sign-in works
   on the live site.
4. **Log in and push.**
   ```bash
   npx clasp login
   npm run notifier:push
   ```
5. **Authorise.** In the Apps Script editor pick `pollForNewSubmissions` and
   press Run. Grant the scopes when prompted. This first run **seeds silently**:
   it records whatever is already pending and sends nothing. That is correct.
6. **Create the triggers.** Editor → Triggers (clock icon) → Add trigger:
   - `pollForNewSubmissions` — Time-driven → Minutes timer → Every 5 minutes
   - `weeklyHeartbeat` — Time-driven → Week timer → Monday → 7am to 8am

   The manifest sets `America/Denver`, so that is 7am Mountain year-round.
7. **End-to-end test.** Submit a problem through the live wizard. Within five
   minutes an email should arrive from your own address. Open the link and
   confirm it lands on the Pending tab.
8. **If it went to spam,** add a Gmail filter on the subject prefix and tick
   "Never send it to Spam". Expected to be unnecessary — the mail is genuinely
   from you — but check once.

## Making changes

```bash
npm test              # the logic; run this first
npm run notifier:push # bundle and upload
```

Always edit `notifier/src`, never the Apps Script web editor — the editor copy
is overwritten by the next push, and the repo is the source of truth. If someone
has edited it in the browser, `cd notifier && npx clasp pull` before pushing.

## Troubleshooting

| Symptom | Cause |
|---|---|
| No emails and no errors | A trigger was deleted or never created. Check the Triggers page. |
| `403` in the execution log | The GCP project is not attached, or the scopes were not granted. Redo steps 3 and 5. |
| Emails stopped and a "Summary of failures" arrived | Read the execution log; Apps Script disables a trigger after repeated failures. |
| No Monday heartbeat | The clearest signal the notifier has stopped. Start at the Triggers page. |
| Everything pending re-emailed at once | The stored id set was cleared. Harmless; it settles after one cycle. |
````

- [ ] **Step 2: Document it in `CLAUDE.md`**

Add this section immediately before the `## Super User Role` heading:

```markdown
## Submission notifications (`notifier/`)
A Google Apps Script project that emails every super user within ~5 minutes of a
new submission, plus a Monday heartbeat. Source lives in `notifier/src`, bundled
by `npm run notifier:build` and deployed with `npm run notifier:push` — **git
push does NOT deploy it**, same as `firestore.rules`. Setup runbook:
`notifier/README.md`.

- **It must never write to Firestore.** Its only Firestore scope is
  `cloud-platform.read-only` and there is no stored credential —
  `ScriptApp.getOAuthToken()` uses the owning teacher's identity. Adding a write
  means widening the scope, which is a deliberate decision, not a passing change
- `notifier/src/env.ts` is the **only** file permitted to name an Apps Script
  global. Everything else takes `NotifierEnv` and is unit-tested by `npm test`
- It tracks already-emailed document **ids** in `PropertiesService`, not a
  timestamp — `createdAt` comes from the submitter's browser clock, so a
  watermark would silently skip a submission from a device running slow
- The query is `approved == false` with no `orderBy`: that uses the automatic
  single-field index (no `firestore.indexes.json` change) and keeps 288
  polls/day inside the free read quota. An unfiltered poll would exceed it
  once the bank passed ~170 problems
- **Never send from `@dawsonschool.org` via a third party.** The domain
  publishes `DMARC p=quarantine; pct=100` behind an SPF `-all`; mail would be
  quarantined and the school's IT admin would get reports naming the sender.
  Apps Script is safe because Google itself is sending
- The script is owned by one teacher's account. If that account is suspended,
  notifications stop and the missing Monday heartbeat is the signal
```

- [ ] **Step 3: Update `TODO.md`**

Add this section immediately after the `## Security — still open after Phase 1` section:

```markdown
## Phase 4 — Submission notifications: BUILT, not yet deployed
Apps Script notifier in `notifier/`; spec at
`docs/superpowers/specs/2026-09-22-submission-notifications-design.md`, runbook
at `notifier/README.md`.
- [ ] Work through `notifier/README.md` "First-time setup" (creates the script,
      attaches the GCP project, grants scopes, creates the two triggers)
- [ ] Confirm Dawson's Workspace admin does not block Apps Script or require
      OAuth app allowlisting — this is the one accepted risk that could veto the
      approach. If it does, Appendix A of the spec is the Cloudflare fallback
- [ ] End-to-end: submit through the live wizard, confirm the email arrives
      within five minutes and its link opens the Pending tab
- [ ] Confirm the first Monday heartbeat arrives
- [ ] Add a second teacher to `config/superusers` and confirm they are emailed too
```

- [ ] **Step 4: Verify the whole suite and build are clean**

```bash
npm test && npm run build && npm run lint
```

Expected: all three succeed.

- [ ] **Step 5: Commit**

```bash
git add notifier/README.md CLAUDE.md TODO.md
git commit -m "docs(notifier): setup runbook, CLAUDE.md invariants and TODO checklist"
```

---

## Verification

After Task 7, before deploying anything:

- [ ] `npm test` passes, including the new `notifier/src/**` tests
- [ ] `npm run build` passes — this proves `tsconfig.notifier.json` is wired into `tsc -b`
- [ ] `npm run lint` is clean
- [ ] `npm run notifier:build` produces `notifier/build/Code.js` with no `import`/`export` statements
- [ ] `git status` is clean and `notifier/build/` is untracked
- [ ] `grep -rn "submitterContact" notifier/src` returns nothing
- [ ] `grep -rln "UrlFetchApp\|MailApp\|ScriptApp\|PropertiesService" notifier/src` returns only `notifier/src/env.ts`

The remaining steps are the manual setup in `notifier/README.md`, which requires
the teacher's Google account and cannot be scripted.
