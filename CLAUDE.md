# Design Problem Bank — Project Context

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
- `problems` — read: public, create/delete: authenticated only, update: public (students add comments)
- `teams` — read/write/delete: authenticated, own document only (doc ID = user uid)

## Files
- `index.html` — student-facing view (browse problems, add comments)
- `admin.html` — teacher/admin view (Google sign-in required, manage problems)
- `firestore.rules` — Firestore security rules
- `firebase.json` — Firebase config (Firestore rules only, no hosting)
- `.firebaserc` — links to Firebase project dawson-problem-bank-24a9c

## API Key Security
The Firebase API key in index.html and admin.html is restricted in Google Cloud Console to only work from `https://csuter931.github.io/*`. This is intentional — Firebase API keys are public by design; security comes from Firestore rules + Auth.

## Google Cloud Project
- Project name: Dawson Problem Bank
- Project ID: dawson-problem-bank-24a9c
- There is also an older project "Dawson Problem Bank" (no suffix) — ignore that one
