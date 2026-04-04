const KEY = 'pb_voted'

export function hasVoted(id: string): boolean {
  try {
    const voted: string[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    return voted.includes(id)
  } catch { return false }
}

export function recordVote(id: string): void {
  try {
    const voted: string[] = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!voted.includes(id)) {
      voted.push(id)
      localStorage.setItem(KEY, JSON.stringify(voted))
    }
  } catch { /* ignore */ }
}
