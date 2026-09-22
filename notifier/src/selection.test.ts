import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectNew, MAX_STORED_IDS } from './selection.ts'

test('first run seeds silently — nothing is new, everything is remembered', () => {
  const { newIds, nextStoredIds } = selectNew(['a', 'b'], null)
  assert.deepEqual(newIds, [])
  assert.deepEqual(nextStoredIds, ['a', 'b'])
})

test('an id not seen before is new', () => {
  const { newIds } = selectNew(['a', 'b', 'c'], ['a'])
  assert.deepEqual(newIds, ['b', 'c'])
})

test('nothing is new when every pending id is already stored', () => {
  const { newIds } = selectNew(['a', 'b'], ['a', 'b'])
  assert.deepEqual(newIds, [])
})

test('stored ids that are no longer pending are pruned', () => {
  // 'a' was approved between cycles, so it drops out of both sets.
  const { nextStoredIds } = selectNew(['b'], ['a', 'b'])
  assert.deepEqual(nextStoredIds, ['b'])
})

test('next stored set is exactly the current pending set', () => {
  const { nextStoredIds } = selectNew(['b', 'c'], ['a', 'b'])
  assert.deepEqual(nextStoredIds, ['b', 'c'])
})

test('an empty pending queue clears the stored set', () => {
  const { newIds, nextStoredIds } = selectNew([], ['a', 'b'])
  assert.deepEqual(newIds, [])
  assert.deepEqual(nextStoredIds, [])
})

test('an empty stored array is not treated as a first run', () => {
  // [] means "seeded, nothing pending last time"; null means "never run".
  const { newIds } = selectNew(['a'], [])
  assert.deepEqual(newIds, ['a'])
})

test('duplicate pending ids are collapsed', () => {
  const { newIds, nextStoredIds } = selectNew(['a', 'a'], [])
  assert.deepEqual(newIds, ['a'])
  assert.deepEqual(nextStoredIds, ['a'])
})

test('the stored set is capped, keeping the newest ids', () => {
  const pending = Array.from({ length: MAX_STORED_IDS + 5 }, (_, i) => `id${i}`)
  const { nextStoredIds } = selectNew(pending, [])
  assert.equal(nextStoredIds.length, MAX_STORED_IDS)
  // Pending arrives oldest-first, so the tail is what we keep.
  assert.equal(nextStoredIds[nextStoredIds.length - 1], `id${MAX_STORED_IDS + 4}`)
})
