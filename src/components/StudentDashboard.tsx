import { useState, useEffect } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection, query, orderBy, onSnapshot,
  doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { ProblemDetail, type Problem } from '@/components/ProblemDetail'
import { SAMPLE_PROBLEMS } from '@/lib/sampleProblems'
import { AnimatePresence } from 'framer-motion'

// ── Types ────────────────────────────────────────────────
interface Team { name: string; members: string; joinedAt?: number }

type Tab = 'available' | 'mine' | 'solved' | 'all'
type AuthView = 'loading' | 'signin' | 'team-setup' | 'dashboard'

const STATUS_LABELS: Record<string, string> = {
  new: 'NEW', claimed: 'CLAIMED', inprogress: 'IN PROGRESS', solved: 'SOLVED',
}
const STATUS_COLORS: Record<string, string> = {
  new: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  claimed: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  inprogress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  solved: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
}
const SEVERITY_EMOJI = ['', '😀', '😕', '😟', '😫', '😱']
const SEVERITY_LABEL = ['', 'Minor', 'Moderate', 'Painful', 'Serious', 'Critical']

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary focus:bg-white/[0.09] transition-colors'
const labelCls = 'block text-sm font-medium text-white/80 mb-1'

// ── StudentDashboard ─────────────────────────────────────
export function StudentDashboard({ onBack }: { onBack: () => void }) {
  const [authView, setAuthView] = useState<AuthView>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [tab, setTab] = useState<Tab>('available')
  const [signingIn, setSigningIn] = useState(false)
  const [signInError, setSignInError] = useState('')

  // Team setup state
  const [teamMode, setTeamMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [teamMembers, setTeamMembers] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)
  const [existingTeams, setExistingTeams] = useState<Team[]>([])

  // Detail flyout + email modal
  const [detailProblem, setDetailProblem] = useState<Problem | null>(null)
  const [emailModal, setEmailModal] = useState<{ problem: Problem; type: 'intro' | 'update' | 'solved' } | null>(null)

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setUser(null); setTeam(null); setAuthView('signin'); return }
      setUser(u)
      try {
        const snap = await getDoc(doc(db, 'teams', u.uid))
        if (snap.exists()) {
          setTeam(snap.data() as Team)
          setAuthView('dashboard')
        } else {
          try { await loadExistingTeams() } catch { /* non-fatal */ }
          setAuthView('team-setup')
        }
      } catch (e) {
        console.error('Failed to load team:', e)
        // Can't read Firestore — still let them in, just without a team
        setAuthView('team-setup')
      }
    })
    return unsub
  }, [])

  // Problems listener — prepend samples so they always appear
  useEffect(() => {
    const q = query(collection(db, 'problems'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      const live = snap.docs.map(d => ({ id: d.id, ...d.data() } as Problem))
      setProblems([...SAMPLE_PROBLEMS, ...live])
    })
  }, [])

  async function loadExistingTeams() {
    const teamsSnap = await getDocs(collection(db, 'teams'))
    const seen = new Map<string, Team>()
    teamsSnap.docs.forEach(d => {
      const t = d.data() as Team
      if (t.name) seen.set(t.name, t)
    })
    setExistingTeams(Array.from(seen.values()))
  }

  async function handleSignIn() {
    setSigningIn(true)
    setSignInError('')
    localStorage.setItem('reopenStudentPortal', String(Date.now()))
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
    } catch (e: unknown) {
      localStorage.removeItem('reopenStudentPortal')
      const msg = e instanceof Error ? e.message : String(e)
      setSignInError(msg.includes('popup-closed') ? 'Sign-in cancelled.' : 'Sign-in failed. Try again.')
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() { await signOut(auth); onBack() }

  async function handleCreateTeam() {
    if (!teamName.trim() || !user) return
    setSavingTeam(true)
    const t: Team = { name: teamName.trim(), members: teamMembers.trim(), joinedAt: Date.now() }
    await setDoc(doc(db, 'teams', user.uid), t)
    setTeam(t); setAuthView('dashboard')
    setSavingTeam(false)
  }

  async function handleJoinTeam(t: Team) {
    if (!user) return
    setSavingTeam(true)
    await setDoc(doc(db, 'teams', user.uid), t)
    setTeam(t); setAuthView('dashboard')
    setSavingTeam(false)
  }

  async function handleLeaveTeam() {
    if (!user || !confirm('Leave your team? You can rejoin or create a new one anytime.')) return
    await deleteDoc(doc(db, 'teams', user.uid))
    setTeam(null); setTeamName(''); setTeamMembers('')
    await loadExistingTeams()
    setAuthView('team-setup')
  }

  async function claimProblem(id: string) {
    if (!team) return
    await updateDoc(doc(db, 'problems', id), {
      status: 'claimed',
      claimedByTeam: team.name,
      claimedByUser: user?.displayName || user?.email || '',
      claimedAt: Date.now(),
    })
    const p = problems.find(p => p.id === id)
    if (p) setTimeout(() => setEmailModal({ problem: { ...p, claimedByTeam: team.name }, type: 'intro' }), 400)
  }

  async function updateStatus(id: string, status: 'inprogress' | 'solved') {
    await updateDoc(doc(db, 'problems', id), {
      status,
      ...(status === 'solved' ? { solvedAt: Date.now() } : {}),
    })
    if (status === 'solved') {
      const p = problems.find(p => p.id === id)
      if (p) setTimeout(() => setEmailModal({ problem: p, type: 'solved' }), 400)
    }
  }


  // ── Filtered lists ───────────────────────────────────────
  const available = problems.filter(p => (p.status || 'new') === 'new')
  const mine = problems.filter(p => p.claimedByTeam === team?.name && p.status !== 'solved')
  const solved = problems.filter(p => p.status === 'solved')

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'available', label: '🟢 Available', count: available.length },
    { id: 'mine', label: '📌 My Team\'s', count: mine.length },
    { id: 'solved', label: '🟣 Solved', count: solved.length },
    { id: 'all', label: '📚 All', count: problems.length },
  ]

  const tabProblems: Record<Tab, Problem[]> = {
    available, mine, solved, all: problems,
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0b0f1a] text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-[#0b0f1a]/90 backdrop-blur border-b border-white/[0.07] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white/40 hover:text-white/80 text-sm transition-colors">
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎓</span>
              <div>
                <h1 className="font-bold text-sm text-white leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Student Dashboard
                </h1>
                <p className="text-xs text-white/35">Design Problem Bank</p>
              </div>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              {team && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-medium">
                  👥 {team.name}
                </span>
              )}
              <span className="text-xs text-white/40 hidden sm:block">{user.email}</span>
              <button onClick={handleSignOut} className="text-xs text-white/35 hover:text-white/70 transition-colors">
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* ── LOADING ── */}
        {authView === 'loading' && (
          <div className="text-center py-20 text-white/30">Loading…</div>
        )}

        {/* ── SIGN IN ── */}
        {authView === 'signin' && (
          <div className="max-w-sm mx-auto text-center flex flex-col items-center gap-6 pt-16">
            <div className="text-6xl">🔐</div>
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Student Sign In
              </h2>
              <p className="text-white/45 text-sm leading-relaxed">
                Sign in with your school Google account to claim problems, track progress, and collaborate with your team.
              </p>
            </div>
            {signInError && <p className="text-red-400 text-sm">{signInError}</p>}
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex items-center gap-3 px-6 py-3.5 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-white text-sm font-medium transition-colors disabled:opacity-50 w-full justify-center"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {signingIn ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>
        )}

        {/* ── TEAM SETUP ── */}
        {authView === 'team-setup' && user && (
          <div className="max-w-md mx-auto flex flex-col gap-6 pt-8">
            <div>
              <p className="text-white/40 text-xs mb-1">Signed in as {user.email}</p>
              <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Set up your team
              </h2>
              <p className="text-white/45 text-sm mt-1">Create a new team or join an existing one to start claiming problems.</p>
            </div>

            <div className="flex gap-2">
              {(['create', 'join'] as const).map(m => (
                <button key={m} onClick={() => setTeamMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${teamMode === m ? 'bg-primary border-primary text-white' : 'border-white/[0.15] text-white/50 hover:text-white/80'}`}>
                  {m === 'create' ? '➕ Create Team' : '👥 Join Team'}
                </button>
              ))}
            </div>

            {teamMode === 'create' && (
              <div className="flex flex-col gap-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <div>
                  <label className={labelCls}>Team Name <span className="text-red-400">*</span></label>
                  <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder='e.g., "Studio Six"' maxLength={40} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Members <span className="text-white/30 font-normal">(optional)</span></label>
                  <input value={teamMembers} onChange={e => setTeamMembers(e.target.value)} placeholder='e.g., "Alex, Jamie, Sam"' className={inputCls} />
                </div>
                <button onClick={handleCreateTeam} disabled={savingTeam || !teamName.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                  {savingTeam ? 'Creating…' : '🚀 Create Team'}
                </button>
              </div>
            )}

            {teamMode === 'join' && (
              <div className="flex flex-col gap-2">
                {existingTeams.length === 0
                  ? <p className="text-white/30 text-sm text-center py-6">No existing teams yet — create one!</p>
                  : existingTeams.map(t => (
                    <button key={t.name} onClick={() => handleJoinTeam(t)} disabled={savingTeam}
                      className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all disabled:opacity-50">
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">{t.name}</p>
                        {t.members && <p className="text-white/40 text-xs">{t.members}</p>}
                      </div>
                      <span className="text-white/30 text-sm">Join →</span>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {authView === 'dashboard' && user && (
          <div className="flex flex-col gap-6">

            {/* Team banner if no team */}
            {!team && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-yellow-300 font-medium text-sm">You're a free agent</p>
                  <p className="text-white/45 text-xs">Join or create a team to claim problems.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setAuthView('team-setup')} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors">
                    Set up team
                  </button>
                </div>
              </div>
            )}

            {/* Team info bar */}
            {team && (
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-sm">👥 {team.name}</p>
                  {team.members && <p className="text-white/40 text-xs">{team.members}</p>}
                </div>
                <button onClick={handleLeaveTeam} className="text-xs text-white/30 hover:text-red-400 transition-colors">
                  Leave team
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.04] border border-white/[0.08] rounded-xl p-1">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                    tab === t.id ? 'bg-primary text-white shadow' : 'text-white/45 hover:text-white/70'
                  }`}>
                  {t.label}
                  <span className={`text-[0.65rem] px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-white/[0.08]'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Problem list */}
            <div className="flex flex-col gap-3">
              {tab === 'mine' && !team ? (
                <EmptyState icon="👥" title="Join a team first" desc="Create or join a team to see your team's claimed problems here." />
              ) : tabProblems[tab].length === 0 ? (
                <EmptyState
                  icon={tab === 'available' ? '✅' : tab === 'mine' ? '🔍' : tab === 'solved' ? '🏆' : '📭'}
                  title={tab === 'available' ? 'All problems claimed!' : tab === 'mine' ? 'No active problems' : tab === 'solved' ? 'No solved problems yet' : 'No problems yet'}
                  desc={tab === 'mine' ? 'Browse Available to find a problem to tackle.' : ''}
                />
              ) : (
                tabProblems[tab].map(p => (
                  <ProblemListItem
                    key={p.id}
                    problem={p}
                    context={tab}
                    team={team}
                    onClaim={claimProblem}
                    onUpdateStatus={updateStatus}
                    onViewDetail={setDetailProblem}
                    onEmailTemplate={(type) => setEmailModal({ problem: p, type })}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── DETAIL FLYOUT (shared component) ── */}
      <AnimatePresence>
        {detailProblem && (
          <ProblemDetail
            key={detailProblem.id}
            problem={detailProblem}
            onClose={() => setDetailProblem(null)}
          />
        )}
      </AnimatePresence>

      {/* ── EMAIL TEMPLATE MODAL ── */}
      {emailModal && (
        <EmailModal
          problem={emailModal.problem}
          type={emailModal.type}
          user={user}
          team={team}
          onClose={() => setEmailModal(null)}
        />
      )}
    </div>
  )
}

// ── ProblemListItem ──────────────────────────────────────
function ProblemListItem({ problem, context, team, onClaim, onUpdateStatus, onViewDetail, onEmailTemplate }: {
  problem: Problem
  context: Tab
  team: Team | null
  onClaim: (id: string) => void
  onUpdateStatus: (id: string, status: 'inprogress' | 'solved') => void
  onViewDetail: (p: Problem) => void
  onEmailTemplate: (type: 'intro' | 'update' | 'solved') => void
}) {
  const status = problem.status || 'new'
  const isMine = problem.claimedByTeam === team?.name

  return (
    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.14] transition-colors">
      <div className="flex gap-4 p-4">
        {/* Thumbnail */}
        <div className="w-20 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-white/[0.04] flex items-center justify-center">
          {problem.photos?.[0]
            ? <img src={problem.photos[0]} alt="" className="w-full h-full object-cover" />
            : <span className="text-2xl opacity-20">💡</span>
          }
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1 mb-1.5">
            <span className={`text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            {problem.severity ? (
              <span className="text-[0.65rem] text-white/45 px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                {SEVERITY_EMOJI[problem.severity]} {SEVERITY_LABEL[problem.severity]}
              </span>
            ) : null}
            {problem.claimedByTeam && (
              <span className="text-[0.65rem] text-white/45 px-1.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                👥 {problem.claimedByTeam}
              </span>
            )}
          </div>
          <p className="text-white text-sm font-semibold leading-snug mb-1 truncate">{problem.title}</p>
          <p className="text-white/45 text-xs leading-relaxed line-clamp-2">{problem.description}</p>
          <div className="flex items-center gap-3 mt-2 text-white/30 text-xs">
            <span>by {problem.submitterName || 'Anonymous'}</span>
            <span>▲ {problem.upvotes || 0}</span>
            <button onClick={() => onViewDetail(problem)} className="text-primary/70 hover:text-primary transition-colors">
              View details →
            </button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 px-4 pb-4">
        {context === 'available' && (
          team
            ? <button onClick={() => onClaim(problem.id)} className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors">🙋 Claim</button>
            : <span className="text-xs text-white/25">Join a team to claim</span>
        )}
        {context === 'mine' && isMine && status === 'claimed' && (
          <>
            <button onClick={() => onUpdateStatus(problem.id, 'inprogress')} className="px-4 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-500/30 transition-colors">▶ Start Work</button>
            <button onClick={() => onEmailTemplate('intro')} className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors">✉ Intro Email</button>
            <button onClick={() => onViewDetail(problem)} className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors">📝 Notes</button>
          </>
        )}
        {context === 'mine' && isMine && status === 'inprogress' && (
          <>
            <button onClick={() => onUpdateStatus(problem.id, 'solved')} className="px-4 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium hover:bg-purple-500/30 transition-colors">✅ Mark Solved</button>
            <button onClick={() => onEmailTemplate('update')} className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors">✉ Progress Update</button>
            <button onClick={() => onViewDetail(problem)} className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors">📝 Notes</button>
          </>
        )}
        {context === 'solved' && isMine && (
          <button onClick={() => onEmailTemplate('solved')} className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors">✉ Share Results</button>
        )}
        {(context === 'all' || context === 'solved') && (
          <button onClick={() => onViewDetail(problem)} className="px-4 py-1.5 rounded-lg border border-white/[0.12] text-white/50 text-xs hover:text-white/80 transition-colors">View details →</button>
        )}
      </div>
    </div>
  )
}

// ── EmailModal ───────────────────────────────────────────
function EmailModal({ problem, type, user, team, onClose }: {
  problem: Problem
  type: 'intro' | 'update' | 'solved'
  user: User | null
  team: Team | null
  onClose: () => void
}) {
  const submitterFirst = (problem.submitterName || 'there').split(' ')[0]
  const teamName = team?.name || 'Our Team'
  const studentName = user?.displayName || 'A student'
  const contactEmail = user?.email || 'student@school.edu'
  const contact = (problem as unknown as Record<string,string>).submitterContact || ''

  const templates = {
    intro: {
      subject: `Your Problem Bank submission: "${problem.title}"`,
      body: `Hi ${submitterFirst},

My name is ${studentName} and I'm part of "${teamName}" in our design class. We saw your submission to the Design Problem Bank about "${problem.title}" and we'd love to take it on as our project!

We're really interested in learning more about this problem. Would you be available for a short conversation sometime in the next week or two? We'd love to hear more about:

- Your firsthand experience with this problem
- Anyone else we should talk to
- Any additional context that might help us understand it better

We can meet in person, over a video call, or whatever works best for you.

Thanks for submitting this — we're excited to work on it!

Best,
${studentName}
${teamName}
${contactEmail}`,
    },
    update: {
      subject: `Update on "${problem.title}" — we're making progress!`,
      body: `Hi ${submitterFirst},

I wanted to give you a quick update on "${problem.title}" — the problem you submitted to our Design Problem Bank.

Our team (${teamName}) has been working on this and we're making good progress. Here's where we are:

[DESCRIBE YOUR CURRENT PROGRESS]

[DESCRIBE WHAT YOU'RE WORKING ON NEXT]

We'd love to get your feedback on what we have so far. Would you have time for a quick check-in?

Thanks again for being such a great collaborator!

Best,
${studentName}
${teamName}
${contactEmail}`,
    },
    solved: {
      subject: `We solved it! Update on "${problem.title}"`,
      body: `Hi ${submitterFirst},

Great news — our team (${teamName}) has completed our work on "${problem.title}"!

Here's what we came up with:

[DESCRIBE YOUR SOLUTION]

[DESCRIBE THE IMPACT / HOW IT ADDRESSES THE PROBLEM]

We'd love to present our solution to you and hear what you think. Would you be available for a short meeting?

Thank you so much for submitting this problem and for all your help along the way!

Best,
${studentName}
${teamName}
${contactEmail}`,
    },
  }

  const [subject, setSubject] = useState(templates[type].subject)
  const [body, setBody] = useState(templates[type].body)
  const [copied, setCopied] = useState(false)

  function copyToClipboard() {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openMailClient() {
    window.open(`mailto:${contact}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  }

  const titles = { intro: '✉ Introduction Email', update: '✉ Progress Update', solved: '✉ Share Results' }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-bold text-white text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>{titles[type]}</h2>
            <p className="text-white/40 text-xs mt-0.5">Edit and send from your school email to {problem.submitterName || 'the submitter'}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg transition-colors">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          <div>
            <label className={labelCls}>To</label>
            <input value={contact} readOnly className={`${inputCls} opacity-60 cursor-default`} />
          </div>
          <div>
            <label className={labelCls}>Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <p className="text-white/30 text-xs mb-1.5">Edit anything in [BRACKETS] before sending.</p>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
              className={`${inputCls} resize-none font-mono text-xs leading-relaxed`} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
          <button onClick={onClose} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
          <div className="flex gap-2">
            <button onClick={copyToClipboard} className="px-4 py-2 rounded-xl border border-white/[0.15] text-white/60 text-sm hover:text-white/90 transition-colors">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={openMailClient} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              ✉ Open in Email
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────
function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-16 flex flex-col items-center gap-3">
      <span className="text-4xl">{icon}</span>
      <h3 className="text-white/60 font-semibold">{title}</h3>
      {desc && <p className="text-white/30 text-sm">{desc}</p>}
    </div>
  )
}
