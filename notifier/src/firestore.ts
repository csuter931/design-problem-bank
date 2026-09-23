// Firestore REST v1 access for the notifier. This module only ever reads
// (runQuery, and a GET of config/superusers) — there is no write function
// here, and that is what keeps the notifier read-only, not the OAuth scope.
// Firestore's REST API has no read-only scope (only `datastore` and
// `cloud-platform`, both write-capable), so appsscript.json necessarily
// grants write access that this file simply never calls. The guarantee is
// the absence of a write call here plus the test suite, not the API.
//
// The HTTP call is injected rather than imported so this module never names
// UrlFetchApp and can be unit-tested in plain Node. env.ts supplies the real
// implementation.

export type FirestoreValue = Record<string, unknown>

export interface FirestoreDoc {
  id: string
  [key: string]: unknown
}

export interface HttpResponse {
  status: number
  body: string
}

export type HttpFetcher = (
  url: string,
  init: { method: 'get' | 'post'; headers: Record<string, string>; payload?: string },
) => HttpResponse

const BASE = 'https://firestore.googleapis.com/v1/projects'

/**
 * `approved == false` with no orderBy, on purpose:
 *  - a single-field equality filter uses Firestore's automatic index, so
 *    firestore.indexes.json needs no change;
 *  - it returns only pending + rejected docs, keeping ~288 polls/day well
 *    inside the 50,000/day free read quota. An unfiltered poll would exceed
 *    that quota once the bank passed roughly 170 problems.
 * Sorting happens in the caller.
 */
export function buildPendingQueryBody(): string {
  return JSON.stringify({
    structuredQuery: {
      from: [{ collectionId: 'problems' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'approved' },
          op: 'EQUAL',
          value: { booleanValue: false },
        },
      },
    },
  })
}

export function decodeValue(v: FirestoreValue): unknown {
  if (typeof v.stringValue === 'string') return v.stringValue
  if (typeof v.booleanValue === 'boolean') return v.booleanValue
  // Firestore returns 64-bit integers as strings; createdAt, severity and
  // rejectedAt all arrive this way and must come back as numbers or
  // lib/moderation's `typeof rejectedAt === 'number'` check misfires.
  if (v.integerValue !== undefined) return Number(v.integerValue)
  if (v.doubleValue !== undefined) return Number(v.doubleValue)
  if (v.nullValue !== undefined) return null
  if (typeof v.timestampValue === 'string') return v.timestampValue
  if (v.arrayValue !== undefined) {
    const arr = v.arrayValue as { values?: FirestoreValue[] }
    return (arr.values ?? []).map(decodeValue)
  }
  if (v.mapValue !== undefined) {
    const map = v.mapValue as { fields?: Record<string, FirestoreValue> }
    return decodeFields(map.fields ?? {})
  }
  return undefined
}

export function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(fields)) out[key] = decodeValue(fields[key])
  return out
}

export function parseRunQueryResponse(body: string): FirestoreDoc[] {
  const rows = JSON.parse(body) as Array<{
    document?: { name: string; fields?: Record<string, FirestoreValue> }
  }>
  const docs: FirestoreDoc[] = []
  for (const row of rows) {
    // An empty result comes back as a single { readTime } row with no document.
    if (!row.document) continue
    const segments = row.document.name.split('/')
    docs.push({
      // Spread first so a stored field named `id` cannot shadow the real id.
      ...decodeFields(row.document.fields ?? {}),
      id: segments[segments.length - 1],
    })
  }
  return docs
}

/**
 * `config/superusers` is hand-edited (CLAUDE.md already documents a
 * capitalisation footgun there), and `MailApp.sendEmail` throws on a single
 * malformed recipient. Without sanitising here, one empty string or typo'd
 * entry would throw on every poll — silencing every super user, not just the
 * bad entry — so a malformed entry is dropped and logged instead of allowed
 * to take the whole list down with it.
 */
export function parseSuperuserEmails(body: string, log: (message: string) => void): string[] {
  const doc = JSON.parse(body) as { fields?: Record<string, FirestoreValue> }
  const emails = decodeFields(doc.fields ?? {}).emails
  if (!Array.isArray(emails)) return []
  const strings = emails.filter((e): e is string => typeof e === 'string')

  const valid: string[] = []
  const dropped: string[] = []
  for (const raw of strings) {
    const trimmed = raw.trim()
    if (trimmed.length > 0 && trimmed.includes('@')) valid.push(trimmed)
    else dropped.push(JSON.stringify(raw))
  }
  if (dropped.length > 0) {
    log(
      `Dropped ${dropped.length} malformed config/superusers ` +
      `${dropped.length === 1 ? 'entry' : 'entries'}: ${dropped.join(', ')}`,
    )
  }
  return valid
}

export function fetchUnapprovedProblems(
  fetcher: HttpFetcher,
  projectId: string,
  token: string,
): FirestoreDoc[] {
  const url = `${BASE}/${projectId}/databases/(default)/documents:runQuery`
  const res = fetcher(url, { method: 'post', headers: authHeaders(token), payload: buildPendingQueryBody() })
  // Throwing matters: returning [] on a 403 is indistinguishable from
  // "nothing to review", which is the one wrong answer this must never give.
  if (res.status !== 200) throw new Error(`Firestore runQuery failed: ${res.status} ${res.body}`)
  return parseRunQueryResponse(res.body)
}

export function fetchSuperuserEmails(
  fetcher: HttpFetcher,
  projectId: string,
  token: string,
  log: (message: string) => void,
): string[] {
  const url = `${BASE}/${projectId}/databases/(default)/documents/config/superusers`
  const res = fetcher(url, { method: 'get', headers: authHeaders(token) })
  if (res.status !== 200) throw new Error(`Firestore get config/superusers failed: ${res.status} ${res.body}`)
  return parseSuperuserEmails(res.body, log)
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}
