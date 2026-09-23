# Problem Bank — Outstanding Tasks & Ideas

Last updated: 2026-09-23

## Phase 1 — Rules hardening + moderation: DEPLOYED 2026-09-03
Index, client (build `50b3221`), and rules are all live. The `problems` collection was already empty, so the backfill was a no-op. Verified in production: unauthenticated list / teams / config / unfiltered query / self-approving create all return 403; the approved-only gallery query returns 200; a wizard submission succeeds and stays hidden. Remaining checks need a signed-in human:
- [x] Teacher path verified live 2026-09-03: a new submission was hidden from the gallery, appeared in the **Pending** tab (badge showed 2 — the teacher's own test plus the deploy check), Approve made both public, Delete removed both.
- [ ] Sign in once with a `@dawsonstudents.org` account and claim an approved problem — `isDawson()` now also requires `email_verified`, which Google-provider tokens always carry, but confirm both domains in production. **More important after Phase 4:** every check so far has been as a super user, who passes `isSuperUser()` and so never exercises the plain-Dawson branch of the new `private/detail` rules. A student reading the contact and writing a team note is a genuinely untested path in production.
- [ ] Exercise Manage Teams delete and Edit save once as a super user.
- [ ] Remove this section once verified.

### Done in Phase 1 (2026-09-03)
- [x] Anonymous updates narrowed to exactly two shapes (upvote +1, single validated comment append), and only on approved docs
- [x] Dawson domain enforced in the rules for every authenticated path (with `email_verified`)
- [x] Delete is super-user only; super-user team delete has a rules path
- [x] Moderation gate: public create forces `approved:false`; read is approved-only; Pending tab with Approve / soft Reject; Export JSON replaces the locked-out backup script
- [x] Emulator rules test suite (`tests/rules/`), local emulator dev mode (`npm run dev:emulator`), backfill script

## Phase 2 — Student Dashboard on its own URL: DEPLOYED 2026-09-03
`/design-problem-bank/dashboard/` is a second Vite entry (`dashboard/index.html` → `src/dashboard.tsx`); the in-app view switch, lazy import, and OAuth-redirect flag are gone. Verified live (build `029537c`): the URL returns 200 with `noindex`, `…/dashboard` without the slash 301s to it, the sign-in card renders, and the gallery has no login control.
- [ ] Sign in with a `@dawsonstudents.org` account on the new URL (covers both the new path and the `email_verified` rule for the student domain).
- [ ] **Distribute the dashboard URL to students**: `https://csuter931.github.io/design-problem-bank/dashboard/`. The gallery's Student Login control was removed 2026-09-03 (pre-launch, so no one was stranded).

## Phase 3 — Dawson branding: DEPLOYED 2026-09-03 (build `1ccf854`)
Palette, type, surfaces, status colours, logo, favicon, and titles are on-brand (see "Branding" in CLAUDE.md); verified live at both URLs with no console errors. Kept the single dark theme on Royal Blue navy — a light Alabaster theme would mean touching ~390 white-on-dark utilities and is a separate decision.
- [x] Logo supplied — the reversed-colour (white) PNG is in both headers directly on the navy, per the manual's dark-background rule (2026-09-03). Full-colour version and EPS parked in gitignored `brand/`.
- [x] Visual review done live at both URLs 2026-09-22/23 (build `74064e6`). Crimson Pro was kept — it reads right, so the Nunito swap is off the table unless someone raises it again. The review did surface two real problems, both fixed in the pass below: the logo was too small for the "SCHOOL" line to resolve, and Dawson Blue text on navy was unreadable.

## Phase 4 — Header pass + contact privacy: DEPLOYED 2026-09-22/23 (build `74064e6`)
Six commits, `3b59f92`..`74064e6`. Client via Pages; the rules in `a680d00` were deployed separately with `firebase deploy --only firestore:rules` (credentials had expired — `firebase login --reauth` first).
- [x] Header/logo: logo up to `h-14 sm:h-16` (gallery) and `h-12 sm:h-14` (dashboard) — below 48px the stacked mark's "SCHOOL" line stops resolving, now enforced by a floor in `DawsonLogo.tsx`. Redundant tagline dropped, both headers rebuilt as mark → hairline → app name.
- [x] `← Back` replaced by a **Problem Bank** button in the dashboard header's top right. It renders outside the `user` guard — it is the only route back, so the signed-out sign-in screen needs it too.
- [x] Submitter contact + team notes moved to `problems/{id}/private/detail` (see Security below).
- [x] Contact now shows for **approved** problems and to the **claiming team**, not only to super users on pending ones. Sits beside Team Notes under the existing `canSeeNotes` gate; loading and empty states are explicit so "none on file" can't be mistaken for a failed load.
- [x] Contrast: `text-primary` on navy was ~1.5:1 in four places (team pill, selected tag chips, wizard current-step marker). Fixed to 6.3–10.8:1. Dawson Blue is a background, never text on navy — rule now stated in CLAUDE.md.
- [x] Verified live as a super user 2026-09-23: claim, team note added and persisted, submitter contact renders, and the full super-user header row fits on one line.
- [x] **Toolchain**: installed Microsoft OpenJDK 21 (user PATH) and ran `npm install` in the worktree — `@firebase/rules-unit-testing` was declared but never installed, so the rules suite had never actually run. It runs now (61 tests).
- [ ] The main checkout's `node_modules` is likely stale for the same reason — run `npm install` there before trusting `npm run test:rules` from the repo root.

## Security — still open after Phase 1
- [x] **Team notes + submitter contact are no longer on the problem document** *(fixed 2026-09-22)*. They live in `problems/{id}/private/detail`, gated on `isDawson()` — see `src/lib/privateDetail.ts` and the "Private detail" block in `firestore.rules`. Done while the bank was empty, so no migration and no self-expiring rules clause were needed. Verified against the emulator: an anonymous read of the private doc returns 403, while the problem document still reads publicly; a real wizard submission put the contact in the subcollection and left the problem doc without it. 11 new rules tests (61 total, all passing). Export JSON now carries each problem's `__private` so backups do not silently lose contacts, and `restore-problems.mjs` writes it back.
- [x] **Deleting a problem orphans its `private/detail`** *(found and fixed 2026-09-23; introduced same-day by Phase 4)*. Firestore never cascades to subcollections, so `deleteDoc(doc(db,'problems',id))` left the submitter's contact in the database forever, invisible to the app. Deletes now go through `deleteProblemWithPrivate()` in `lib/privateDetail.ts`, which batches both deletes so the pair is atomic. Two rules tests pin it: the batch succeeds only for a super user, and deleting a *non-existent* detail is allowed — without that, every problem with no contact would have become undeletable.
  - [ ] Sweep for details already orphaned by deletes made between the Phase 4 deploy and this fix. A `private` collection-group query would find them, but the rule is a specific path and does not enable collection-group reads, so this needs a temporary rule or the Firebase console. Likely only the deploy-window test problems, if any.
- [ ] **Team ownership is not enforced** — any Dawson student can change status on any approved problem, not just their own team's. Needs `claimedByTeam` to be checked against the caller's `teams/{uid}` doc in the rules.
- [ ] **Anonymous create is unlimited** — no rate limiting on submissions (same as before; the review queue now contains the blast radius).
- [ ] Dev-only `npm audit` findings (websocket-driver via emulator tooling) — none reach the production bundle; fixing bumps postcss/browserslist, so do it as a deliberate separate change.

## Phase 4 — Submission notifications: BUILT, not yet deployed
Apps Script notifier in `notifier/`; spec at
`docs/superpowers/specs/2026-09-22-submission-notifications-design.md`, runbook
at `notifier/README.md`.
- [ ] Confirm a real Firestore read succeeds with the declared `datastore`
      scope (README step 5: run `pollForNewSubmissions` by hand, check the
      execution log for `Execution completed`, not
      `ACCESS_TOKEN_SCOPE_INSUFFICIENT`) — before anything else below
- [ ] Work through `notifier/README.md` "First-time setup" (creates the script,
      attaches the GCP project, grants scopes, creates the two triggers)
- [ ] Confirm Dawson's Workspace admin does not block Apps Script or require
      OAuth app allowlisting — this is the one accepted risk that could veto the
      approach. If it does, Appendix A of the spec is the Cloudflare fallback
- [ ] End-to-end: submit through the live wizard, confirm the email arrives
      within five minutes and its link opens the Pending tab
- [ ] Confirm a non-super-user following the forwarded `?tab=pending` link lands on Available
- [ ] Confirm the first Monday heartbeat arrives
- [ ] Add a second teacher to `config/superusers` and confirm they are emailed too

## Before User Launch
- [ ] **Delete the `test` problem from production** — it is approved and public, so the gallery currently reads "1 Problems". Remove it (super-user Delete in the detail modal) so the bank opens empty when students arrive. See the orphaned-`private/detail` bug below: its contact will outlive it either way until that is fixed.
- [ ] **Seed two or three real problems before launch** — an empty gallery is a weak first impression, and a visibly fake placeholder invites students to treat the whole thing as a demo. Better written by a teacher than generated.
- [x] **Restrict sign-in to Dawson domains** — post-sign-in domain check in StudentDashboard.tsx; allows @dawsonschool.org and @dawsonstudents.org, signs out and shows error for all others
- [x] **End-to-end submission wizard check** — all fields, dropdowns, photo upload, validation, and gallery appearance verified
- [x] **Clean up branches** — deleted stale `dev` and `react-app` remote branches
- [x] **Merge react-app → main** — fast-forward merged; `deploy.yml` now triggers on `main`

## Things to Test / Verify
- [ ] **Student dashboard tab counts** — verify Available / My Team's / Solved / All counts are correct after removing sample problems
- [ ] Confirm "My Team's Problems" tab hides/shows correctly when joining/leaving teams
- [ ] Verify notes visibility is correct for different user types (super user, claiming team, other teams)
- [ ] Test note locking on solved problems

## Features to Brainstorm
- [ ] Post-claim project management — tools teams need after claiming (task tracking, milestones, file sharing)

## Ongoing Development Workflow (once on main)
- All future work happens on a `dev` branch cut from main: `git checkout -b dev`
- Test changes locally with `npm run dev` (runs at localhost:5173, main stays live and untouched)
- When happy with changes, open a PR from dev → main on GitHub and merge — site auto-deploys in ~30 seconds
- Add Netlify deploy previews if you ever need to share a work-in-progress URL with someone before merging

## Future Ideas (not urgent)
- **Expand sign-in beyond Dawson domains** — if the app ever grows past Dawson, update the domain allowlist in `handleSignIn` in StudentDashboard.tsx (currently hardcoded to @dawsonschool.org and @dawsonstudents.org) and decide on a new access-control strategy

- Consider end-of-year archiving of claimed/solved problems
- Polish UI/UX based on real student usage feedback
- Add more super user capabilities as the site grows

---

## Completed

- [x] **Code cleanup** — removed leftover `members: ''` property from `createNewTeam()`; deleted dead `.edit-danger-zone` / `.edit-danger-label` CSS classes (2026-04-02)
- [x] **Modal scroll lock** — `overscroll-y-contain` + `document.body.overflow = hidden` applied to all 6 modals; background no longer scrolls when scrolling inside a modal
- [x] **Photo gallery arrows** — prev/next buttons and photo count badge (1/3) added to ProblemDetail carousel
- [x] **Full image display** — switched from fixed-height `object-cover` to `object-contain` so photos are never cropped in the detail modal
- [x] **Lightbox** — clicking a photo in the detail modal opens a fullscreen overlay; carousel navigation works inside the lightbox; click outside or ✕ to close
- [x] **Super user controls in React dashboard** — Manage Teams button, Edit/Delete/Unclaim on any problem, notes on solved problems; all gated by `config/superusers` Firestore doc
- [x] **ManageTeamsModal** — lists teams with member count and active problem count; delete releases claimed problems back to Available
- [x] **EditProblemModal** — full edit form for all problem fields; clears optional fields with `deleteField()`
- [x] **Delete admin.html** — legacy standalone page removed; all functionality lives in the React app
- [x] **Claim button in detail modal** — teams can read the full problem detail and claim it in one step; Claim button in footer, Close on left
- [x] **Global contrast lift** — all secondary text raised from /25–/50 range to /50–/70 across App.tsx, StudentDashboard.tsx, ProblemDetail.tsx
- [x] **Upvote voted state** — fixed from dark navy (invisible) to white text on green background
- [x] **Card click opens detail modal** — whole card is clickable, removed separate "View details" button
- [x] **How Often dropdown** — fixed white-on-white text with `appearance-none` + explicit dark background
- [x] **Super user edit form** — full scrollable form implemented; all fields editable, delete/save/cancel footer (2026-03-30)
- [x] **Firestore rules** — `config/superusers` readable by authenticated users; teams collection readable collection-wide for super user queries
