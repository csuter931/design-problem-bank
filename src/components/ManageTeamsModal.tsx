import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, query, where, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Problem } from '@/components/ProblemDetail'

interface TeamDoc {
  docId: string
  name: string
  members: string
  joinedAt?: number
}

interface TeamGroup {
  name: string
  memberCount: number
  activeProblems: number
}

export function ManageTeamsModal({ onClose, problems }: {
  onClose: () => void
  problems: Problem[]
}) {
  const [teams, setTeams] = useState<TeamGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingTeam, setDeletingTeam] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => { loadTeams() }, [])

  async function loadTeams() {
    setLoading(true)
    setError('')
    try {
      const snap = await getDocs(collection(db, 'teams'))
      const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() } as TeamDoc))
      const byName = new Map<string, number>()
      docs.forEach(d => {
        if (d.name) byName.set(d.name, (byName.get(d.name) ?? 0) + 1)
      })
      const groups: TeamGroup[] = Array.from(byName.entries()).map(([name, memberCount]) => ({
        name,
        memberCount,
        activeProblems: problems.filter(p =>
          p.claimedByTeam === name && (p.status === 'claimed' || p.status === 'inprogress')
        ).length,
      }))
      setTeams(groups)
    } catch (e) {
      console.error('loadTeams error:', e)
      setError('Failed to load teams.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteTeam(teamName: string) {
    if (!confirm(`Delete team "${teamName}"? Their claimed problems will return to Available.`)) return
    setDeletingTeam(teamName)
    try {
      // Reset claimed problems
      const claimed = problems.filter(p =>
        p.claimedByTeam === teamName && (p.status === 'claimed' || p.status === 'inprogress')
      )
      await Promise.all(claimed.map(p =>
        updateDoc(doc(db, 'problems', p.id), {
          status: 'new',
          claimedByTeam: deleteField(),
          claimedByUser: deleteField(),
          claimedAt: deleteField(),
        })
      ))
      // Delete all team docs with this name
      const teamSnap = await getDocs(query(collection(db, 'teams'), where('name', '==', teamName)))
      await Promise.all(teamSnap.docs.map(d => deleteDoc(d.ref)))
      setTeams(prev => prev.filter(t => t.name !== teamName))
    } catch (e) {
      console.error('deleteTeam error:', e)
      setError(`Failed to delete team "${teamName}".`)
    } finally {
      setDeletingTeam(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">

        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-bold text-white text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>👥 Manage Teams</h2>
            <p className="text-white/40 text-xs mt-0.5">Deleting a team releases their claimed problems back to Available.</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          {loading ? (
            <p className="text-white/30 text-sm text-center py-8">Loading teams…</p>
          ) : teams.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-8">No teams found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {teams.map(t => (
                <div key={t.name} className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                  <div>
                    <p className="text-white text-sm font-semibold">{t.name}</p>
                    <p className="text-white/40 text-xs">
                      {t.memberCount} member{t.memberCount !== 1 ? 's' : ''}
                      {t.activeProblems > 0 && ` · ${t.activeProblems} active problem${t.activeProblems !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteTeam(t.name)}
                    disabled={deletingTeam === t.name}
                    className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors disabled:opacity-40"
                  >
                    {deletingTeam === t.name ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">Close</button>
        </div>
      </div>
    </div>
  )
}
