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

1. **Create the project.** <https://script.google.com> → New project. Rename it
   "Problem Bank notifier". Project Settings → copy the **Script ID**.
2. **Create `.clasp.json`.** Copy `.clasp.json.example` to `notifier/.clasp.json`
   and paste the Script ID in. It is gitignored — it is per-install, not shared.
3. **Attach the Cloud project.** Project Settings → Google Cloud Platform (GCP)
   Project → Change project → enter the project **number** for
   `dawson-problem-bank-24a9c` (Firebase console → Project settings → General).
   The OAuth consent screen is already configured, because Google Sign-in works
   on the live site.
4. **Log in and push.**
   ```bash
   npx clasp login
   npm run notifier:push
   ```
5. **Authorise.** In the Apps Script editor pick `pollForNewSubmissions` and
   press Run. Grant the scopes when prompted. This first run **seeds silently**:
   it records whatever is already pending and sends nothing. That is correct.
6. **Create the triggers.** Editor → Triggers (clock icon) → Add trigger:
   - `pollForNewSubmissions` — Time-driven → Minutes timer → Every 5 minutes
   - `weeklyHeartbeat` — Time-driven → Week timer → Monday → 7am to 8am

   The manifest sets `America/Denver`, so that is 7am Mountain year-round.
7. **End-to-end test.** Submit a problem through the live wizard. Within five
   minutes an email should arrive from your own address. Open the link and
   confirm it lands on the Pending tab.
8. **If it went to spam,** add a Gmail filter on the subject prefix and tick
   "Never send it to Spam". Expected to be unnecessary — the mail is genuinely
   from you — but check once.

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
