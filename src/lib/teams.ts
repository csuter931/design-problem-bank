// Pure, framework-free logic for grouping team data shown in Manage Teams.
// Kept separate from Firestore so it can be unit-tested in isolation.

export interface TeamDoc {
  id: string
  name?: string
}

export interface ProblemLite {
  id: string
  claimedByTeam?: string
  status?: string
}

export interface TeamGroup {
  name: string
  memberCount: number
  activeProblems: number
  solvedProblems: number
  /** True when the team has claimed work but no remaining member slots. */
  orphaned: boolean
}

const ACTIVE_STATUSES = new Set(['claimed', 'inprogress'])

/**
 * Build the team list shown in Manage Teams by merging two sources:
 *   - member slots from the `teams` collection (one doc per signed-in person)
 *   - team names stamped on problems via `claimedByTeam`
 *
 * A team is listed when it has member slots OR active (claimed/in-progress)
 * work. Teams whose only footprint is solved problems are intentionally
 * omitted — that stamp is "solved by" history, with nothing to act on.
 * Results are sorted by name for a stable, predictable list.
 */
export function buildTeamGroups(teamDocs: TeamDoc[], problems: ProblemLite[]): TeamGroup[] {
  const memberCount = new Map<string, number>()
  for (const doc of teamDocs) {
    if (doc.name) memberCount.set(doc.name, (memberCount.get(doc.name) ?? 0) + 1)
  }

  const activeCount = new Map<string, number>()
  const solvedCount = new Map<string, number>()
  for (const p of problems) {
    const name = p.claimedByTeam
    if (!name) continue
    if (ACTIVE_STATUSES.has(p.status ?? '')) {
      activeCount.set(name, (activeCount.get(name) ?? 0) + 1)
    } else if (p.status === 'solved') {
      solvedCount.set(name, (solvedCount.get(name) ?? 0) + 1)
    }
  }

  const names = new Set<string>([...memberCount.keys(), ...activeCount.keys()])
  return Array.from(names, name => {
    const members = memberCount.get(name) ?? 0
    return {
      name,
      memberCount: members,
      activeProblems: activeCount.get(name) ?? 0,
      solvedProblems: solvedCount.get(name) ?? 0,
      orphaned: members === 0,
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}
