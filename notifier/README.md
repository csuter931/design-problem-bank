# Submission notifier

Emails every super user within ~5 minutes when a problem is submitted, so the
Pending queue never sits unwatched. Design:
[docs/superpowers/specs/2026-09-22-submission-notifications-design.md](../docs/superpowers/specs/2026-09-22-submission-notifications-design.md).

It is a Google Apps Script project owned by a teacher's Dawson account. Google
sends the mail, so it authenticates as that account and lands in the inbox;
`dawsonschool.org` publishes `DMARC p=quarantine` behind an SPF `-all`, so a
third-party sender using an `@dawsonschool.org` From line would be quarantined.

**It cannot write to Firestore.** Its only Firestore scope is
`cloud-platform.read-only`, and there is no stored credential of any kind —
authentication is `ScriptApp.getOAuthToken()`. Keep it that way.

## Layout

| Path | What it is |
|---|---|
| `src/selection.ts` | Which pending ids have not been emailed yet |
| `src/email.ts` | Digest and heartbeat bodies (text + HTML) |
| `src/firestore.ts` | Firestore REST reads, with the HTTP call injected |
| `src/main.ts` | The `poll` and `heartbeat` flows |
| `src/env.ts` | **The only file allowed to name an Apps Script global** |
| `src/entry.ts` | esbuild entry; the build footer exposes the trigger globals |
| `build/` | Generated bundle — gitignored |

Tests run under the repo's `npm test`, so CI blocks a deploy on a broken
notifier.

## First-time setup

1. **Create the project.** Sign in to <https://script.google.com> as the
   Dawson account that should own the notifier — whichever account is active
   in the browser is the one that authenticates every send it makes later.
   **New project** → rename it "Problem Bank notifier" (click the title, top
   left) → **Project Settings** (⚙ in the left sidebar) → copy the
   **Script ID**.
2. **Create `.clasp.json`.** From the repo root:
   ```bash
   cp notifier/.clasp.json.example notifier/.clasp.json
   ```
   Paste the Script ID in as the `scriptId` value. It is gitignored — it is
   per-install, not shared.
3. **Attach the Cloud project.** Still in Project Settings: Google Cloud
   Platform (GCP) Project → Change project → paste the project **number**
   (not the id) for `dawson-problem-bank-24a9c` — find it at
   <https://console.firebase.google.com> → ⚙ Project settings → General →
   "Project number" — then confirm. The OAuth consent screen is already
   configured, because Google Sign-in works on the live site.
4. **Log in and push.** From the repo root:
   ```bash
   npx clasp login
   npm run notifier:push
   ```
   `clasp login` opens a browser tab — sign in as the same account as step 1.
5. **Authorise.** Back in the Apps Script editor, use the function dropdown
   next to the **Run** button (top toolbar) to select `pollForNewSubmissions`,
   then click **Run**. A "Google hasn't verified this app" screen is expected —
   it only means the script is private rather than published — click
   **Advanced** → **Go to Problem Bank notifier (unsafe)** → **Allow** to grant
   the scopes. The execution log at the bottom should then show
   `Execution completed`. This first run **seeds silently**: it records
   whatever is already pending and sends nothing. That is correct.
6. **Create the triggers.** Editor → Triggers (clock icon) → Add trigger:
   - `pollForNewSubmissions` — Time-driven → Minutes timer → Every 5 minutes
   - `weeklyHeartbeat` — Time-driven → Week timer → Monday → 7am to 8am

   The manifest sets `America/Denver`, so that is 7am Mountain year-round.
7. **End-to-end test.** Submit a problem through the live wizard at
   <https://csuter931.github.io/design-problem-bank/>. Within five minutes an
   email should arrive at your own address. Before opening its link, sign in
   on the dashboard with an account already listed in `config/superusers` —
   the link lands on the Pending tab only for a super user; any other account
   lands on Available instead, which can look like the link is broken when it
   is really just an account that isn't a super user yet.
8. **If it went to spam,** add a Gmail filter matching the sender name
   (`Dawson Problem Bank`) and tick "Never send it to Spam". Filter on the
   sender, not the subject — the subject varies by email (`New problem
   submitted — …`, `N new problems submitted`, `Problem Bank — …`), so there
   is no single prefix to match. Expected to be unnecessary — the mail is
   genuinely from you — but check once.

## Making changes

```bash
npm test              # the logic; run this first
npm run notifier:push # bundle and upload
```

Always edit `notifier/src`, never the Apps Script web editor — the editor copy
is overwritten by the next push, and the repo is the source of truth. If someone
has edited it in the browser, `cd notifier && npx clasp pull` before pushing.

## Troubleshooting

| Symptom | Cause |
|---|---|
| No emails and no errors | A trigger was deleted or never created. Check the Triggers page. |
| `403` in the execution log | The GCP project is not attached, or the scopes were not granted. Redo steps 3 and 5. |
| Emails stopped and a "Summary of failures" arrived | Read the execution log; Apps Script disables a trigger after repeated failures. |
| No Monday heartbeat | The clearest signal the notifier has stopped. Start at the Triggers page. |
| Everything pending re-emailed at once | The stored id set was cleared. Harmless; it settles after one cycle. |
