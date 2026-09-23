// Builds the notification emails. Pure — no Apps Script globals, no network,
// no clock. Both a plain-text and an HTML body are produced because MailApp
// sends multipart and some clients will only render one of them.
//
// The submitter's contact address is deliberately absent: it is PII, it is
// already in the app, and inboxes keep it forever. There is a test guarding
// this; do not add the field.

import { SEVERITY_LABEL, CATEGORY_OPTIONS } from '../../src/lib/problemMeta.ts'

export interface NotifiableProblem {
  id: string
  title?: string
  description?: string
  submitterName?: string
  submitterRole?: string
  severity?: number
  categories?: string[]
}

export interface BuiltEmail {
  subject: string
  text: string
  html: string
}

const SNIPPET_CHARS = 160
const UNTITLED = 'Untitled problem'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Legacy tag values from older taxonomies have no option; show them as stored. */
function categoryLabel(value: string): string {
  const match = CATEGORY_OPTIONS.find(o => o.value === value)
  return match ? match.label : value
}

function titleOf(p: NotifiableProblem): string {
  const t = (p.title ?? '').trim()
  return t.length > 0 ? t : UNTITLED
}

function byline(p: NotifiableProblem): string {
  const name = (p.submitterName ?? '').trim()
  if (!name) return ''
  const role = (p.submitterRole ?? '').trim()
  return role ? `${name} (${role})` : name
}

function metaLine(p: NotifiableProblem): string {
  const bits: string[] = []
  const label = p.severity === undefined ? '' : (SEVERITY_LABEL[p.severity] ?? '')
  if (label) bits.push(`Severity: ${label}`)
  const cats = (p.categories ?? []).map(categoryLabel).filter(c => c.length > 0)
  if (cats.length > 0) bits.push(cats.join(', '))
  return bits.join(' · ')
}

function snippet(description: string | undefined): string {
  const d = (description ?? '').trim().replace(/\s+/g, ' ')
  if (d.length <= SNIPPET_CHARS) return d
  return d.slice(0, SNIPPET_CHARS).trimEnd() + '…'
}

function pendingTail(pendingCount: number): string {
  return pendingCount === 1
    ? '1 problem is now waiting for review.'
    : `${pendingCount} problems are now waiting for review.`
}

function textBlock(p: NotifiableProblem): string {
  const lines = [`  ${titleOf(p)}`]
  const from = byline(p)
  if (from) lines.push(`  From: ${from}`)
  const meta = metaLine(p)
  if (meta) lines.push(`  ${meta}`)
  const s = snippet(p.description)
  if (s) lines.push('', `  ${s}`)
  return lines.join('\n')
}

function htmlBlock(p: NotifiableProblem): string {
  const parts = [
    `<p style="margin:0 0 4px;font-size:16px;font-weight:600;">${escapeHtml(titleOf(p))}</p>`,
  ]
  const from = byline(p)
  if (from) parts.push(`<p style="margin:0;color:#555;font-size:13px;">From: ${escapeHtml(from)}</p>`)
  const meta = metaLine(p)
  if (meta) parts.push(`<p style="margin:0;color:#555;font-size:13px;">${escapeHtml(meta)}</p>`)
  const s = snippet(p.description)
  if (s) parts.push(`<p style="margin:8px 0 0;font-size:14px;">${escapeHtml(s)}</p>`)
  return `<div style="margin:0 0 20px;padding:0 0 0 12px;border-left:3px solid #7BB0D4;">${parts.join('')}</div>`
}

function wrapHtml(intro: string, blocks: string, dashboardUrl: string, tail: string): string {
  return [
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px;color:#111;">',
    `<p style="margin:0 0 20px;font-size:15px;">${escapeHtml(intro)}</p>`,
    blocks,
    `<p style="margin:0 0 20px;"><a href="${escapeHtml(dashboardUrl)}" style="background:#0033A0;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-size:14px;">Review in the dashboard</a></p>`,
    `<p style="margin:0;color:#555;font-size:13px;">${escapeHtml(tail)}</p>`,
    '</div>',
  ].join('')
}

export function buildDigest(
  problems: NotifiableProblem[],
  pendingCount: number,
  dashboardUrl: string,
): BuiltEmail {
  const n = problems.length
  const subject = n === 1
    ? `New problem submitted — ${titleOf(problems[0])}`
    : `${n} new problems submitted`
  const intro = n === 1
    ? 'A new problem is waiting for review.'
    : `${n} new problems are waiting for review.`
  const tail = pendingTail(pendingCount)

  const text = [
    intro,
    '',
    problems.map(textBlock).join('\n\n'),
    '',
    '  → Review it',
    `     ${dashboardUrl}`,
    '',
    tail,
  ].join('\n')

  return { subject, text, html: wrapHtml(intro, problems.map(htmlBlock).join(''), dashboardUrl, tail) }
}

export function buildHeartbeat(pendingCount: number, dashboardUrl: string): BuiltEmail {
  const healthy = pendingCount === 0
  const subject = healthy
    ? 'Problem Bank — nothing pending'
    : `Problem Bank — ${pendingCount} waiting for review`
  // This heartbeat firing proves the weekly trigger, OAuth, Firestore and
  // mail all work. It proves nothing about the 5-minute poll trigger — the
  // component most likely to be auto-disabled after repeated failures — so
  // the copy claims only what this run actually checked, not general health.
  const intro = healthy
    ? 'Nothing is waiting for review. The weekly check ran; Firestore and mail are reachable.'
    : pendingTail(pendingCount)

  const text = [intro, '', '  → Open the review queue', `     ${dashboardUrl}`, '', 'This is the weekly check-in. If it stops arriving, the notifier has stopped running.'].join('\n')

  return { subject, text, html: wrapHtml(intro, '', dashboardUrl, 'This is the weekly check-in. If it stops arriving, the notifier has stopped running.') }
}
