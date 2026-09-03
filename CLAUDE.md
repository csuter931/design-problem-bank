# Design Problem Bank — Project Context

> See also: [TODO.md](./TODO.md) for outstanding tasks and future ideas.

## What this is
A web app for Dawson School that lets teachers manage a bank of design problems, and students browse/comment on them and claim problems as team projects.

## Live site
**https://csuter931.github.io/design-problem-bank/**

## Tech stack
- **React 19 + TypeScript + Vite** multi-page app (`src/`), styled with **Tailwind CSS 3**. Two entries, listed in `build.rolldownOptions.input` in `vite.config.ts` (both must stay listed — dropping `main` silently drops the gallery):
  - `index.html` → `src/main.tsx` → the public gallery at `/design-problem-bank/`
  - `dashboard/index.html` → `src/dashboard.tsx` → the Student Dashboard at **`/design-problem-bank/dashboard/`** (noindex; the URL is handed directly to students). No router library — the web server routes. Back / sign-out navigate to `import.meta.env.BASE_URL`
- **framer-motion** for animations
- Tests: `node:test` with TypeScript type stripping (`src/**/*.test.ts`); Firestore rules tests in `tests/rules/` run against the emulator (`@firebase/rules-unit-testing`)

### npm scripts
- `npm run dev` — dev server at localhost:5173 (talks to **production** Firestore)
- `npm test` — run the unit test suite (this is what CI runs)
- `npm run test:rules` — run the Firestore rules suite in the emulator (**needs Java**; not run in CI). Run it after any change to `firestore.rules`
- `npm run lint` — ESLint (keep it clean; it is not run in CI)
- `npm run build` — type-check (`tsc -b`) + production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run emulators` / `npm run emulators:seed [email]` / `npm run dev:emulator` — local end-to-end testing against the Firestore emulator with seeded fixtures; the given email (default: the project owner's) becomes the super user. Google sign-in is still real; only Firestore is local. See `scripts/seed-emulator.mjs`
- `npm run problems:backfill` — one-time `approved` backfill (see Moderation)

## Branding (Dawson School)
Source of truth: `Dawson Brand Manual_Quick Reference Guide_Updated 2023.pdf` in the repo root — **gitignored, never commit it** (institutional asset). Extract text with `pdftotext` if you need to re-check a value; do not guess colours.

- **Palette** lives in `tailwind.config.js` under `theme.extend.colors.dawson` (`blue #0033A0`, `carolina #7BB0D4`, `royal #00205B`, `charcoal`, `silver`, `seagreen #22ACA3`, `alabaster`, `purple #4D1551`, `orange #FF9966`) plus `navy-900/800/700` — Royal Blue shades used as the page / modal / gallery surfaces. The shadcn-style semantic tokens in `src/index.css` (`--primary` = Dawson Blue, `--accent`/`--ring` = Carolina Blue, `--secondary` = Sea Green) are the same colours as HSL. There is **one dark theme only**; the old light `:root` / `.dark` split is gone.
- **Semantic colour mapping**: new / approve / upvoted → `dawson-seagreen`; claimed / pending / super-user → `dawson-orange`; in progress / disciplines → `dawson-carolina`; solved → `dawson-purple` (dark, so used as a heavier surface with `text-purple-200`); destructive stays Tailwind `red`. `STATUS_COLORS` in `lib/problemMeta.ts` is the single source for status badges.
- **Type**: `font-sans` = Nunito (the manual's Google replacement for Avenir), `font-display` = Crimson Pro (replacement for Minion Pro, the "Dawson" wordmark face) — used for headings. Loaded via the Google Fonts `@import` at the top of `src/index.css`. Never reintroduce inline `style={{ fontFamily }}`.
- **Hero glows** use `rgb(var(--dawson-blue)/…)` and `rgb(var(--dawson-seagreen)/…)` so they can't drift from the palette.
- **Favicon** (`public/favicon.svg`) is a Dawson Blue tile with the light-bulb mark in Atomic Orange — brand colours, but deliberately *not* the school logo.
- **Logo**: not yet in the repo. The 💡 emoji in `App.tsx` and `StudentDashboard.tsx` is a placeholder. The manual requires the approved logo files (Employee Resources → Marketing and Branding folder), the reversed-colour version on dark backgrounds, no recolouring, no stretching, and a safety margin equal to the height of "SCHOOL". Contact `marcomm@dawsonschool.org` for brand questions.
- All text/background pairs were contrast-checked ≥ 5.5:1 (AA) on both navy surfaces; the one failing pair (white on Sea Green, 2.8:1) is not used anywhere — Sea Green is text/border/tint only.

## Hosting & Deployment
- Hosted on **GitHub Pages**; repo: **https://github.com/csuter931/design-problem-bank**
- CI (`.github/workflows/deploy.yml`) runs on every push to `main`: Node 24 → `npm ci` → `npm test` → build → deploy `dist/` to Pages. **A failing test or type error blocks deployment.** Site updates a minute or two after push.
- The Vite `base` is `/design-problem-bank/` (`vite.config.ts`) — required for Pages subpath hosting
- Firebase Hosting was set up but disabled — we use GitHub Pages instead

## App structure (`src/`)
- `main.tsx` / `App.tsx` — public gallery: browse/search/filter **approved** problems, upvote, comment, open the submit wizard. Shows an explicit load error (not an empty bank) if the Firestore query is rejected. There is deliberately no link to the dashboard — students get `https://csuter931.github.io/design-problem-bank/dashboard/` directly
- `dashboard.tsx` — entry for the `/dashboard/` page; renders `StudentDashboard` directly
- `components/StudentDashboard.tsx` — signed-in view (Google sign-in required): team setup, claim problems, update status, email templates; super-user controls live here, including the **Pending** review tab and **Export JSON**
- `components/ProblemDetail.tsx` — shared detail modal (photos/lightbox, comments, team notes, super-user Approve/Reject); exports the `Problem` type
- `components/SubmitWizard.tsx` — 3-step public submission wizard; uploads photos to Cloudinary
- `components/EditProblemModal.tsx` — super-user edit form for all problem fields
- `components/ManageTeamsModal.tsx` — super-user team list/delete
- `lib/firebase.ts` — Firebase app/auth/Firestore init (public API key lives here)
- `lib/problemMeta.ts` — shared status/severity/category/discipline constants (single source of truth for tag vocabularies)
- `lib/moderation.ts` (+ test) — `isApproved` / `isPendingReview` / `isRejected` / `partitionByReview`; a doc missing `approved` reads as pending (fails safe)
- `lib/teams.ts` (+ `teams.test.ts`) — team grouping logic used by ManageTeamsModal
- `lib/votes.ts` — localStorage-based one-upvote-per-browser tracking
- `scripts/seed-problems.mjs` — original one-time production seeding script (**no longer works** under the hardened rules; kept for reference)
- `scripts/seed-emulator.mjs` — seeds the local emulator for manual testing
- `scripts/backfill-approved.mjs` — one-time `approved` backfill for pre-moderation docs (see Moderation)
- `scripts/backup-problems.mjs` / `scripts/restore-problems.mjs` — dump and reload the `problems` collection over unauthenticated REST (see Resetting the bank for what still works)
- `tests/rules/firestore.test.ts` — emulator tests for `firestore.rules`, one per allowed and denied write shape

## Backend Services

### Firebase (project: dawson-problem-bank-24a9c)
- **Firestore**: main database (problems, teams, config collections)
- **Authentication**: Google Sign-in via `signInWithPopup` (redirect had reliability issues on GitHub Pages). After sign-in, a client-side check restricts access to `@dawsonschool.org` / `@dawsonstudents.org` accounts (`StudentDashboard.tsx`)
- **Security rules**: `firestore.rules`, deployed via `firebase deploy --only firestore:rules` (git push does NOT deploy rules). Run `npm run test:rules` first
- **Indexes**: `firestore.indexes.json`, deployed via `firebase deploy --only firestore:indexes`. The gallery query (`approved == true` + `orderBy createdAt`) requires the composite index defined there. **Never run bare `--only firestore`** — it deploys rules and indexes together, out of the safe order

### Cloudinary (image uploads)
- Cloud name: `dexhdf03b`, upload preset: `problem-bank`
- Used in `src/components/SubmitWizard.tsx`

## Firestore Data Structure & Rules (summary — see firestore.rules)
Two identities are defined in the rules: **Dawson** = signed in with a verified `@dawsonschool.org` / `@dawsonstudents.org` email (enforced server-side, not just in the browser), and **super user** = Dawson *and* listed in `config/superusers.emails`.

- `problems`
  - **read**: public only for docs with `approved == true`. Every client list query must include `where('approved','==',true)` or Firestore rejects the whole query; super users may list unfiltered
  - **create**: public, but the doc must be born with `approved:false`, `status:'new'`, `upvotes:0`, empty `comments`, and no claim/note/review fields — a submitter can never self-approve
  - **update**: anonymous users get exactly two shapes on approved docs: `upvotes` +1 and a single well-formed comment append. Dawson users may additionally claim / progress / solve / unclaim and add `internalNotes` on approved docs. Super users may update anything (approve, reject, edit)
  - **delete**: super users only
- `teams/{uid}` — one doc per member, doc ID = user uid, `{ name, members, joinedAt }`; a "team" is the set of docs sharing a `name`. Read: Dawson. Create/update: own doc, shape-checked. Delete: own doc, or any doc as a super user (Manage Teams)
- `config/superusers { emails: [] }` — read: Dawson; write: disabled (edit in Firebase console only). **Entries must be lowercase** — the rule lowercases the signed-in email but cannot lowercase the stored list. A capitalised entry silently locks that teacher out of every super-user action; the dashboard shows a red banner when it detects this

> ⚠️ Remaining gaps (tracked in TODO.md): `internalNotes` and `submitterContact` are readable by any Dawson account (better than world-readable, but not private — Firestore has no field-level read rules; the fix is a private subcollection), and team ownership is not enforced (any Dawson student can change the status of any approved problem).

## Moderation (review queue)
A submitted problem is **not public until a teacher approves it** — enforced by the rules above, not just the UI.

- The wizard writes `approved: false`; the success screen tells the submitter to expect review
- Super users see a **⏳ Pending** tab in the dashboard (amber count badge) with Approve / Reject / View details, and Approve/Reject inside the detail modal. Approve sets `approved:true, reviewedBy, reviewedAt`; **Reject is soft** (`approved:false, rejectedAt`) so it is recoverable from the Rejected list on the same tab. Delete stays a separate explicit action
- Unapproved problems hide upvote/comment/claim controls (the rules reject those writes anyway)
- **Backfill**: docs created before moderation have no `approved` field and read as *pending*. `npm run problems:backfill` (dry run) / `-- --apply` writes `approved:false` to every doc missing it, or `--approve-all` for `true`. It only ever touches docs *missing* the field, so re-running cannot undo a teacher's decision. It uses unauthenticated REST and therefore **must run before the hardened rules are deployed**

### Deploy order for rules changes (client first, rules last)
The new client works under the old rules, but the old client does not work under the new rules. So:
1. `npm run problems:backup` while it still works; confirm the count
2. `firebase deploy --only firestore:indexes` — wait until the console shows **Enabled**, not Building
3. `npm run problems:backfill` → inspect → `npm run problems:backfill -- --apply` → confirm exit 0
4. Confirm every `config/superusers` entry is lowercase (Firebase console)
5. Merge to `main`; wait for the Pages build stamp to change; smoke-test under the old rules
6. `firebase deploy --only firestore:rules` at a low-traffic hour — this step is instant and cannot be undone by git
7. Re-test: gallery, anonymous upvote/comment, submit → Pending → Approve → visible, student claim/status/notes, super-user edit/delete/unclaim, Manage Teams delete. Negative check: `curl` an unauthenticated `GET .../documents/problems` → 403

**Rollback**: before step 6, `git revert` is enough. After step 6, revert the *rules first* (Firebase console → Rules → history has one-click rollback), then the client.

## Resetting the bank
> **Under the hardened rules, the REST maintenance scripts are locked out.** `problems:backup` is denied (unconstrained list), so `problems:clear` aborts before deleting anything (it fails safe — the `&&` never reaches the delete). Restore is denied for anything but a pristine new problem. Use the paths below.

**Backup**: sign in as a super user and click **⬇ Export JSON** in the dashboard header. It downloads every problem (including pending) in the same `__id` + fields shape as the old backup script, so `restore-problems.mjs` can still read it. Keep the file out of the repo — it contains submitter contact info.

**Clear**: with a fresh export in hand, delete via the Firebase CLI (admin credentials; `firebase login --reauth` if expired):

```
firebase firestore:delete problems --recursive --force --project dawson-problem-bank-24a9c
```

**Restore** is a break-glass operation: temporarily relax the `problems` create rule in the Firebase console, run the script, then redeploy the real rules immediately.

```
npm run problems:restore -- <export>.json [docId ...]
```

Restores preserve the original document ids. `backups/` is gitignored because the dumps contain
submitter contact emails — do not commit them.

## Super User Role
- Super users (teachers) are defined by email in Firestore at `config/superusers { emails: [] }`
- The `isSuperUser` flag is set in `StudentDashboard.tsx` on auth-state change by reading that doc
- Super users can: **approve/reject pending submissions**, see all teams' notes on any problem, add notes even on solved problems, edit/delete/unclaim any problem, manage/delete teams, and export the whole collection as JSON
- To add a super user: edit `config/superusers` in the Firebase console — **the email must be all lowercase** (see Firestore rules section)
- Regular team members: see/add notes only on problems their own team claimed; notes lock (read-only) once a problem is solved

## API Key Security
The Firebase API key in `src/lib/firebase.ts` is restricted in Google Cloud Console to two domains:
- `https://csuter931.github.io/*` — the live site
- `https://dawson-problem-bank-24a9c.firebaseapp.com/*` — Firebase's auth handler (required for the Google sign-in popup)

If you add a third domain in the future, it must be added there too or sign-in will break.
A new *path* on the same host (e.g. `/dashboard/`) needs no changes — all three configs are host-scoped.
Firebase API keys are public by design; actual security comes from Firestore rules + Auth.

## Google Sign-in Configuration
Three things must be configured for Google sign-in to work on a new domain:
1. **Firebase Auth authorized domains** — console.firebase.google.com → Authentication → Settings → Authorized domains
2. **OAuth client JavaScript origins** — console.cloud.google.com → APIs & Services → Credentials → Web client → Authorized JavaScript origins
3. **API key referrer restriction** — console.cloud.google.com → APIs & Services → Credentials → API key → Website restrictions

All three were set up for `csuter931.github.io`.

## Google Cloud Project
- Project name: Dawson Problem Bank, project ID: dawson-problem-bank-24a9c
- There is also an older project "Dawson Problem Bank" (no suffix) — ignore that one

## Historical docs
`docs/superpowers/` contains plans/specs from the pre-React static-HTML era (they reference the deleted `admin.html` and old root `styles.css`). Keep for history; do not treat as current architecture.
