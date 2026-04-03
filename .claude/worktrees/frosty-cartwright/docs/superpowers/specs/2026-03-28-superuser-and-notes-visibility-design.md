# Design: Super User Role + Team Notes Visibility

**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Two related features:
1. **Notes visibility** — team notes on problems are private; only the claiming team and super users can see or interact with them
2. **Super user role** — teachers can log in with elevated access to see everything, edit anything, and moderate content

---

## Super User Role

### How it works
A Firestore document at `config/superusers` stores an array of authorized email addresses:
```
{ emails: ["teacher@dawsonschool.org", ...] }
```

On sign-in, the app reads this document and sets an `isSuperUser` boolean flag if `currentUser.email` is in the list. This check happens once at sign-in and is stored in memory for the session.

### Managing super users
Super users are added/removed by editing the `config/superusers` document directly in the Firebase console. No in-app UI is needed for this.

### Firestore rules
The `config/superusers` document must be readable by any authenticated user (so the app can check on sign-in) but writable only via the Firebase console (no client-side writes).

---

## Notes Visibility Rules

### Who can view notes
- The team whose name matches `problem.claimedByTeam`
- Super users

Everyone else (other teams, unauthenticated users) sees no notes section at all.

### Who can add/edit notes
- The claiming team, **only while** `problem.status` is `claimed` or `inprogress`
- Super users, always (even after `solved`)

When a problem is marked `solved`, the note input is hidden for regular team members — notes become a permanent read-only record of their work.

---

## Super User Capabilities

When `isSuperUser` is true, the following additional controls appear in the problem modal:

| Capability | Details |
|---|---|
| View all notes | Notes section visible on every problem regardless of claiming team |
| Add/edit notes | Note input always available, even on solved problems |
| Edit problem | Change title, description, photo, category |
| Delete problem | Remove inappropriate or duplicate submissions entirely |
| Unclaim problem | Reset status back to `new`, clearing `claimedByTeam`, `claimedByUser`, `claimedAt` |
| View submitter info | Submitter name, role, and contact always visible |

Super users do not get a separate page — all controls appear inline in the existing problem modal with additional UI elements conditionally rendered based on `isSuperUser`.

---

## Data Changes

No schema changes required. All needed fields already exist:
- `problem.claimedByTeam` — identifies the claiming team
- `problem.status` — determines note editability (`claimed`, `inprogress` = editable; `solved` = read-only for teams)
- `problem.internalNotes[]` — existing notes array

New Firestore document: `config/superusers { emails: [] }`

---

## Out of Scope
- In-app UI for managing super users (use Firebase console)
- Post-completion project management features (separate spec)
- Notes export/portfolio (may revisit later)
