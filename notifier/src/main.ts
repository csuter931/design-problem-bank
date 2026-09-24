// The two flows. No Apps Script globals, no I/O except through NotifierEnv,
// so every branch below is covered by main.test.ts.

import { partitionByReview } from '../../src/lib/moderation.ts'
import { buildDigest, buildHeartbeat, type NotifiableProblem } from './email.ts'
import type { NotifierEnv } from './env.ts'
import { fetchSuperuserEmails, fetchUnapprovedProblems, type FirestoreDoc } from './firestore.ts'
import { selectNew } from './selection.ts'

/** Runs every five minutes. */
export function poll(env: NotifierEnv): void {
  const token = env.getToken()
  const pending = readPending(env, token)
  const { newIds, nextStoredIds } = selectNew(pending.map(p => p.id), env.readStoredIds())

  if (newIds.length === 0) {
    // Safe to write with nothing sent: this both seeds a first run and prunes
    // ids whose problems have since been approved or rejected.
    env.writeStoredIds(nextStoredIds)
    return
  }

  const recipients = fetchSuperuserEmails(env.fetchJson, env.projectId, token, env.log)
  if (recipients.length === 0) {
    // Deliberately no state write — once a super user is configured, the next
    // cycle will still report these as new.
    env.log('No super user emails configured; nothing sent.')
    return
  }

  const fresh = new Set(newIds)
  const arrivals = pending.filter(p => fresh.has(p.id))
  env.sendEmail(recipients, buildDigest(arrivals, pending.length, env.dashboardUrl))

  // Logged on the happy path, not just the failure paths. Without this the
  // execution history cannot distinguish "sent successfully" from a branch
  // that returned early, which cost a diagnostic round-trip the first time
  // mail went missing — the addresses are the whole question when it does.
  env.log(`Emailed ${arrivals.length} new problem(s) to ${recipients.length} recipient(s): ${recipients.join(', ')}`)

  // Last, and only on success. A throw above leaves state untouched so the
  // next cycle retries: at-least-once, because a duplicate email is an
  // annoyance and a missed one defeats the feature.
  env.writeStoredIds(nextStoredIds)
}

/** Runs Monday mornings. Read-only with respect to stored state. */
export function heartbeat(env: NotifierEnv): void {
  const token = env.getToken()
  const pending = readPending(env, token)
  const recipients = fetchSuperuserEmails(env.fetchJson, env.projectId, token, env.log)
  if (recipients.length === 0) {
    env.log('No super user emails configured; heartbeat not sent.')
    return
  }
  env.sendEmail(recipients, buildHeartbeat(pending.length, env.dashboardUrl))
  env.log(`Heartbeat: ${pending.length} pending, sent to ${recipients.length} recipient(s): ${recipients.join(', ')}`)
}

/** Pending problems, oldest first, as the email builders want them. */
function readPending(env: NotifierEnv, token: string): PendingProblem[] {
  const docs = fetchUnapprovedProblems(env.fetchJson, env.projectId, token)
  const reviewable = docs.map(d => ({
    doc: d,
    approved: boolOr(d.approved),
    rejectedAt: numberOrUndefined(d.rejectedAt),
  }))
  return partitionByReview(reviewable)
    .pending
    .map(r => toPending(r.doc))
    .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
}

interface PendingProblem extends NotifiableProblem {
  createdAt?: number
}

/**
 * An explicit allowlist, not a cast. Only these fields can ever reach an email
 * body, which is what makes "submitterContact is never emailed" a structural
 * guarantee rather than something a test has to keep catching.
 */
function toPending(d: FirestoreDoc): PendingProblem {
  return {
    id: d.id,
    title: stringOrUndefined(d.title),
    description: stringOrUndefined(d.description),
    submitterName: stringOrUndefined(d.submitterName),
    submitterRole: stringOrUndefined(d.submitterRole),
    severity: numberOrUndefined(d.severity),
    categories: Array.isArray(d.categories)
      ? d.categories.filter((c): c is string => typeof c === 'string')
      : undefined,
    createdAt: numberOrUndefined(d.createdAt),
  }
}

function stringOrUndefined(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' ? v : undefined
}

function boolOr(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined
}
