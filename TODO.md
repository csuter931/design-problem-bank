# Problem Bank — Outstanding Tasks & Ideas

Last updated: 2026-05-14

## Before User Launch
- [x] **Restrict sign-in to Dawson domains** — post-sign-in domain check in StudentDashboard.tsx and StudentPortal.tsx; allows @dawsonschool.org and @dawsonstudents.org, signs out and shows error for all others
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
- **Expand sign-in beyond Dawson domains** — if the app ever grows past Dawson, update the domain allowlist in `handleSignIn` in StudentDashboard.tsx and StudentPortal.tsx (currently hardcoded to @dawsonschool.org and @dawsonstudents.org) and decide on a new access-control strategy

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
