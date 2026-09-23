import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDigest, buildHeartbeat, escapeHtml, type NotifiableProblem } from './email.ts'

const DASHBOARD = 'https://csuter931.github.io/design-problem-bank/dashboard/?tab=pending'

const one: NotifiableProblem = {
  id: 'abc123',
  title: 'Cafeteria line backs up at 11:40',
  description: 'The single serving line means the last 40 students get under ten minutes to eat.',
  submitterName: 'Jamie Rivera',
  submitterRole: 'Student',
  severity: 4,
  categories: ['workspace', 'safety'],
}

test('a single problem names itself in the subject', () => {
  const { subject } = buildDigest([one], 2, DASHBOARD)
  assert.equal(subject, 'New problem submitted — Cafeteria line backs up at 11:40')
})

test('several problems are counted in the subject', () => {
  const { subject } = buildDigest([one, { id: 'b', title: 'Second' }, { id: 'c', title: 'Third' }], 3, DASHBOARD)
  assert.equal(subject, '3 new problems submitted')
})

test('the text body carries title, byline, severity, categories and the link', () => {
  const { text } = buildDigest([one], 2, DASHBOARD)
  assert.match(text, /Cafeteria line backs up at 11:40/)
  assert.match(text, /From: Jamie Rivera \(Student\)/)
  assert.match(text, /Severity: Serious/)
  assert.match(text, /Workspace, Safety/)
  assert.ok(text.includes(DASHBOARD))
  assert.match(text, /2 problems are now waiting for review\./)
})

test('the pending tail is singular for one', () => {
  const { text } = buildDigest([one], 1, DASHBOARD)
  assert.match(text, /1 problem is now waiting for review\./)
})

test('the submitter contact is never included', () => {
  const withContact = { ...one, submitterContact: 'jrivera@dawsonstudents.org' } as NotifiableProblem
  const { text, html } = buildDigest([withContact], 1, DASHBOARD)
  assert.ok(!text.includes('jrivera@dawsonstudents.org'))
  assert.ok(!html.includes('jrivera@dawsonstudents.org'))
})

test('a hostile title cannot inject markup into the HTML body', () => {
  const nasty: NotifiableProblem = { id: 'x', title: '<script>alert(1)</script>' }
  const { html } = buildDigest([nasty], 1, DASHBOARD)
  assert.ok(!html.includes('<script>'))
  assert.match(html, /&lt;script&gt;/)
})

test('the plain-text body is not escaped', () => {
  const { text } = buildDigest([{ id: 'x', title: 'Doors & windows' }], 1, DASHBOARD)
  assert.match(text, /Doors & windows/)
})

test('missing optional fields degrade rather than printing undefined', () => {
  const bare: NotifiableProblem = { id: 'x', title: 'Bare' }
  const { text, html } = buildDigest([bare], 1, DASHBOARD)
  assert.ok(!text.includes('undefined'))
  assert.ok(!html.includes('undefined'))
  assert.ok(!text.includes('From:'))
})

test('a problem with no title is labelled rather than left blank', () => {
  const { subject } = buildDigest([{ id: 'x' }], 1, DASHBOARD)
  assert.equal(subject, 'New problem submitted — Untitled problem')
})

test('a long description is truncated with an ellipsis', () => {
  const long = { id: 'x', title: 'T', description: 'w'.repeat(400) }
  const { text } = buildDigest([long], 1, DASHBOARD)
  assert.ok(text.includes('…'))
  assert.ok(!text.includes('w'.repeat(200)))
})

test('an unknown category value renders as stored rather than vanishing', () => {
  const legacy: NotifiableProblem = { id: 'x', title: 'T', categories: ['space-and-facilities'] }
  const { text } = buildDigest([legacy], 1, DASHBOARD)
  assert.match(text, /space-and-facilities/)
})

test('an out-of-range severity is dropped rather than printing a blank label', () => {
  const { text } = buildDigest([{ id: 'x', title: 'T', severity: 99 }], 1, DASHBOARD)
  assert.ok(!text.includes('Severity:'))
})

test('the heartbeat reports an empty queue without overclaiming general health', () => {
  const { subject, text } = buildHeartbeat(0, DASHBOARD)
  assert.match(subject, /nothing pending/i)
  assert.match(text, /weekly check ran/i)
  assert.match(text, /firestore and mail are reachable/i)
})

test('the heartbeat reports a non-empty queue with the count', () => {
  const { subject, text } = buildHeartbeat(3, DASHBOARD)
  assert.match(subject, /3/)
  assert.ok(text.includes(DASHBOARD))
})

test('escapeHtml covers the five dangerous characters', () => {
  assert.equal(escapeHtml(`<&>"'`), '&lt;&amp;&gt;&quot;&#39;')
})
