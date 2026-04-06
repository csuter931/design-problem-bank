// One-time script to seed 5 real sample problems into Firestore.
// Run with: node scripts/seed-problems.mjs

const PROJECT_ID = 'dawson-problem-bank-24a9c'
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`

const now = Date.now()

const problems = [
  {
    title: 'Hallway congestion between periods makes students late to class',
    description:
      'The main corridor between the science wing and the gym becomes a bottleneck when two grade levels change classes at the same time. Students regularly arrive 3–5 minutes late because of the crush, especially near the stairwell.',
    affects: 'All students and teachers in the main building',
    where: 'Main corridor between science wing and gym',
    frequency: 'daily',
    severity: 3,
    categories: ['safety', 'workspace'],
    disciplines: ['spatial-design', 'service-design'],
    submitterName: 'Ms. Tremblay',
    submitterRole: 'Teacher',
    status: 'new',
    upvotes: 0,
    comments: [],
    createdAt: now - 1000 * 60 * 60 * 24 * 3,
  },
  {
    title: 'No way to know if a study room is free without walking there',
    description:
      'The four bookable study rooms on the second floor have no visible availability indicator. Students walk all the way upstairs to find every room taken, then have no idea when one will be free. A room booking system or even a simple door indicator would help.',
    affects: 'Students who need quiet study space',
    where: 'Second floor study rooms',
    frequency: 'daily',
    severity: 3,
    categories: ['workspace', 'communication'],
    disciplines: ['ux-design', 'product-design'],
    submitterName: 'Priya Nair',
    submitterRole: 'Grade 11 student',
    status: 'new',
    upvotes: 0,
    comments: [],
    createdAt: now - 1000 * 60 * 60 * 24 * 7,
  },
  {
    title: 'Cafeteria trays stack up with no clear return system during peak lunch',
    description:
      'At peak lunch (11:30–12:15) dirty trays pile up on tables and the return counter gets overwhelmed. There is no signage guiding students, and the return area is in an awkward corner that most people don\'t notice until someone points it out.',
    affects: 'All students who eat in the cafeteria',
    where: 'Cafeteria, tray return area',
    frequency: 'daily',
    severity: 2,
    categories: ['sustainability', 'community', 'communication'],
    disciplines: ['service-design', 'graphic-design'],
    submitterName: 'Cafeteria Staff',
    submitterRole: 'Staff',
    status: 'new',
    upvotes: 0,
    comments: [],
    createdAt: now - 1000 * 60 * 60 * 24 * 10,
  },
  {
    title: 'Sports equipment shed is disorganised — gear goes missing before games',
    description:
      'The outdoor equipment shed is shared by four sports teams with no labelling or storage system. Pinnies, cones, and balls regularly disappear or end up in the wrong bins. Coaches spend 10–15 minutes before practice hunting for equipment.',
    affects: 'Coaches and student athletes',
    where: 'Outdoor equipment shed near the back field',
    frequency: 'weekly',
    severity: 2,
    categories: ['workspace'],
    disciplines: ['product-design', 'spatial-design'],
    submitterName: 'Coach Beaumont',
    submitterRole: 'Phys Ed teacher',
    status: 'new',
    upvotes: 0,
    comments: [],
    createdAt: now - 1000 * 60 * 60 * 24 * 14,
  },
  {
    title: 'Lost and found overflows every two weeks with no way to find your stuff',
    description:
      'The lost and found bin near the main office fills up within two weeks. There\'s no system for labelling items or notifying students. Most things sit unclaimed for months and then get donated. Students who lose something have no way to search or know what\'s there without digging through a pile.',
    affects: 'All students and staff',
    where: 'Main office lost and found bin',
    frequency: 'weekly',
    severity: 2,
    categories: ['community', 'communication'],
    disciplines: ['service-design', 'ux-design'],
    submitterName: 'Main Office Staff',
    submitterRole: 'Administration',
    status: 'new',
    upvotes: 0,
    comments: [],
    createdAt: now - 1000 * 60 * 60 * 24 * 5,
  },
]

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

function toFirestoreDoc(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v)
  return { fields }
}

async function seed() {
  console.log('Seeding 5 problems to Firestore...\n')
  for (const problem of problems) {
    const res = await fetch(`${BASE_URL}/problems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toFirestoreDoc(problem)),
    })
    const data = await res.json()
    if (res.ok) {
      const id = data.name.split('/').pop()
      console.log(`✓ "${problem.title.slice(0, 50)}…"  →  ${id}`)
    } else {
      console.error(`✗ Failed: ${data.error?.message || JSON.stringify(data)}`)
    }
  }
  console.log('\nDone.')
}

seed()
