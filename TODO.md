# Problem Bank — Outstanding Tasks & Ideas

Last updated: 2026-03-30

## Bugs / Things to Test
- [ ] Verify super user controls work end-to-end (edit, delete, unclaim)
- [ ] Verify notes visibility is correct for different user types (super user, claiming team, other teams)
- [ ] Test note locking on solved problems
- [ ] Confirm "My Team's Problems" tab hides/shows correctly when joining/leaving teams
- [ ] Test full problem submission wizard end-to-end (public page → Cloudinary photo → Firestore)

## Code Cleanup
- [ ] `createNewTeam()` still references `teamMembersInput` internally — removed from UI but may still be in the save logic. Verify and clean up.

## Features to Brainstorm
- [ ] Post-claim project management — what tools teams need after claiming a problem (e.g. task tracking, milestones, file sharing)
- [ ] Browser-based testing via `claude --chrome`

## Future Ideas (not urgent)
- Restrict Google sign-in to `@dawsonschool.org` emails only (commented-out line already exists in admin.html: `provider.setCustomParameters({ hd: 'dawsonschool.org' })`)
- Add more super user capabilities as the site grows
- Consider end-of-year archiving of claimed/solved problems
- Polish UI/UX based on real student usage feedback
