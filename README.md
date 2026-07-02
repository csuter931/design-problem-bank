# Design Problem Bank

A web app for [Dawson School](https://www.dawsonschool.org/) where the community submits real-world design problems and student teams claim and solve them.

**Live site:** https://csuter931.github.io/design-problem-bank/

## What it does

- **Public gallery** — anyone can browse, search, filter, upvote, and comment on submitted problems
- **Submit wizard** — a 3-step form for submitting a new problem, with photo uploads
- **Student dashboard** — students sign in with their school Google account, form teams, claim problems, track status (claimed → in progress → solved), keep private team notes, and generate outreach emails to submitters
- **Super users (teachers)** — can edit/delete/unclaim any problem, see all teams' notes, and manage teams

## Tech

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite, Tailwind CSS, framer-motion |
| Database | Firebase Firestore (real-time listeners) |
| Auth | Firebase Google Sign-in (Dawson accounts only) |
| Images | Cloudinary unsigned uploads |
| Hosting | GitHub Pages, deployed by GitHub Actions on push to `main` |

## Development

```bash
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # run tests
npm run lint     # ESLint
npm run build    # type-check + production build
```

Work on a branch, open a PR to `main`. CI runs tests before every deploy — a failing test blocks the release.

Changes to `firestore.rules` are **not** deployed by git push; run `firebase deploy --only firestore:rules`.

See [SETUP.md](./SETUP.md) for the full development/deployment guide and [CLAUDE.md](./CLAUDE.md) for architecture and backend configuration details.
