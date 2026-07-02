# Design Problem Bank — Project Context

> See also: [TODO.md](./TODO.md) for outstanding tasks and future ideas.

## What this is
A web app for Dawson School that lets teachers manage a bank of design problems, and students browse/comment on them and claim problems as team projects.

## Live site
**https://csuter931.github.io/design-problem-bank/**

## Tech stack
- **React 19 + TypeScript + Vite** single-page app (`src/`), styled with **Tailwind CSS 3**
- **framer-motion** for animations
- Tests: `node:test` with TypeScript type stripping (`src/**/*.test.ts`)

### npm scripts
- `npm run dev` — dev server at localhost:5173
- `npm test` — run the test suite
- `npm run lint` — ESLint (keep it clean; it is not run in CI)
- `npm run build` — type-check (`tsc -b`) + production build to `dist/`
- `npm run preview` — serve the production build locally

## Hosting & Deployment
- Hosted on **GitHub Pages**; repo: **https://github.com/csuter931/design-problem-bank**
- CI (`.github/workflows/deploy.yml`) runs on every push to `main`: Node 24 → `npm ci` → `npm test` → build → deploy `dist/` to Pages. **A failing test or type error blocks deployment.** Site updates a minute or two after push.
- The Vite `base` is `/design-problem-bank/` (`vite.config.ts`) — required for Pages subpath hosting
- Firebase Hosting was set up but disabled — we use GitHub Pages instead

## App structure (`src/`)
- `App.tsx` — public gallery: browse/search/filter problems, upvote, comment, open the submit wizard; "Student Login" switches to the dashboard
- `components/StudentDashboard.tsx` — signed-in view (Google sign-in required): team setup, claim problems, update status, email templates; super-user controls live here
- `components/ProblemDetail.tsx` — shared detail modal (photos/lightbox, comments, team notes); exports the `Problem` type
- `components/SubmitWizard.tsx` — 3-step public submission wizard; uploads photos to Cloudinary
- `components/EditProblemModal.tsx` — super-user edit form for all problem fields
- `components/ManageTeamsModal.tsx` — super-user team list/delete
- `lib/firebase.ts` — Firebase app/auth/Firestore init (public API key lives here)
- `lib/problemMeta.ts` — shared status/severity/category/discipline constants (single source of truth for tag vocabularies)
- `lib/teams.ts` (+ `teams.test.ts`) — team grouping logic used by ManageTeamsModal
- `lib/votes.ts` — localStorage-based one-upvote-per-browser tracking
- `scripts/seed-problems.mjs` — one-time Firestore seeding script (kept as a utility)

## Backend Services

### Firebase (project: dawson-problem-bank-24a9c)
- **Firestore**: main database (problems, teams, config collections)
- **Authentication**: Google Sign-in via `signInWithPopup` (redirect had reliability issues on GitHub Pages). After sign-in, a client-side check restricts access to `@dawsonschool.org` / `@dawsonstudents.org` accounts (`StudentDashboard.tsx`)
- **Security rules**: `firestore.rules`, deployed via `firebase deploy --only firestore:rules` (git push does NOT deploy rules)

### Cloudinary (image uploads)
- Cloud name: `dexhdf03b`, upload preset: `problem-bank`
- Used in `src/components/SubmitWizard.tsx`

## Firestore Data Structure & Rules (summary — see firestore.rules)
- `problems` — read/create: public. Update: public **except** `internalNotes`, which requires auth. Delete: authenticated only
- `teams/{uid}` — one doc per member, doc ID = user uid, `{ name, members, joinedAt }`; a "team" is the set of docs sharing a `name`. Read: any authenticated user (needed for team lists). Write/delete: own doc only
- `config/superusers { emails: [] }` — read: authenticated; write: disabled (edit in Firebase console only)

> ⚠️ Known gaps: the rules trust any Google account as "authenticated" (domain check is client-side only), anonymous users can update most problem fields, and team notes / submitter contact info are world-readable on the problem doc. Hardening is planned — see the Security section in TODO.md.

## Super User Role
- Super users (teachers) are defined by email in Firestore at `config/superusers { emails: [] }`
- The `isSuperUser` flag is set in `StudentDashboard.tsx` on auth-state change by reading that doc
- Super users can: see all teams' notes on any problem, add notes even on solved problems, edit/delete/unclaim any problem, and manage/delete teams
- To add a super user: edit `config/superusers` in the Firebase console
- Regular team members: see/add notes only on problems their own team claimed; notes lock (read-only) once a problem is solved

## API Key Security
The Firebase API key in `src/lib/firebase.ts` is restricted in Google Cloud Console to two domains:
- `https://csuter931.github.io/*` — the live site
- `https://dawson-problem-bank-24a9c.firebaseapp.com/*` — Firebase's auth handler (required for the Google sign-in popup)

If you add a third domain in the future, it must be added there too or sign-in will break.
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
