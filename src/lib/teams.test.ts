import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTeamGroups } from './teams.ts'

test('surfaces an active claim with no member slots as an orphaned team', () => {
  const groups = buildTeamGroups(
    [{ id: 'u1', name: "Ellenbogen's Team" }],
    [
      { id: 'p1', claimedByTeam: "Ellenbogen's Team", status: 'inprogress' },
      { id: 'p2', claimedByTeam: 'ex', status: 'claimed' },
      { id: 'p3', claimedByTeam: 'ex', status: 'solved' },
    ],
  )

  assert.deepEqual(groups.find(g => g.name === 'ex'), {
    name: 'ex',
    memberCount: 0,
    activeProblems: 1,
    solvedProblems: 1,
    orphaned: true,
  })
  assert.deepEqual(groups.find(g => g.name === "Ellenbogen's Team"), {
    name: "Ellenbogen's Team",
    memberCount: 1,
    activeProblems: 1,
    solvedProblems: 0,
    orphaned: false,
  })
})

test('excludes a team whose only footprint is solved problems', () => {
  const groups = buildTeamGroups([], [{ id: 'p1', claimedByTeam: 'oldteam', status: 'solved' }])
  assert.deepEqual(groups, [])
})

test('counts multiple member slots sharing a name as one team', () => {
  const groups = buildTeamGroups(
    [{ id: 'u1', name: 'Alpha' }, { id: 'u2', name: 'Alpha' }],
    [],
  )
  assert.deepEqual(groups, [
    { name: 'Alpha', memberCount: 2, activeProblems: 0, solvedProblems: 0, orphaned: false },
  ])
})

test('ignores blank or missing claimedByTeam', () => {
  const groups = buildTeamGroups([], [
    { id: 'p1', claimedByTeam: '', status: 'new' },
    { id: 'p2', status: 'new' },
  ])
  assert.deepEqual(groups, [])
})
