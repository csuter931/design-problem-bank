# Development & Deployment Guide

How to work on the Design Problem Bank locally and get changes to the live site.

## Prerequisites

- **Node.js 24+** (CI uses Node 24; the test runner relies on built-in TypeScript type stripping)
- **Firebase CLI** (`npm install -g firebase-tools`) — only needed when changing Firestore security rules

## Local development

```bash
git clone https://github.com/csuter931/design-problem-bank.git
cd design-problem-bank
npm install
npm run dev        # http://localhost:5173
```

The dev server talks to the **production** Firebase project (`dawson-problem-bank-24a9c`) — there is no separate staging database, so anything you create locally shows up on the live site's data. The Firebase config in `src/lib/firebase.ts` is a public API key; access control comes from Firestore rules and Auth, not from hiding the key.

> Note: Google sign-in from `localhost` requires `localhost` to be an authorized domain in Firebase Auth and the OAuth client (it is by Firebase default). The public gallery and submissions work without signing in.

## Checks before pushing

```bash
npm test           # node:test suites (also run by CI before deploy)
npm run lint       # ESLint — not run in CI, so keep it clean locally
npm run build      # tsc type-check + Vite production build (what CI runs)
```

## Deploying the site

Deployment is automatic: push (or merge a PR) to `main` and GitHub Actions (`.github/workflows/deploy.yml`) runs tests, builds, and publishes to GitHub Pages. If tests or the type-check fail, the deploy is blocked. The site updates a minute or two after the workflow finishes.

Recommended flow: branch from `main` → develop/test locally → PR → merge.

## Deploying Firestore rules

Rules changes do **not** deploy with git push. After editing `firestore.rules`:

```bash
firebase deploy --only firestore:rules
```

(Requires being signed into the Firebase CLI with an account that has access to the `dawson-problem-bank-24a9c` project.)

## Seeding data

`scripts/seed-problems.mjs` inserts sample problems via the Firestore REST API. It was a one-time setup script — only run it against a fresh/empty database.

## Backend configuration

Firebase/Cloudinary/Google-sign-in configuration (authorized domains, API key restrictions, super-user list) is documented in [CLAUDE.md](./CLAUDE.md).
