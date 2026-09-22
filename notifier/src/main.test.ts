import { test } from 'node:test'
import assert from 'node:assert/strict'
import { poll, heartbeat } from './main.ts'
import type { NotifierEnv } from './env.ts'
import type { BuiltEmail } from './email.ts'

const PROJECT = 'test-project'
const DASHBOARD = 'https://example.test/dashboard/?tab=pending'

interface Sent { recipients: string[]; email: BuiltEmail }

interface Harness {
  env: NotifierEnv
  sent: Sent[]
  writes: string[][]
  logs: string[]
}

/** @param docs Firestore documents as the REST parser would hand them over. */
function harness(docs: Array<Record<string, unknown>>, stored: string[] | null, emails = ['t@dawsonschool.org']): Harness {
  const sent: Sent[] = []
  const writes: string[][] = []
  const logs: string[] = []
  let current = stored
  const env: NotifierEnv = {
    projectId: PROJECT,
    dashboardUrl: DASHBOARD,
    fetchJson: (url) => {
      if (url.endsWith(':runQuery')) {
        return {
          status: 200,
          body: JSON.stringify(docs.map(d => ({
            document: {
              name: `projects/${PROJECT}/databases/(default)/documents/problems/${d.id}`,
              fields: toFields(d),
            },
          }))),
        }
      }
      return {
        status: 200,
        body: JSON.stringify({ fields: { emails: { arrayValue: { values: emails.map(e => ({ stringValue: e })) } } } }),
      }
    },
    getToken: () => 'TOKEN',
    readStoredIds: () => current,
    writeStoredIds: (ids) => { writes.push(ids); current = ids },
    sendEmail: (recipients, email) => { sent.push({ recipients, email }) },
    log: (m) => { logs.push(m) },
  }
  return { env, sent, writes, logs }
}

function toFields(d: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}
  for (const key of Object.keys(d)) {
    if (key === 'id') continue
    const v = d[key]
    if (typeof v === 'string') fields[key] = { stringValue: v }
    else if (typeof v === 'boolean') fields[key] = { booleanValue: v }
    else if (typeof v === 'number') fields[key] = { integerValue: String(v) }
    else if (Array.isArray(v) && v.every((item): item is string => typeof item === 'string')) {
      fields[key] = { arrayValue: { values: v.map(item => ({ stringValue: item })) } }
    }
    else {
      throw new Error(`toFields: unhandled value type for ${key}`)
    }
  }
  return fields
}

const pendingDoc = (id: string, title: string) => ({ id, title, approved: false })

test('the first run seeds without emailing', () => {
  const h = harness([pendingDoc('a', 'One')], null)
  poll(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [['a']])
})

test('a new pending problem produces exactly one email', () => {
  const h = harness([pendingDoc('a', 'One')], [])
  poll(h.env)
  assert.equal(h.sent.length, 1)
  assert.match(h.sent[0].email.subject, /One/)
  assert.deepEqual(h.sent[0].recipients, ['t@dawsonschool.org'])
  assert.deepEqual(h.writes, [['a']], 'stored ids must be written after a successful send')
})

test('several new problems collapse into one digest', () => {
  const h = harness([pendingDoc('a', 'One'), pendingDoc('b', 'Two'), pendingDoc('c', 'Three')], [])
  poll(h.env)
  assert.equal(h.sent.length, 1)
  assert.equal(h.sent[0].email.subject, '3 new problems submitted')
})

test('a second poll with nothing new sends nothing', () => {
  const h = harness([pendingDoc('a', 'One')], ['a'])
  poll(h.env)
  assert.equal(h.sent.length, 0)
})

test('rejected problems are not treated as pending', () => {
  const h = harness([{ id: 'r', title: 'Rejected', approved: false, rejectedAt: 1758499200000 }], [])
  poll(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [[]])
})

test('state is written only after a successful send', () => {
  const h = harness([pendingDoc('a', 'One')], [])
  h.env.sendEmail = () => { throw new Error('MailApp quota exceeded') }
  assert.throws(() => poll(h.env), /MailApp quota exceeded/)
  assert.deepEqual(h.writes, [], 'a failed send must leave state untouched so the next cycle retries')
})

test('no configured super users means no send and no state write', () => {
  const h = harness([pendingDoc('a', 'One')], [], [])
  poll(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [])
  assert.match(h.logs.join(' '), /super user/i)
})

test('the digest counts the whole pending queue, not just the new arrivals', () => {
  const h = harness([pendingDoc('a', 'Old'), pendingDoc('b', 'New')], ['a'])
  poll(h.env)
  assert.match(h.sent[0].email.text, /2 problems are now waiting for review/)
})

test('the heartbeat sends and never touches stored state', () => {
  const h = harness([pendingDoc('a', 'One')], ['a'])
  heartbeat(h.env)
  assert.equal(h.sent.length, 1)
  assert.match(h.sent[0].email.subject, /1 waiting/)
  assert.deepEqual(h.writes, [])
})

test('the heartbeat reports an empty queue as healthy', () => {
  const h = harness([], [])
  heartbeat(h.env)
  assert.match(h.sent[0].email.subject, /nothing pending/i)
})

test('the heartbeat with no configured super users sends nothing and writes nothing', () => {
  const h = harness([pendingDoc('a', 'One')], ['a'], [])
  heartbeat(h.env)
  assert.equal(h.sent.length, 0)
  assert.deepEqual(h.writes, [])
  assert.match(h.logs.join(' '), /super user/i)
})

test('a Firestore error propagates instead of looking like an empty queue', () => {
  const h = harness([], [])
  h.env.fetchJson = () => ({ status: 403, body: 'denied' })
  assert.throws(() => poll(h.env), /403/)
})

test('the digest lists pending problems oldest first regardless of arrival order', () => {
  const h = harness([
    { id: 'b', title: 'Middle', approved: false, createdAt: 2000 },
    { id: 'c', title: 'Newest', approved: false, createdAt: 3000 },
    { id: 'a', title: 'Oldest', approved: false, createdAt: 1000 },
  ], [])
  poll(h.env)
  const text = h.sent[0].email.text
  const oldestIndex = text.indexOf('Oldest')
  const middleIndex = text.indexOf('Middle')
  const newestIndex = text.indexOf('Newest')
  assert.ok(oldestIndex >= 0 && middleIndex >= 0 && newestIndex >= 0, 'all three titles must appear')
  assert.ok(oldestIndex < middleIndex, 'oldest problem must be listed before the middle one')
  assert.ok(middleIndex < newestIndex, 'middle problem must be listed before the newest one')
})

test('categories round-trip through the Firestore array encoding into the digest', () => {
  const h = harness([{ id: 'a', title: 'One', approved: false, categories: ['safety', 'technology'] }], [])
  poll(h.env)
  assert.match(h.sent[0].email.text, /Safety, Technology/)
})

test('submitterContact never reaches the sent email', () => {
  const h = harness([{
    id: 'a',
    title: 'One',
    approved: false,
    submitterContact: 'family@example.com',
  }], [])
  poll(h.env)
  assert.equal(h.sent.length, 1)
  assert.ok(!h.sent[0].email.text.includes('family@example.com'), 'text body must not contain submitterContact')
  assert.ok(!h.sent[0].email.html.includes('family@example.com'), 'html body must not contain submitterContact')
})
