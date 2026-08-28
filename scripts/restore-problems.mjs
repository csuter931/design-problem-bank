// Restore problems from a backup file produced by scripts/backup-problems.mjs.
// Run with: node scripts/restore-problems.mjs backups/problems-<timestamp>.json [id ...]
//
// Pass one or more document ids after the file to restore just those problems;
// with no ids, every problem in the backup is restored.
//
// Original document ids are preserved. Restoring an id that already exists fails
// for that problem and leaves the existing doc untouched.

import { readFileSync } from 'node:fs'

const PROJECT_ID = 'dawson-problem-bank-24a9c'
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const [file, ...onlyIds] = process.argv.slice(2)
if (!file) {
  console.error('Usage: node scripts/restore-problems.mjs <backup.json> [id ...]')
  process.exit(1)
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } }
  if (typeof val === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v)
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

const backup = JSON.parse(readFileSync(file, 'utf8'))
const wanted = onlyIds.length ? backup.filter((p) => onlyIds.includes(p.__id)) : backup

if (onlyIds.length) {
  const missing = onlyIds.filter((id) => !backup.some((p) => p.__id === id))
  if (missing.length) console.warn(`! Not in backup, skipping: ${missing.join(', ')}`)
}

console.log(`Restoring ${wanted.length} problem(s) from ${file}...\n`)

let ok = 0
for (const problem of wanted) {
  const { __id, ...data } = problem
  const fields = {}
  for (const [k, v] of Object.entries(data)) fields[k] = toFirestoreValue(v)

  const res = await fetch(`${BASE_URL}/problems?documentId=${encodeURIComponent(__id)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  const body = await res.json()
  if (res.ok) {
    ok++
    console.log(`✓ ${__id}  ${problem.title || '(untitled)'}`)
  } else {
    console.error(`✗ ${__id}  ${body.error?.message || JSON.stringify(body)}`)
  }
}

console.log(`\nDone. ${ok}/${wanted.length} restored.`)
