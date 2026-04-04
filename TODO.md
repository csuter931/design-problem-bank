# Problem Bank — Outstanding Tasks & Ideas

Last updated: 2026-04-03

## Bugs to Fix (React app)
- [ ] **Upvote UX is confusing** — blue vs grey state unclear to users; verify count updates correctly after voting and consider improving visual feedback / copy.
- [ ] **Student dashboard tab counts wrong** — e.g. "Available: 1, Solved: 7" doesn't add up. Check filter logic for how sample problems + Firestore problems are bucketed into Available / My Team's / Solved / All tabs.

## Bugs / Things to Test
- [x] Super user edit form — full scrollable form implemented (2026-03-30); all fields editable, delete/save/cancel footer
- [ ] Verify super user delete and unclaim work end-to-end (edit is done; delete uses closeActionModal now)
- [ ] Verify notes visibility is correct for different user types (super user, claiming team, other teams)
- [ ] Test note locking on solved problems
- [ ] Confirm "My Team's Problems" tab hides/shows correctly when joining/leaving teams
- [ ] Test full problem submission wizard end-to-end (public page → Cloudinary photo → Firestore)

## Code Cleanup
- [ ] `createNewTeam()` still references `teamMembersInput` internally — removed from UI but may still be in the save logic. Verify and clean up.
- [ ] `.edit-danger-zone` and `.edit-danger-label` CSS classes in admin.html are unused (danger zone was removed in favour of inline footer buttons). Safe to delete.

## Features to Brainstorm
- [ ] Post-claim project management — what tools teams need after claiming a problem (e.g. task tracking, milestones, file sharing)
- [ ] Browser-based testing via `claude --chrome`

## Future Ideas (not urgent)
- Restrict Google sign-in to `@dawsonschool.org` emails only (commented-out line already exists in admin.html: `provider.setCustomParameters({ hd: 'dawsonschool.org' })`)
- Add more super user capabilities as the site grows
- Consider end-of-year archiving of claimed/solved problems
- Polish UI/UX based on real student usage feedback
