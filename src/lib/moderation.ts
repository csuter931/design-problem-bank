// Review-state helpers. A problem is publicly visible only when a teacher has
// set `approved: true` — enforced server-side in firestore.rules; these helpers
// keep the client's reading of the field consistent everywhere.
//
// `isPendingReview` uses `!== true` rather than `=== false` on purpose: a doc
// missing the field (created by a stale client, or never backfilled) reads as
// pending, so it surfaces to a teacher instead of being orphaned silently.

export interface ReviewFields {
  approved?: boolean
  rejectedAt?: number
}

export function isApproved(p: ReviewFields): boolean {
  return p.approved === true
}

export function isRejected(p: ReviewFields): boolean {
  return p.approved !== true && typeof p.rejectedAt === 'number'
}

export function isPendingReview(p: ReviewFields): boolean {
  return p.approved !== true && !isRejected(p)
}

/** Split a list into the three review buckets, preserving order within each. */
export function partitionByReview<T extends ReviewFields>(items: T[]): {
  approved: T[]; pending: T[]; rejected: T[]
} {
  const approved: T[] = [], pending: T[] = [], rejected: T[] = []
  for (const p of items) {
    if (isApproved(p)) approved.push(p)
    else if (isRejected(p)) rejected.push(p)
    else pending.push(p)
  }
  return { approved, pending, rejected }
}
