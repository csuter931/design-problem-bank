# Problem Bank — Outstanding Tasks & Ideas

Last updated: 2026-05-13

## Before User Launch
- [ ] **Restrict sign-in to @dawsonschool.org** — one-liner: `provider.setCustomParameters({ hd: 'dawsonschool.org' })` in StudentDashboard.tsx; prevents random Google accounts from creating teams
- [ ] **End-to-end submission wizard check** — step through: fill out form → upload photo → submit → confirm problem appears in gallery with correct data
- [ ] **Merge react-app → main** — make main the canonical branch, update deploy workflow to trigger on main, delete react-app branch

## Things to Test / Verify
- [ ] **Student dashboard tab counts** — verify Available / My Team's / Solved / All counts are correct after removing sample problems
- [ ] Confirm "My Team's Problems" tab hides/shows correctly when joining/leaving teams
- [ ] Verify notes visibility is correct for different user types (super user, claiming team, other teams)
- [ ] Test note locking on solved problems

## Features to Brainstorm
- [ ] Post-claim project management — tools teams need after claiming (task tracking, milestones, file sharing)

## Future Ideas (not urgent)
- Consider end-of-year archiving of claimed/solved problems
- Polish UI/UX based on real student usage feedback
- Add more super user capabilities as the site grows

---

## Completed

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
