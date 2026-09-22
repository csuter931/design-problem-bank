// Which dashboard tab a URL asks for. Split out from StudentDashboard so the
// notifier's ?tab=pending deep link is testable without mounting React.

export type DashboardTab = 'available' | 'mine' | 'solved' | 'all' | 'pending'

const TABS: DashboardTab[] = ['available', 'mine', 'solved', 'all', 'pending']
const DEFAULT_TAB: DashboardTab = 'available'

/**
 * @param search      `window.location.search`, with or without the leading '?'.
 * @param isSuperUser Pending is a super-user-only queue; anyone else asking for
 *                    it gets the default rather than an empty tab.
 */
export function initialTab(search: string, isSuperUser: boolean): DashboardTab {
  const requested = new URLSearchParams(search).get('tab')?.toLowerCase() ?? ''
  const match = TABS.find(t => t === requested)
  if (!match) return DEFAULT_TAB
  if (match === 'pending' && !isSuperUser) return DEFAULT_TAB
  return match
}
