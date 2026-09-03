// Seed the LOCAL Firestore emulator with fixture data for manual testing.
//
//   npm run emulators                 # terminal 1 — starts the emulator (needs Java)
//   npm run emulators:seed [email]    # terminal 2 — seeds it; `email` becomes the super user
//   npm run dev:emulator              # terminal 3 — Vite pointed at the emulator
//
// Talks to the emulator's REST endpoint with the `Bearer owner` token, which
// bypasses security rules (emulator only). Never touches production.

const HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
const PROJECT_ID = 'dawson-problem-bank-24a9c'
const BASE_URL = `http://${HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const superUser = (process.argv[2] || 'csupiro@dawsonschool.org').trim().toLowerCase()

function toValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toValue) } }
  if (typeof val === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(val)) fields[k] = toValue(v)
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

async function put(path, data) {
  const fields = {}
  for (const [k, v] of Object.entries(data)) fields[k] = toValue(v)
  const res = await fetch(`${BASE_URL}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`)
  console.log(`✓ ${path}`)
}

const now = Date.now()
const day = 86_400_000
const problem = (over) => ({
  description: 'Lorem ipsum — a realistic multi-sentence description of the problem so the card and detail modal have something to render.',
  affects: 'Students in the makerspace', where: 'Makerspace', frequency: 'daily', duration: 'Since last year',
  workaround: '', priorAttempts: '', constraints: '', categories: ['workspace'], disciplines: ['product-design'],
  submitterName: 'Sam Submitter', submitterRole: 'Teacher', submitterContact: 'sam@example.com',
  willingness: 'full', resources: '', photos: [], status: 'new', upvotes: 0, comments: [], severity: 3,
  ...over,
})

try {
  await fetch(`http://${HOST}/`)
} catch {
  console.error(`✗ No emulator at ${HOST}. Start it first: npm run emulators`)
  process.exit(1)
}

await put('config/superusers', { emails: [superUser] })
await put('problems/approved-new', problem({ title: 'Approved — available to claim', approved: true, createdAt: now - 1 * day, upvotes: 4,
  comments: [{ text: 'Great idea', author: 'Pat', createdAt: now - day }], reviewedBy: superUser, reviewedAt: now - day }))
await put('problems/approved-claimed', problem({ title: 'Approved — claimed by Alpha', approved: true, status: 'claimed', createdAt: now - 3 * day,
  claimedByTeam: 'Alpha', claimedByUser: 'Kid', claimedAt: now - 2 * day, internalNotes: [] }))
await put('problems/approved-solved', problem({ title: 'Approved — solved', approved: true, status: 'solved', createdAt: now - 20 * day,
  claimedByTeam: 'Alpha', solvedAt: now - 5 * day, severity: 5 }))
await put('problems/pending-1', problem({ title: 'PENDING — fresh submission', approved: false, createdAt: now - 3_600_000, severity: 4 }))
await put('problems/pending-2', problem({ title: 'PENDING — older submission', approved: false, createdAt: now - 2 * day, severity: 2 }))
await put('problems/rejected-1', problem({ title: 'REJECTED — hidden but restorable', approved: false, rejectedAt: now - day, reviewedBy: superUser, reviewedAt: now - day, createdAt: now - 4 * day }))
await put('problems/legacy-no-field', problem({ title: 'LEGACY — no approved field (should read as pending)', createdAt: now - 30 * day }))

console.log(`\nSeeded. Super user: ${superUser}`)
console.log('Public gallery should show 3 problems; the Pending tab should show 3 (2 pending + legacy) and 1 rejected.')
