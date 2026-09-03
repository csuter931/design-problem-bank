import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isApproved, isPendingReview, isRejected, partitionByReview } from './moderation.ts'

test('approved:true is approved and nothing else', () => {
  const p = { approved: true }
  assert.equal(isApproved(p), true)
  assert.equal(isPendingReview(p), false)
  assert.equal(isRejected(p), false)
})

test('a stale rejectedAt does not override approved:true', () => {
  const p = { approved: true, rejectedAt: 123 }
  assert.equal(isApproved(p), true)
  assert.equal(isRejected(p), false)
})

test('approved:false with no rejectedAt is pending', () => {
  const p = { approved: false }
  assert.equal(isPendingReview(p), true)
  assert.equal(isRejected(p), false)
})

test('a doc missing the field entirely fails safe as pending, not approved', () => {
  const p = {}
  assert.equal(isApproved(p), false)
  assert.equal(isPendingReview(p), true)
  assert.equal(isRejected(p), false)
})

test('approved:false with rejectedAt is rejected, not pending', () => {
  const p = { approved: false, rejectedAt: 123 }
  assert.equal(isRejected(p), true)
  assert.equal(isPendingReview(p), false)
})

test('partitionByReview buckets and preserves order', () => {
  const items = [
    { id: 'a', approved: true },
    { id: 'b' },
    { id: 'c', approved: false, rejectedAt: 1 },
    { id: 'd', approved: false },
    { id: 'e', approved: true },
  ]
  const { approved, pending, rejected } = partitionByReview(items)
  assert.deepEqual(approved.map(p => p.id), ['a', 'e'])
  assert.deepEqual(pending.map(p => p.id), ['b', 'd'])
  assert.deepEqual(rejected.map(p => p.id), ['c'])
})
