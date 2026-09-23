import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildPendingQueryBody, decodeValue, parseRunQueryResponse, parseSuperuserEmails,
  fetchUnapprovedProblems, fetchSuperuserEmails, type HttpFetcher,
} from './firestore.ts'

const PROJECT = 'dawson-problem-bank-24a9c'

interface Call { url: string; method: string; payload?: string; headers?: Record<string, string> }

function fakeFetcher(status: number, body: string, calls: Call[] = []): HttpFetcher {
  return (url, init) => {
    calls.push({ url, method: init.method, payload: init.payload, headers: init.headers })
    return { status, body }
  }
}

/** Collects log messages instead of stubbing `console`, matching env.test.ts. */
function collector(): { log: (message: string) => void; messages: string[] } {
  const messages: string[] = []
  return { log: (message) => { messages.push(message) }, messages }
}

test('the query filters on approved == false and does not order', () => {
  const q = JSON.parse(buildPendingQueryBody())
  assert.deepEqual(q.structuredQuery.from, [{ collectionId: 'problems' }])
  assert.deepEqual(q.structuredQuery.where.fieldFilter, {
    field: { fieldPath: 'approved' },
    op: 'EQUAL',
    value: { booleanValue: false },
  })
  // An orderBy would demand a composite index; sorting happens in the script.
  assert.equal(q.structuredQuery.orderBy, undefined)
})

test('integerValue is decoded to a number, not the string Firestore sends', () => {
  assert.equal(decodeValue({ integerValue: '1758499200000' }), 1758499200000)
  assert.equal(typeof decodeValue({ integerValue: '4' }), 'number')
})

test('each scalar value type decodes', () => {
  assert.equal(decodeValue({ stringValue: 'hi' }), 'hi')
  assert.equal(decodeValue({ booleanValue: false }), false)
  assert.equal(decodeValue({ doubleValue: 1.5 }), 1.5)
  assert.equal(decodeValue({ nullValue: null }), null)
})

test('arrays and maps decode recursively', () => {
  assert.deepEqual(
    decodeValue({ arrayValue: { values: [{ stringValue: 'a' }, { integerValue: '2' }] } }),
    ['a', 2],
  )
  assert.deepEqual(decodeValue({ arrayValue: {} }), [])
  assert.deepEqual(
    decodeValue({ mapValue: { fields: { k: { stringValue: 'v' } } } }),
    { k: 'v' },
  )
})

test('runQuery rows become plain objects carrying the document id', () => {
  const body = JSON.stringify([
    {
      document: {
        name: `projects/${PROJECT}/databases/(default)/documents/problems/DOC1`,
        fields: {
          title: { stringValue: 'Leaky tap' },
          approved: { booleanValue: false },
          severity: { integerValue: '3' },
          createdAt: { integerValue: '1758499200000' },
          categories: { arrayValue: { values: [{ stringValue: 'safety' }] } },
        },
      },
    },
  ])
  const docs = parseRunQueryResponse(body)
  assert.equal(docs.length, 1)
  assert.equal(docs[0].id, 'DOC1')
  assert.equal(docs[0].title, 'Leaky tap')
  assert.equal(docs[0].approved, false)
  assert.equal(docs[0].severity, 3)
  assert.deepEqual(docs[0].categories, ['safety'])
})

test('rejectedAt decodes as a number so isRejected recognises it', () => {
  const body = JSON.stringify([{
    document: {
      name: `projects/${PROJECT}/databases/(default)/documents/problems/D`,
      fields: { approved: { booleanValue: false }, rejectedAt: { integerValue: '1758499200000' } },
    },
  }])
  assert.equal(typeof parseRunQueryResponse(body)[0].rejectedAt, 'number')
})

test('an empty result set returns no documents', () => {
  // Firestore answers an empty runQuery with a single readTime-only row.
  assert.deepEqual(parseRunQueryResponse(JSON.stringify([{ readTime: '2026-09-22T00:00:00Z' }])), [])
})

test('a field literally named id cannot shadow the document id', () => {
  const body = JSON.stringify([{
    document: {
      name: `projects/${PROJECT}/databases/(default)/documents/problems/REAL`,
      fields: { id: { stringValue: 'SPOOFED' } },
    },
  }])
  assert.equal(parseRunQueryResponse(body)[0].id, 'REAL')
})

test('a document with no fields still yields its id', () => {
  const body = JSON.stringify([{
    document: { name: `projects/${PROJECT}/databases/(default)/documents/problems/EMPTY` },
  }])
  assert.equal(parseRunQueryResponse(body)[0].id, 'EMPTY')
})

test('superuser emails are extracted from the config document', () => {
  const body = JSON.stringify({
    name: `projects/${PROJECT}/databases/(default)/documents/config/superusers`,
    fields: { emails: { arrayValue: { values: [{ stringValue: 'a@dawsonschool.org' }, { stringValue: 'b@dawsonschool.org' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body, collector().log), ['a@dawsonschool.org', 'b@dawsonschool.org'])
})

test('a config document with no emails field yields an empty list', () => {
  assert.deepEqual(parseSuperuserEmails(JSON.stringify({ fields: {} }), collector().log), [])
  assert.deepEqual(parseSuperuserEmails(JSON.stringify({}), collector().log), [])
})

test('non-string entries in the emails array are discarded', () => {
  const body = JSON.stringify({
    fields: { emails: { arrayValue: { values: [{ stringValue: 'a@dawsonschool.org' }, { integerValue: '7' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body, collector().log), ['a@dawsonschool.org'])
})

test('an empty string entry is dropped and logged, valid entries survive', () => {
  const { log, messages } = collector()
  const body = JSON.stringify({
    fields: { emails: { arrayValue: { values: [{ stringValue: 'a@dawsonschool.org' }, { stringValue: '' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body, log), ['a@dawsonschool.org'])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /dropped/i)
})

test('a whitespace-only entry is dropped and logged, valid entries survive', () => {
  const { log, messages } = collector()
  const body = JSON.stringify({
    fields: { emails: { arrayValue: { values: [{ stringValue: '   ' }, { stringValue: 'a@dawsonschool.org' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body, log), ['a@dawsonschool.org'])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /dropped/i)
})

test('an entry with no @ is dropped and logged, valid entries survive', () => {
  const { log, messages } = collector()
  const body = JSON.stringify({
    fields: { emails: { arrayValue: { values: [{ stringValue: 'not-an-email' }, { stringValue: 'a@dawsonschool.org' }] } } },
  })
  assert.deepEqual(parseSuperuserEmails(body, log), ['a@dawsonschool.org'])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /dropped/i)
})

test('valid entries are trimmed and survive alongside several malformed ones', () => {
  const { log, messages } = collector()
  const body = JSON.stringify({
    fields: {
      emails: {
        arrayValue: {
          values: [
            { stringValue: '  a@dawsonschool.org  ' },
            { stringValue: '' },
            { stringValue: '   ' },
            { stringValue: 'not-an-email' },
            { stringValue: 'b@dawsonschool.org' },
          ],
        },
      },
    },
  })
  assert.deepEqual(parseSuperuserEmails(body, log), ['a@dawsonschool.org', 'b@dawsonschool.org'])
  assert.equal(messages.length, 1)
  assert.match(messages[0], /dropped 3/i)
})

test('fetchUnapprovedProblems posts to runQuery with a bearer token', () => {
  const calls: Call[] = []
  fetchUnapprovedProblems(fakeFetcher(200, '[]', calls), PROJECT, 'TOKEN123')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].method, 'post')
  assert.ok(calls[0].url.endsWith(`/projects/${PROJECT}/databases/(default)/documents:runQuery`))
  assert.ok(calls[0].payload?.includes('"approved"'))
  assert.equal(calls[0].headers?.Authorization, 'Bearer TOKEN123')
})

test('fetchSuperuserEmails gets the config document with a bearer token', () => {
  const calls: Call[] = []
  fetchSuperuserEmails(fakeFetcher(200, JSON.stringify({ fields: {} }), calls), PROJECT, 'TOKEN123', collector().log)
  assert.equal(calls[0].method, 'get')
  assert.ok(calls[0].url.endsWith('/documents/config/superusers'))
  assert.equal(calls[0].headers?.Authorization, 'Bearer TOKEN123')
})

test('a non-200 throws rather than returning silently empty', () => {
  // Returning [] on a 403 would look exactly like "nothing to review", which
  // is the one wrong answer this feature must never give.
  assert.throws(
    () => fetchUnapprovedProblems(fakeFetcher(403, '{"error":"denied"}'), PROJECT, 'T'),
    /403/,
  )
  assert.throws(
    () => fetchSuperuserEmails(fakeFetcher(500, 'boom'), PROJECT, 'T', collector().log),
    /500/,
  )
})
