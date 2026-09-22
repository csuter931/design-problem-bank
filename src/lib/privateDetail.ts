// The private half of a problem: `problems/{id}/private/detail`.
//
// Why this exists: Firestore has no field-level read rules. The public
// gallery must be able to read an approved problem document, which makes
// EVERY field on it world-readable — so the submitter's contact and the
// team's internal notes cannot live there. They live in this separate
// document, which firestore.rules gates on isDawson().
//
// Reads therefore only work for a signed-in Dawson account; the gallery
// never subscribes. See the "Private detail" block in firestore.rules.
import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, arrayUnion, deleteField } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface Note { author: string; text: string; createdAt: number }

export interface PrivateDetail {
  submitterContact?: string
  internalNotes?: Note[]
}

export const privateDetailRef = (problemId: string) =>
  doc(db, 'problems', problemId, 'private', 'detail')

/**
 * Live view of one problem's private detail, or null while loading / when
 * not signed in. A missing document and a denied read both surface as `{}`
 * rather than an error: most problems have no notes, and the gallery
 * renders the same component without a user.
 */
export function usePrivateDetail(problemId: string | null, enabled: boolean): PrivateDetail | null {
  // The subscribed id is stored alongside the data rather than cleared in the
  // effect, so switching problems reads as "loading" without a setState during
  // render or effect setup — only the snapshot callbacks ever write state.
  const [state, setState] = useState<{ key: string; detail: PrivateDetail } | null>(null)

  useEffect(() => {
    if (!problemId || !enabled) return
    const key = problemId
    return onSnapshot(
      privateDetailRef(key),
      snap => setState({ key, detail: snap.exists() ? (snap.data() as PrivateDetail) : {} }),
      err => { console.error('private detail listener error:', err); setState({ key, detail: {} }) },
    )
  }, [problemId, enabled])

  if (!problemId || !enabled) return null
  return state?.key === problemId ? state.detail : null
}

/**
 * Append one team note. arrayUnion so a teammate's note written while this
 * modal was open is not silently dropped; merge:true so the first note on a
 * problem creates the document (the rules allow a Dawson create that carries
 * only internalNotes).
 */
export function appendNote(problemId: string, note: Note) {
  return setDoc(privateDetailRef(problemId), { internalNotes: arrayUnion(note) }, { merge: true })
}

/** Super-user contact correction; an empty string clears the field. */
export function saveSubmitterContact(problemId: string, contact: string) {
  const trimmed = contact.trim()
  return setDoc(
    privateDetailRef(problemId),
    { submitterContact: trimmed || deleteField() },
    { merge: true },
  )
}
