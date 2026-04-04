import { useState, useEffect } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

export interface StudentSession {
  user: User
  team: { name: string; members: string } | null
}

interface Props {
  onClose: () => void
  onSessionChange: (session: StudentSession | null) => void
}

// ── helpers ─────────────────────────────────────────────
const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary focus:bg-white/[0.09] transition-colors'
const labelCls = 'block text-sm font-medium text-white/80 mb-1'

export function StudentPortal({ onClose, onSessionChange }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [team, setTeam] = useState<{ name: string; members: string } | null>(null)
  const [view, setView] = useState<'loading' | 'signin' | 'team-setup' | 'dashboard'>('loading')
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  // Team setup state
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [teamName, setTeamName] = useState('')
  const [members, setMembers] = useState('')
  const [saving, setSaving] = useState(false)
  const [existingTeams, setExistingTeams] = useState<{ name: string; members: string }[]>([])

  // Watch auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null)
        setTeam(null)
        setView('signin')
        onSessionChange(null)
        return
      }
      setUser(u)
      const snap = await getDoc(doc(db, 'teams', u.uid))
      if (snap.exists()) {
        const t = snap.data() as { name: string; members: string }
        setTeam(t)
        setView('dashboard')
        onSessionChange({ user: u, team: t })
      } else {
        setTeam(null)
        setView('team-setup')
        onSessionChange({ user: u, team: null })
        loadExistingTeams()
      }
    })
    return unsub
  }, [])

  async function loadExistingTeams() {
    // Gather team names from problems that have been claimed
    const snap = await getDocs(collection(db, 'problems'))
    const seen = new Map<string, { name: string; members: string }>()
    snap.docs.forEach(d => {
      const name = d.data().claimedByTeam
      if (name && !seen.has(name)) seen.set(name, { name, members: '' })
    })
    // Also check teams collection
    const teamsSnap = await getDocs(collection(db, 'teams'))
    teamsSnap.docs.forEach(d => {
      const t = d.data() as { name: string; members: string }
      if (t.name && !seen.has(t.name)) seen.set(t.name, t)
    })
    setExistingTeams(Array.from(seen.values()))
  }

  async function handleSignIn() {
    setSigningIn(true)
    setError('')
    // If the browser blocks the popup and Firebase falls back to a redirect,
    // the page will reload. Set a flag so App.tsx can reopen the portal.
    sessionStorage.setItem('reopenStudentPortal', '1')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      sessionStorage.removeItem('reopenStudentPortal')
    } catch (e: unknown) {
      sessionStorage.removeItem('reopenStudentPortal')
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('popup-closed') ? 'Sign-in cancelled.' : 'Sign-in failed. Try again.')
    } finally {
      setSigningIn(false)
    }
  }

  async function handleSignOut() {
    await signOut(auth)
    onClose()
  }

  async function handleCreateTeam() {
    if (!teamName.trim() || !user) return
    setSaving(true)
    const t = { name: teamName.trim(), members: members.trim() }
    await setDoc(doc(db, 'teams', user.uid), t)
    setTeam(t)
    setView('dashboard')
    onSessionChange({ user, team: t })
    setSaving(false)
  }

  async function handleJoinTeam(t: { name: string; members: string }) {
    if (!user) return
    setSaving(true)
    await setDoc(doc(db, 'teams', user.uid), t)
    setTeam(t)
    setView('dashboard')
    onSessionChange({ user, team: t })
    setSaving(false)
  }

  async function handleLeaveTeam() {
    if (!user) return
    await deleteDoc(doc(db, 'teams', user.uid))
    setTeam(null)
    setView('team-setup')
    onSessionChange({ user, team: null })
    loadExistingTeams()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pt-20" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎓</span>
            <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Student Portal
            </h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── LOADING ── */}
          {view === 'loading' && (
            <div className="text-center py-12 text-white/40 text-sm">Loading…</div>
          )}

          {/* ── SIGN IN ── */}
          {view === 'signin' && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              <div className="text-5xl">🔐</div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Sign in to get started
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">
                  Use your school Google account to join a team, claim problems, and track your progress.
                </p>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="flex items-center gap-3 px-6 py-3 rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] text-white text-sm font-medium transition-colors disabled:opacity-50 w-full justify-center"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          {view === 'team-setup' && user && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="text-white/40 text-xs mb-3">
                  Signed in as <span className="text-white/70">{user.email}</span>
                </p>
                <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Set up your team
                </h3>
                <p className="text-white/45 text-sm">Create a new team or join an existing one.</p>
              </div>

              {/* Mode toggle */}
              <div className="flex gap-2">
                {(['create', 'join'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      mode === m
                        ? 'bg-primary border-primary text-white'
                        : 'border-white/[0.15] text-white/50 hover:text-white/80 hover:border-white/25'
                    }`}
                  >
                    {m === 'create' ? '➕ Create Team' : '👥 Join Team'}
                  </button>
                ))}
              </div>

              {mode === 'create' && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelCls}>Team Name <span className="text-red-400">*</span></label>
                    <input
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder='e.g., "Studio Six"'
                      maxLength={40}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Team Members <span className="text-white/30 font-normal">(optional)</span></label>
                    <input
                      value={members}
                      onChange={e => setMembers(e.target.value)}
                      placeholder='e.g., "Alex, Jamie, Sam"'
                      className={inputCls}
                    />
                  </div>
                  <button
                    onClick={handleCreateTeam}
                    disabled={saving || !teamName.trim()}
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Creating…' : 'Create Team →'}
                  </button>
                </div>
              )}

              {mode === 'join' && (
                <div className="flex flex-col gap-2">
                  {existingTeams.length === 0 ? (
                    <p className="text-white/35 text-sm text-center py-4">No existing teams found yet. Create a new one!</p>
                  ) : (
                    existingTeams.map(t => (
                      <button
                        key={t.name}
                        onClick={() => handleJoinTeam(t)}
                        disabled={saving}
                        className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-left transition-all disabled:opacity-50"
                      >
                        <div>
                          <p className="text-white text-sm font-medium">{t.name}</p>
                          {t.members && <p className="text-white/40 text-xs">{t.members}</p>}
                        </div>
                        <span className="text-white/30 text-sm">Join →</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              <button onClick={handleSignOut} className="text-xs text-white/30 hover:text-white/60 transition-colors text-center">
                Sign out
              </button>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {view === 'dashboard' && user && team && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col items-center text-center gap-2 py-4">
                <div className="text-4xl">👥</div>
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {team.name}
                </h3>
                {team.members && <p className="text-white/45 text-sm">{team.members}</p>}
                <p className="text-white/35 text-xs">{user.email}</p>
              </div>

              <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/60 text-center">
                You're all set! Close this and click <span className="text-white/80 font-medium">"Claim"</span> on any available problem in the gallery.
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleLeaveTeam}
                  className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/45 text-sm hover:text-white/70 hover:border-white/25 transition-colors"
                >
                  Leave Team
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 rounded-xl border border-white/[0.12] text-white/45 text-sm hover:text-white/70 hover:border-white/25 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
