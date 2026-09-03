// One-time backfill: add the `approved` field to every problem doc that lacks it.
//
//   node scripts/backfill-approved.mjs                 # dry run — lists what would change
//   node scripts/backfill-approved.mjs --apply         # write approved:false (enters review queue)
//   node scripts/backfill-approved.mjs --apply --approve-all   # write approved:true instead
//
// Idempotent and safe to re-run: docs that ALREADY have the field are never
// touched, so re-running after teachers have approved some problems cannot
// undo their decisions. Each write is a surgical PATCH with an updateMask.
//
// ⚠ Writes over unauthenticated REST, which only works under the CURRENT
// (permissive) rules. This MUST run before `firebase deploy --only firestore:rules`.
// Exits non-zero if the verification pass finds any doc still missing the field.

const PROJECT_ID = 'dawson-problem-bank-24a9c'
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const args = new Set(process.argv.slice(2))
const apply = args.has('--apply')
const value = args.has('--approve-all')
for (const a of args) {
  if (!['--apply', '--approve-all', '--dry-run'].includes(a)) {
    console.error(`Unknown flag ${a}. Usage: node scripts/backfill-approved.mjs [--apply] [--approve-all]`)
    process.exit(2)
  }
}

async function listAll() {
  const all = []
  let pageToken = ''
  do {
    const url = `${BASE_URL}/problems?pageSize=300&mask.fieldPaths=approved&mask.fieldPaths=title${pageToken ? `&pageToken=${pageToken}` : ''}`
    const res = await fetch(url)
    const data = await res.json()
    if (!res.ok) {
      console.error(`✗ Failed to list problems: ${data.error?.message || JSON.stringify(data)}`)
      process.exit(1)
    }
    for (const d of data.documents || []) {
      all.push({
        id: d.name.split('/').pop(),
        title: d.fields?.title?.stringValue ?? '(untitled)',
        hasApproved: d.fields?.approved !== undefined,
      })
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)
  return all
}

const docs = await listAll()
const missing = docs.filter(d => !d.hasApproved)
console.log(`${docs.length} problem(s) total, ${missing.length} missing the approved field.`)
console.log(`Mode: ${apply ? 'APPLY' : 'dry run'} — would set approved: ${value}\n`)
for (const d of missing) console.log(`   ${d.id}  ${d.title}`)

if (!apply) {
  console.log('\nDry run only. Re-run with --apply to write.')
  process.exit(0)
}

let ok = 0
for (const d of missing) {
  const url = `${BASE_URL}/problems/${d.id}?updateMask.fieldPaths=approved&currentDocument.exists=true`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { approved: { booleanValue: value } } }),
  })
  if (res.ok) { ok++ } else {
    const body = await res.json().catch(() => ({}))
    console.error(`✗ ${d.id}  ${body.error?.message || res.status}`)
  }
}
console.log(`\nWrote ${ok}/${missing.length}.`)

// Verification pass — independent re-read.
const after = await listAll()
const stillMissing = after.filter(d => !d.hasApproved)
if (stillMissing.length) {
  console.error(`\n✗ VERIFICATION FAILED: ${stillMissing.length} doc(s) still missing approved:`)
  for (const d of stillMissing) console.error(`   ${d.id}  ${d.title}`)
  process.exit(1)
}
console.log(`✓ Verified: all ${after.length} problem(s) have the approved field.`)
