import { useState, useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Problem } from '@/components/ProblemDetail'

const CATEGORIES = ['space', 'systems', 'process', 'communication', 'safety', 'environment', 'technology', 'other']
const DISCIPLINES = ['product-design', 'graphic-design', 'interior-design', 'architecture', 'engineering', 'computer-science', 'business', 'other']

const inputCls = 'w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary focus:bg-white/[0.09] transition-colors'
const labelCls = 'block text-sm font-medium text-white/80 mb-1'

export function EditProblemModal({ problem, onClose, onSaved }: {
  problem: Problem
  onClose: () => void
  onSaved: (updated: Problem) => void
}) {
  const [title, setTitle] = useState(problem.title)
  const [description, setDescription] = useState(problem.description)
  const [affects, setAffects] = useState(problem.affects ?? '')
  const [where, setWhere] = useState(problem.where ?? '')
  const [severity, setSeverity] = useState(problem.severity ?? 3)
  const [categories, setCategories] = useState<string[]>(problem.categories ?? [])
  const [disciplines, setDisciplines] = useState<string[]>(problem.disciplines ?? [])
  const [submitterName, setSubmitterName] = useState(problem.submitterName ?? '')
  const [submitterRole, setSubmitterRole] = useState(problem.submitterRole ?? '')
  const [submitterContact, setSubmitterContact] = useState(problem.submitterContact ?? '')
  const [workaround, setWorkaround] = useState(problem.workaround ?? '')
  const [constraints, setConstraints] = useState(problem.constraints ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggleTag(list: string[], setList: (v: string[]) => void, val: string) {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val])
  }

  async function handleSave() {
    if (!title.trim() || !description.trim()) { setError('Title and description are required.'); return }
    setSaving(true)
    setError('')
    const updates: Partial<Problem> = {
      title: title.trim(),
      description: description.trim(),
      affects: affects.trim() || undefined,
      where: where.trim() || undefined,
      severity,
      categories,
      disciplines,
      submitterName: submitterName.trim() || undefined,
      submitterRole: submitterRole.trim() || undefined,
      submitterContact: submitterContact.trim() || undefined,
      workaround: workaround.trim() || undefined,
      constraints: constraints.trim() || undefined,
    }
    try {
      await updateDoc(doc(db, 'problems', problem.id), updates as Record<string, unknown>)
      onSaved({ ...problem, ...updates })
    } catch (e) {
      console.error('editProblem error:', e)
      setError('Failed to save. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const SEVERITY_OPTS = [
    { v: 1, emoji: '😀', label: 'Minor' },
    { v: 2, emoji: '😕', label: 'Moderate' },
    { v: 3, emoji: '😟', label: 'Painful' },
    { v: 4, emoji: '😫', label: 'Serious' },
    { v: 5, emoji: '😱', label: 'Critical' },
  ]

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="font-bold text-white text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>✏️ Edit Problem</h2>
            <p className="text-white/40 text-xs mt-0.5">Super user edit — all fields unlocked</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/70 text-lg transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div>
            <label className={labelCls}>Title <span className="text-red-400">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Description <span className="text-red-400">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
              className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Who it affects</label>
              <input value={affects} onChange={e => setAffects(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Where</label>
              <input value={where} onChange={e => setWhere(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Severity</label>
            <div className="flex gap-2">
              {SEVERITY_OPTS.map(o => (
                <button key={o.v} onClick={() => setSeverity(o.v)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${severity === o.v ? 'bg-primary/20 border-primary text-white' : 'border-white/[0.12] text-white/40 hover:text-white/70'}`}>
                  {o.emoji}<br />{o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Categories</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => toggleTag(categories, setCategories, c)}
                  className={`px-2.5 py-1 rounded-full text-xs border capitalize transition-all ${categories.includes(c) ? 'bg-primary/20 border-primary/50 text-primary' : 'border-white/[0.12] text-white/40 hover:text-white/70'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Disciplines</label>
            <div className="flex flex-wrap gap-1.5">
              {DISCIPLINES.map(d => (
                <button key={d} onClick={() => toggleTag(disciplines, setDisciplines, d)}
                  className={`px-2.5 py-1 rounded-full text-xs border capitalize transition-all ${disciplines.includes(d) ? 'bg-primary/20 border-primary/50 text-primary' : 'border-white/[0.12] text-white/40 hover:text-white/70'}`}>
                  {d.replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Submitter name</label>
              <input value={submitterName} onChange={e => setSubmitterName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Submitter role</label>
              <input value={submitterRole} onChange={e => setSubmitterRole(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Submitter contact</label>
            <input value={submitterContact} onChange={e => setSubmitterContact(e.target.value)} className={inputCls} placeholder="email or phone" />
          </div>

          <div>
            <label className={labelCls}>Current workaround</label>
            <textarea value={workaround} onChange={e => setWorkaround(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <label className={labelCls}>Known constraints</label>
            <textarea value={constraints} onChange={e => setConstraints(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
          <button onClick={onClose} className="text-sm text-white/40 hover:text-white/70 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !title.trim() || !description.trim()}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
