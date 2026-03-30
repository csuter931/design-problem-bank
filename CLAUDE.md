# Design Problem Bank — Project Context

> See also: [TODO.md](./TODO.md) for outstanding tasks and future ideas.

## What this is
A web app for Dawson School that lets teachers manage a bank of design problems, and students browse/comment on them.

## Live site
**https://csuter931.github.io/design-problem-bank/**

## Hosting & Deployment
- Hosted on **GitHub Pages** (auto-deploys on push to `main`)
- Repo: **https://github.com/csuter931/design-problem-bank**
- Workflow: edit files → `git add` → `git commit` → `git push` → site updates in ~30 seconds
- Firebase Hosting was set up but disabled — we use GitHub Pages instead

## Backend Services

### Firebase (project: dawson-problem-bank-24a9c)
- **Firestore**: main database (problems, teams collections)
- **Authentication**: Google Sign-in (teachers/admins only)
- **Security rules**: deployed via `firebase deploy` (firestore.rules)
- Firebase CLI is installed; run `firebase deploy` to update Firestore rules

### Cloudinary (image uploads)
- Cloud name: `dexhdf03b`
- Upload preset: `problem-bank`
- Used for problem images in both index.html and admin.html

## Firestore Data Structure
- `problems` — read/create/update: public, delete: authenticated only
- `teams` — read/write/delete: authenticated, own document only (doc ID = user uid)
- `config/superusers` — read: authenticated only, write: disabled (manage via Firebase console only)

## Super User Role
- Super users (teachers) are defined by email in Firestore at `config/superusers { emails: [] }`
- The `isSuperUser` flag is set in `admin.html` during `onSignedIn()` by reading this document
- Super users can: see all teams' notes on any problem, add notes even on solved problems, edit/delete/unclaim any problem
- To add a new super user: edit `config/superusers` in the Firebase console and add their email to the `emails` array
- Regular team members: can only see/add notes on problems their own team claimed; notes locked (read-only) after problem is marked solved

## Files
- `index.html` — student-facing view (browse problems, add comments)
- `admin.html` — teacher/admin view (Google sign-in required, manage problems)
- `firestore.rules` — Firestore security rules
- `firebase.json` — Firebase config (Firestore rules only, no hosting)
- `.firebaserc` — links to Firebase project dawson-problem-bank-24a9c

## API Key Security
The Firebase API key in index.html and admin.html is restricted in Google Cloud Console to two domains:
- `https://csuter931.github.io/*` — the live site
- `https://dawson-problem-bank-24a9c.firebaseapp.com/*` — Firebase's auth handler (required for Google sign-in popup to work)

If you add a third domain in the future, it must be added here too or sign-in will break.
Firebase API keys are public by design; actual security comes from Firestore rules + Auth.

## Google Sign-in Configuration
Three things must be configured for Google sign-in to work on a new domain:
1. **Firebase Auth authorized domains** — console.firebase.google.com → Authentication → Settings → Authorized domains
2. **OAuth client JavaScript origins** — console.cloud.google.com → APIs & Services → Credentials → Web client → Authorized JavaScript origins
3. **API key referrer restriction** — console.cloud.google.com → APIs & Services → Credentials → API key → Website restrictions

All three were set up for `csuter931.github.io`. Sign-in uses `signInWithPopup` (not redirect) — redirect had reliability issues on GitHub Pages.

## Google Cloud Project
- Project name: Dawson Problem Bank
- Project ID: dawson-problem-bank-24a9c
- There is also an older project "Dawson Problem Bank" (no suffix) — ignore that one
