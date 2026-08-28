// Read-only backup of the `problems` collection.
// Run with: node scripts/backup-problems.mjs [outfile]
//
// Writes a JSON array of every problem doc (including its Firestore id as `__id`)
// to backups/problems-<timestamp>.json by default.
//
// The output contains submitter contact emails — backups/ is gitignored, keep it that way.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const PROJECT_ID = 'dawson-problem-bank-24a9c'
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

function fromFirestoreValue(v) {
  if (v == null || 'nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('stringValue' in v) return v.stringValue
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue)
  if ('mapValue' in v) {
    const out = {}
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) out[k] = fromFirestoreValue(val)
    return out
  }
  return v
}

function fromFirestoreDoc(doc) {
  const out = { __id: doc.name.split('/').pop() }
  for (const [k, v] of Object.entries(doc.fields || {})) out[k] = fromFirestoreValue(v)
  return out
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const outfile = process.argv[2] || `backups/problems-${stamp}.json`

const all = []
let pageToken = ''
do {
  const url = `${BASE_URL}/problems?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) {
    console.error(`✗ Failed to read problems: ${data.error?.message || JSON.stringify(data)}`)
    process.exit(1)
  }
  for (const d of data.documents || []) all.push(fromFirestoreDoc(d))
  pageToken = data.nextPageToken || ''
} while (pageToken)

mkdirSync(dirname(outfile), { recursive: true })
writeFileSync(outfile, JSON.stringify(all, null, 2))

console.log(`✓ Backed up ${all.length} problem(s) → ${outfile}`)
for (const p of all) console.log(`   ${p.__id}  ${p.title || '(untitled)'}`)
