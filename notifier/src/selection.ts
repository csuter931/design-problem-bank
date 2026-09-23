// Decides which pending problems the notifier has not yet emailed about.
//
// Deliberately NOT a timestamp watermark. `createdAt` is set by the submitter's
// browser (`Date.now()` in SubmitWizard), so a device with a slow clock would
// produce a document stamped behind the watermark and be skipped silently and
// permanently — exactly the failure this feature exists to prevent. Tracking
// ids has no clock dependency at all.
//
// The next stored set is just the current pending set: (stored ∩ pending) ∪
// (pending − stored) == pending. Pruning therefore happens for free — an id
// drops out the moment its problem is approved or rejected.

/**
 * PropertiesService caps one value at 9 KB. A 20-character document id costs
 * about 23 bytes inside a JSON array, so ~390 ids fit. 300 leaves headroom.
 *
 * Overflow does not settle. Above 300 pending problems, `nextStoredIds` keeps
 * only the newest 300, so the oldest ones are never recorded as notified —
 * every cycle re-detects them as "new" and re-emails them, every five
 * minutes, for as long as the queue stays over 300. With more than one
 * recipient that can exhaust MailApp's daily send quota and turn into
 * silence, which is the opposite of what this feature exists for. There is
 * no mitigation here beyond keeping the review queue under 300; treat a
 * queue that size as its own incident.
 */
export const MAX_STORED_IDS = 300

export interface Selection {
  newIds: string[]
  nextStoredIds: string[]
}

/**
 * @param pendingIds Ids of every problem currently awaiting review, oldest first.
 * @param storedIds  Ids already emailed about, or `null` on the very first run.
 */
export function selectNew(pendingIds: string[], storedIds: string[] | null): Selection {
  const pending = dedupe(pendingIds)
  const nextStoredIds = pending.slice(-MAX_STORED_IDS)

  // A first run seeds without sending, so a notifier switched on mid-year does
  // not email the entire back catalogue.
  if (storedIds === null) return { newIds: [], nextStoredIds }

  const seen = new Set(storedIds)
  return { newIds: pending.filter(id => !seen.has(id)), nextStoredIds }
}

function dedupe(ids: string[]): string[] {
  return Array.from(new Set(ids))
}
