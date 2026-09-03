// Firestore security-rules tests. Run with `npm run test:rules` — it needs the
// Firestore emulator (Java) and is deliberately OUTSIDE the `src/**/*.test.ts`
// glob that CI runs, because GitHub Actions has no JDK.
//
// Every test starts from the same seeded fixture (see seed()). Contexts:
//   anon     — the public gallery
//   teacher  — a Dawson account listed in config/superusers (mixed-case email
//              on purpose: the rule must lowercase it)
//   student  — a Dawson account NOT in the super-user list
//   gmail    — any other Google account
import { test, describe, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import firebase from 'firebase/compat/app'
import 'firebase/compat/firestore'
import {
  initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'

const FieldValue = firebase.firestore.FieldValue

const TEACHER  = { uid: 'teacher1', email: 'Teacher@DawsonSchool.org' }
const STUDENT  = { uid: 'student1', email: 'kid@dawsonstudents.org' }
const STUDENT2 = { uid: 'student2', email: 'pal@dawsonstudents.org' }
const RANDO    = { uid: 'rando',    email: 'rando@gmail.com' }

let env: RulesTestEnvironment

const comment = (n: number) => ({ text: `comment ${n}`, author: 'Anon', createdAt: 1000 + n })
const base = { title: 'Broken door', description: 'It sticks', createdAt: 1_700_000_000_000 }
const newProblem = { ...base, approved: false, status: 'new', upvotes: 0, comments: [] }

async function seed() {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await db.doc('config/superusers').set({ emails: ['teacher@dawsonschool.org'] })
    await db.doc('problems/approved1').set({ ...base, approved: true, status: 'new', upvotes: 3, comments: [comment(1)], submitterContact: 'a@b.c' })
    await db.doc('problems/pending1').set({ ...base, approved: false, status: 'new', upvotes: 0, comments: [] })
    await db.doc('problems/legacy1').set({ ...base, status: 'new', upvotes: 0, comments: [] }) // no `approved` field at all
    await db.doc('problems/claimed1').set({ ...base, approved: true, status: 'claimed', upvotes: 0, comments: [], claimedByTeam: 'Alpha', claimedByUser: 'Kid', claimedAt: 1, internalNotes: [] })
    await db.doc('teams/student1').set({ name: 'Alpha', members: '', joinedAt: 1 })
    await db.doc('teams/student2').set({ name: 'Alpha', members: '', joinedAt: 2 })
  })
}

const anon = () => env.unauthenticatedContext().firestore()
const as = (u: { uid: string; email: string }, verified = true) =>
  env.authenticatedContext(u.uid, { email: u.email, email_verified: verified }).firestore()

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'dawson-problem-bank-24a9c',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
after(async () => { await env.cleanup() })
beforeEach(seed)

// ── Reads ─────────────────────────────────────────────────────────────────
describe('problems: read', () => {
  test('anon: the gallery query (approved==true + orderBy createdAt) succeeds and sees only approved docs', async () => {
    const snap = await assertSucceeds(
      anon().collection('problems').where('approved', '==', true).orderBy('createdAt', 'desc').get())
    assert.deepEqual(snap.docs.map(d => d.id).sort(), ['approved1', 'claimed1'])
  })
  test('anon: an unconstrained list is denied', async () => {
    await assertFails(anon().collection('problems').get())
  })
  test('anon: listing pending docs is denied', async () => {
    await assertFails(anon().collection('problems').where('approved', '==', false).get())
  })
  test('anon: get approved doc succeeds', async () => {
    await assertSucceeds(anon().doc('problems/approved1').get())
  })
  test('anon: get pending doc is denied', async () => {
    await assertFails(anon().doc('problems/pending1').get())
  })
  test('anon: get a doc with no approved field fails closed', async () => {
    await assertFails(anon().doc('problems/legacy1').get())
  })
  test('gmail: get pending doc is denied', async () => {
    await assertFails(as(RANDO).doc('problems/pending1').get())
  })

  test('SUPER USER: unconstrained list succeeds via || short-circuit (load-bearing for the Pending tab)', async () => {
    const snap = await assertSucceeds(
      as(TEACHER).collection('problems').orderBy('createdAt', 'desc').get())
    assert.equal(snap.size, 4)
  })
  test('super user: get pending doc succeeds', async () => {
    await assertSucceeds(as(TEACHER).doc('problems/pending1').get())
  })
  test('super user with email_verified=false is treated as anonymous', async () => {
    await assertFails(as(TEACHER, false).collection('problems').get())
    await assertFails(as(TEACHER, false).doc('problems/pending1').get())
  })
  test('FOOTGUN: a capitalised entry in config/superusers locks the teacher out', async () => {
    await env.withSecurityRulesDisabled(ctx =>
      ctx.firestore().doc('config/superusers').set({ emails: ['Teacher@DawsonSchool.org'] }))
    await assertFails(as(TEACHER).collection('problems').get())
    await assertFails(as(TEACHER).doc('problems/pending1').get())
  })

  test('student: unconstrained list is denied', async () => {
    await assertFails(as(STUDENT).collection('problems').get())
  })
  test('student: gallery query succeeds', async () => {
    await assertSucceeds(as(STUDENT).collection('problems').where('approved', '==', true).orderBy('createdAt', 'desc').get())
  })
  test('student: team-release query needs the approved clause (confirmTeamChange)', async () => {
    await assertFails(as(STUDENT).collection('problems').where('claimedByTeam', '==', 'Alpha').get())
    const snap = await assertSucceeds(as(STUDENT).collection('problems')
      .where('claimedByTeam', '==', 'Alpha').where('approved', '==', true).get())
    assert.deepEqual(snap.docs.map(d => d.id), ['claimed1'])
  })
})

// ── Create ────────────────────────────────────────────────────────────────
describe('problems: create', () => {
  test('anon: the submit-wizard payload succeeds', async () => {
    await assertSucceeds(anon().collection('problems').add({
      ...newProblem, affects: 'x', severity: 3, categories: ['safety'], disciplines: [],
      submitterName: 'Pat', submitterRole: 'Parent', submitterContact: 'pat@example.com',
      willingness: 'full', resources: '', photos: [],
    }))
  })
  test('anon: SELF-APPROVAL BYPASS — approved:true at create is denied', async () => {
    await assertFails(anon().collection('problems').add({ ...newProblem, approved: true }))
  })
  test('anon: omitting approved is denied', async () => {
    const noApproved = Object.fromEntries(Object.entries(newProblem).filter(([k]) => k !== 'approved'))
    await assertFails(anon().collection('problems').add(noApproved))
  })
  test('anon: non-new status, pre-seeded votes or comments are denied', async () => {
    await assertFails(anon().collection('problems').add({ ...newProblem, status: 'solved' }))
    await assertFails(anon().collection('problems').add({ ...newProblem, upvotes: 50 }))
    await assertFails(anon().collection('problems').add({ ...newProblem, comments: [comment(1)] }))
  })
  test('anon: claim, note, or review metadata at create is denied', async () => {
    await assertFails(anon().collection('problems').add({ ...newProblem, internalNotes: [] }))
    await assertFails(anon().collection('problems').add({ ...newProblem, claimedByTeam: 'Alpha' }))
    await assertFails(anon().collection('problems').add({ ...newProblem, reviewedBy: 'me' }))
    await assertFails(anon().collection('problems').add({ ...newProblem, rejectedAt: 1 }))
  })
  test('anon: title/description bounds', async () => {
    await assertFails(anon().collection('problems').add({ ...newProblem, title: '' }))
    await assertFails(anon().collection('problems').add({ ...newProblem, title: 'x'.repeat(201) }))
    await assertFails(anon().collection('problems').add({ ...newProblem, description: 'x'.repeat(5001) }))
    await assertSucceeds(anon().collection('problems').add({ ...newProblem, title: 'x'.repeat(200), description: 'x'.repeat(5000) }))
  })
  test('super user: even a teacher cannot create pre-approved (approval is an update)', async () => {
    await assertFails(as(TEACHER).collection('problems').add({ ...newProblem, approved: true }))
    await assertSucceeds(as(TEACHER).collection('problems').add(newProblem))
  })
})

// ── Anonymous updates ─────────────────────────────────────────────────────
describe('problems: anonymous updates', () => {
  const ref = (id: string) => anon().doc(`problems/${id}`)

  test('upvote increment(1) succeeds and lands as +1', async () => {
    await assertSucceeds(ref('approved1').update({ upvotes: FieldValue.increment(1) }))
    const snap = await anon().doc('problems/approved1').get()
    assert.equal(snap.get('upvotes'), 4)
  })
  test('upvote increment(5), absolute 500, or -1 is denied', async () => {
    await assertFails(ref('approved1').update({ upvotes: FieldValue.increment(5) }))
    await assertFails(ref('approved1').update({ upvotes: 500 }))
    await assertFails(ref('approved1').update({ upvotes: FieldValue.increment(-1) }))
  })
  test('upvote piggybacking another field is denied', async () => {
    await assertFails(ref('approved1').update({ upvotes: FieldValue.increment(1), title: 'pwned' }))
  })
  test('upvote on a pending or legacy (no approved field) doc is denied', async () => {
    await assertFails(ref('pending1').update({ upvotes: FieldValue.increment(1) }))
    await assertFails(ref('legacy1').update({ upvotes: FieldValue.increment(1) }))
  })

  test('single comment arrayUnion succeeds', async () => {
    await assertSucceeds(ref('approved1').update({ comments: FieldValue.arrayUnion(comment(2)) }))
    const snap = await anon().doc('problems/approved1').get()
    assert.equal(snap.get('comments').length, 2)
  })
  test('comment append onto a doc with no comments field succeeds', async () => {
    await env.withSecurityRulesDisabled(ctx => ctx.firestore().doc('problems/nocomments')
      .set({ ...base, approved: true, status: 'new', upvotes: 0 }))
    await assertSucceeds(ref('nocomments').update({ comments: FieldValue.arrayUnion(comment(1)) }))
  })
  test('wiping, replacing, or appending two comments is denied', async () => {
    await assertFails(ref('approved1').update({ comments: [] }))
    await assertFails(ref('approved1').update({ comments: [comment(9)] }))
    await assertFails(ref('approved1').update({ comments: FieldValue.arrayUnion(comment(2), comment(3)) }))
  })
  test('malformed comments are denied', async () => {
    await assertFails(ref('approved1').update({ comments: FieldValue.arrayUnion({ ...comment(2), admin: true }) }))
    await assertFails(ref('approved1').update({ comments: FieldValue.arrayUnion({ text: 'x'.repeat(2001), author: 'A', createdAt: 1 }) }))
    await assertFails(ref('approved1').update({ comments: FieldValue.arrayUnion({ text: 'hi', createdAt: 1 }) }))
    await assertFails(ref('approved1').update({ comments: FieldValue.arrayUnion('just a string') }))
  })
  test('comment on a pending doc is denied', async () => {
    await assertFails(ref('pending1').update({ comments: FieldValue.arrayUnion(comment(2)) }))
  })

  test('rewriting title, status, approval, or notes is denied', async () => {
    await assertFails(ref('approved1').update({ title: 'pwned' }))
    await assertFails(ref('approved1').update({ status: 'claimed', claimedByTeam: 'Evil' }))
    await assertFails(ref('pending1').update({ approved: true }))
    await assertFails(ref('approved1').update({ internalNotes: FieldValue.arrayUnion({ author: 'x', text: 'y', createdAt: 1 }) }))
  })
  test('delete is denied', async () => {
    await assertFails(ref('approved1').delete())
  })
})

// ── Dawson student workflow ───────────────────────────────────────────────
describe('problems: student workflow', () => {
  const me = () => as(STUDENT)

  test('claim an approved problem succeeds', async () => {
    await assertSucceeds(me().doc('problems/approved1').update({
      status: 'claimed', claimedByTeam: 'Alpha', claimedByUser: 'Kid', claimedAt: Date.now(),
    }))
  })
  test('progress and solve succeed', async () => {
    await assertSucceeds(me().doc('problems/claimed1').update({ status: 'inprogress' }))
    await assertSucceeds(me().doc('problems/claimed1').update({ status: 'solved', solvedAt: Date.now() }))
  })
  test('unclaim with three deleteField() sentinels succeeds (deleted keys count in affectedKeys)', async () => {
    await assertSucceeds(me().doc('problems/claimed1').update({
      status: 'new', claimedByTeam: FieldValue.delete(), claimedByUser: FieldValue.delete(), claimedAt: FieldValue.delete(),
    }))
    const snap = await me().doc('problems/claimed1').get()
    assert.equal(snap.get('status'), 'new')
    assert.equal(snap.get('claimedByTeam'), undefined)
  })
  test('team note arrayUnion succeeds', async () => {
    await assertSucceeds(me().doc('problems/claimed1').update({
      internalNotes: FieldValue.arrayUnion({ author: 'Kid', text: 'met the client', createdAt: 1 }),
    }))
  })
  test('claiming a pending problem is denied', async () => {
    await assertFails(me().doc('problems/pending1').update({ status: 'claimed', claimedByTeam: 'Alpha' }))
  })
  test('approving, editing, or piggybacking fields is denied', async () => {
    await assertFails(me().doc('problems/pending1').update({ approved: true }))
    await assertFails(me().doc('problems/approved1').update({ title: 'renamed' }))
    await assertFails(me().doc('problems/approved1').update({ status: 'claimed', claimedByTeam: 'Alpha', title: 'renamed' }))
    await assertFails(me().doc('problems/approved1').update({ status: 'claimed', claimedByTeam: 'Alpha', rejectedAt: 1 }))
  })
  test('bogus status or deleting the status field is denied', async () => {
    await assertFails(me().doc('problems/approved1').update({ status: 'bogus' }))
    await assertFails(me().doc('problems/approved1').update({ status: FieldValue.delete() }))
  })
  test('delete is denied', async () => {
    await assertFails(me().doc('problems/approved1').delete())
  })
  test('gmail and unverified-Dawson accounts cannot claim', async () => {
    await assertFails(as(RANDO).doc('problems/approved1').update({ status: 'claimed', claimedByTeam: 'Evil' }))
    await assertFails(as(STUDENT, false).doc('problems/approved1').update({ status: 'claimed', claimedByTeam: 'Alpha' }))
  })
})

// ── Super user ────────────────────────────────────────────────────────────
describe('problems: super user', () => {
  const t = () => as(TEACHER)

  test('approve succeeds (and clears a stale rejectedAt)', async () => {
    await assertSucceeds(t().doc('problems/pending1').update({
      approved: true, reviewedBy: 'teacher@dawsonschool.org', reviewedAt: Date.now(), rejectedAt: FieldValue.delete(),
    }))
    // …and it is now publicly visible.
    await assertSucceeds(anon().doc('problems/pending1').get())
  })
  test('reject (soft) succeeds and hides the doc', async () => {
    await assertSucceeds(t().doc('problems/approved1').update({ approved: false, rejectedAt: Date.now(), reviewedBy: 'teacher@dawsonschool.org' }))
    await assertFails(anon().doc('problems/approved1').get())
  })
  test('the full EditProblemModal payload (with deleteField sentinels) succeeds', async () => {
    const f = FieldValue.delete()
    await assertSucceeds(t().doc('problems/approved1').update({
      title: 'T', description: 'D', affects: f, where: f, severity: 2, categories: ['safety'], disciplines: [],
      submitterName: 'Pat', submitterRole: f, submitterContact: f, workaround: f, constraints: f,
    }))
  })
  test('unclaim and delete succeed', async () => {
    await assertSucceeds(t().doc('problems/claimed1').update({
      status: 'new', claimedByTeam: FieldValue.delete(), claimedByUser: FieldValue.delete(), claimedAt: FieldValue.delete(),
    }))
    await assertSucceeds(t().doc('problems/approved1').delete())
  })
  test('config is readable by Dawson accounts only and never writable', async () => {
    await assertSucceeds(t().doc('config/superusers').get())
    await assertSucceeds(as(STUDENT).doc('config/superusers').get())
    await assertFails(anon().doc('config/superusers').get())
    await assertFails(as(RANDO).doc('config/superusers').get())
    await assertFails(t().doc('config/superusers').update({ emails: FieldValue.arrayUnion('x@dawsonschool.org') }))
  })
})

// ── Teams ─────────────────────────────────────────────────────────────────
describe('teams', () => {
  test('a Dawson user writes and deletes only their own slot', async () => {
    await assertSucceeds(as(STUDENT2).doc('teams/student2').set({ name: 'Beta', members: '', joinedAt: 3 }))
    await assertFails(as(STUDENT2).doc('teams/student1').set({ name: 'Beta', members: '', joinedAt: 3 }))
    await assertSucceeds(as(STUDENT2).doc('teams/student2').delete())
    await assertFails(as(STUDENT2).doc('teams/student1').delete())
  })
  test('team doc shape is enforced', async () => {
    await assertFails(as(STUDENT2).doc('teams/student2').set({ name: '', members: '', joinedAt: 3 }))
    await assertFails(as(STUDENT2).doc('teams/student2').set({ name: 'x'.repeat(61), members: '', joinedAt: 3 }))
    await assertFails(as(STUDENT2).doc('teams/student2').set({ name: 'Beta', members: '', joinedAt: 3, isAdmin: true }))
  })
  test('Dawson users can list teams; anon and gmail cannot', async () => {
    await assertSucceeds(as(STUDENT).collection('teams').get())
    await assertSucceeds(as(STUDENT).collection('teams').where('name', '==', 'Alpha').get())
    await assertFails(anon().collection('teams').get())
    await assertFails(as(RANDO).collection('teams').get())
    await assertFails(as(RANDO).doc('teams/rando').set({ name: 'Evil', members: '', joinedAt: 1 }))
  })
  test("super user can delete another member's slot (Manage Teams)", async () => {
    await assertSucceeds(as(TEACHER).doc('teams/student2').delete())
    await assertFails(as(STUDENT).doc('teams/student2').delete())
  })
})
