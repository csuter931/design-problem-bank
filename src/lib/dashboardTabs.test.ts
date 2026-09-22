import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialTab } from './dashboardTabs.ts'

test('no query string means the default tab', () => {
  assert.equal(initialTab('', true), 'available')
  assert.equal(initialTab('?', true), 'available')
})

test('a super user following the notification link lands on Pending', () => {
  assert.equal(initialTab('?tab=pending', true), 'pending')
})

test('a non-super-user cannot reach Pending through the URL', () => {
  // The tab does not exist for them, and the rules would reject its query.
  assert.equal(initialTab('?tab=pending', false), 'available')
})

test('the other tabs work for anyone', () => {
  assert.equal(initialTab('?tab=solved', false), 'solved')
  assert.equal(initialTab('?tab=mine', false), 'mine')
  assert.equal(initialTab('?tab=all', false), 'all')
})

test('an unknown tab falls back rather than rendering nothing', () => {
  assert.equal(initialTab('?tab=nonsense', true), 'available')
  assert.equal(initialTab('?tab=', true), 'available')
})

test('tab is found among other parameters and is case-insensitive', () => {
  assert.equal(initialTab('?utm_source=email&tab=pending', true), 'pending')
  assert.equal(initialTab('?tab=Pending', true), 'pending')
})
