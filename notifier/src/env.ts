// The seam between the notifier's logic and Google Apps Script.
//
// THIS IS THE ONLY FILE PERMITTED TO NAME AN APPS SCRIPT GLOBAL. Everything
// else takes NotifierEnv as a parameter, which is what keeps the rest of the
// project unit-testable in plain Node — and what would make a move off Apps
// Script cost roughly this file and nothing else.
//
// It is also the only place a Firestore write could be added — fetchJson is
// the sole path to UrlFetchApp. The manifest's `datastore` scope would allow
// one (Firestore has no read-only scope, so this file's write capability is
// unused, not unavailable); nothing here makes the call. That absence, plus
// the test suite, is what keeps this notifier read-only — not the OAuth
// scope.

import type { BuiltEmail } from './email.ts'
import type { HttpFetcher } from './firestore.ts'

export const PROJECT_ID = 'dawson-problem-bank-24a9c'
export const DASHBOARD_URL = 'https://csuter931.github.io/design-problem-bank/dashboard/?tab=pending'

/** Key in the script's property store holding the already-notified id set. */
export const STORED_IDS_KEY = 'notifiedProblemIds'

/** Display name on the From line; the address itself is the script owner's. */
export const SENDER_NAME = 'Dawson Problem Bank'

export interface NotifierEnv {
  projectId: string
  dashboardUrl: string
  fetchJson: HttpFetcher
  getToken(): string
  readStoredIds(): string[] | null
  writeStoredIds(ids: string[]): void
  sendEmail(recipients: string[], email: BuiltEmail): void
  log(message: string): void
}

/**
 * Parses the raw `notifiedProblemIds` property into an id list.
 *
 * `null` in means "never run" and passes straight through so the caller seeds
 * without emailing; do not conflate it with an empty array, which means "ran,
 * queue was empty". An absent property reads as `null`, not `'{}'` — valid
 * JSON that isn't an array (e.g. `'{}'`) is corruption too, just a different
 * shape of it. It comes back as `[]`, which fails in the safe, loud
 * direction, but it is the *opposite* branch from unparseable input below:
 * an empty array makes `selectNew` treat the whole pending queue as new, so
 * every currently-pending problem gets re-notified on the next cycle instead
 * of silently missing one. Still logged, so the mass re-notification has a
 * paper trail instead of looking like a sudden flood of new submissions.
 *
 * Unparseable JSON re-seeds — crashing every five minutes would be worse —
 * but a re-seed makes `selectNew` treat every currently-pending problem as
 * already notified, so nothing gets emailed for this cycle. That is exactly
 * the missed-notification failure this feature exists to prevent, so it is
 * logged loudly rather than swallowed.
 */
export function parseStoredIds(raw: string | null, log: (message: string) => void): string[] | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
    log(
      `Corrupt ${STORED_IDS_KEY} property (valid JSON, but not an array); treating the pending queue ` +
      'as empty. Every currently pending problem will look new and be re-notified on the next cycle.',
    )
    return []
  } catch {
    log(
      `Corrupt ${STORED_IDS_KEY} property (not valid JSON); re-seeding. Every problem currently ` +
      'awaiting review will be marked as already notified and no email will be sent for this cycle.',
    )
    return null
  }
}

export function appsScriptEnv(): NotifierEnv {
  const props = PropertiesService.getScriptProperties()
  const log = (message: string): void => { console.log(message) }

  return {
    projectId: PROJECT_ID,
    dashboardUrl: DASHBOARD_URL,

    fetchJson: (url, init) => {
      const res = UrlFetchApp.fetch(url, {
        method: init.method,
        headers: init.headers,
        payload: init.payload,
        contentType: 'application/json',
        muteHttpExceptions: true,
      })
      return { status: res.getResponseCode(), body: res.getContentText() }
    },

    // The owner's own short-lived token. No service-account key exists.
    getToken: () => ScriptApp.getOAuthToken(),

    readStoredIds: () => parseStoredIds(props.getProperty(STORED_IDS_KEY), log),

    writeStoredIds: (ids) => { props.setProperty(STORED_IDS_KEY, JSON.stringify(ids)) },

    sendEmail: (recipients, email) => {
      // Recipients share a To line deliberately: super users are a handful of
      // teachers and seeing who else was told is useful, not a leak.
      MailApp.sendEmail({
        to: recipients.join(','),
        subject: email.subject,
        body: email.text,
        htmlBody: email.html,
        name: SENDER_NAME,
      })
    },

    log,
  }
}
