// Firestore REST v1 access for the notifier. Read-only by design — the script's
// OAuth scope is cloud-platform.read-only, so a write would fail at the API
// even if one were added here.
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

export function parseSuperuserEmails(body: string): string[] {
  const doc = JSON.parse(body) as { fields?: Record<string, FirestoreValue> }
  const emails = decodeFields(doc.fields ?? {}).emails
  if (!Array.isArray(emails)) return []
  return emails.filter((e): e is string => typeof e === 'string')
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
): string[] {
  const url = `${BASE}/${projectId}/databases/(default)/documents/config/superusers`
  const res = fetcher(url, { method: 'get', headers: authHeaders(token) })
  if (res.status !== 200) throw new Error(`Firestore get config/superusers failed: ${res.status} ${res.body}`)
  return parseSuperuserEmails(res.body)
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}
