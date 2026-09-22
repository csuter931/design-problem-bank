import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseStoredIds } from './env.ts'

/** Collects log messages instead of stubbing `console`. */
function collector(): { log: (message: string) => void; messages: string[] } {
  const messages: string[] = []
  return { log: (message) => { messages.push(message) }, messages }
}

test('null means never run: passes through with no log', () => {
  const { log, messages } = collector()
  assert.equal(parseStoredIds(null, log), null)
  assert.deepEqual(messages, [])
})

test('a valid JSON array of strings comes back unchanged', () => {
  const { log, messages } = collector()
  assert.deepEqual(parseStoredIds('["a","b","c"]', log), ['a', 'b', 'c'])
  assert.deepEqual(messages, [])
})

test('non-string entries in an otherwise valid array are filtered out', () => {
  const { log, messages } = collector()
  assert.deepEqual(parseStoredIds('["a",1,null,"b"]', log), ['a', 'b'])
  assert.deepEqual(messages, [])
})

test('valid JSON that is not an array comes back as empty, not corrupt', () => {
  const { log, messages } = collector()
  assert.deepEqual(parseStoredIds('{}', log), [])
  assert.deepEqual(messages, [])
})

test('unparseable JSON re-seeds and logs a loud, specific warning', () => {
  const { log, messages } = collector()
  assert.equal(parseStoredIds('{not json', log), null)
  assert.equal(messages.length, 1)
  // The message must name the actual consequence, not just "error parsing".
  assert.match(messages[0], /re-seed/i)
  assert.match(messages[0], /already notified/i)
})
