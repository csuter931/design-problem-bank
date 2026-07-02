import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { collection, orderBy, query, onSnapshot, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { hasVoted, recordVote, removeVote } from '@/lib/votes'
import { SubmitWizard } from '@/components/SubmitWizard'
import { ProblemDetail, type Problem } from '@/components/ProblemDetail'
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_EMOJI, SEVERITY_LABEL } from '@/lib/problemMeta'

const StudentDashboard = lazy(() => import('@/components/StudentDashboard').then(m => ({ default: m.StudentDashboard })))

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🟢 New', value: 'new' },
  { label: '🟡 Claimed', value: 'claimed' },
  { label: '🔵 In Progress', value: 'inprogress' },
  { label: '🟣 Solved', value: 'solved' },
]

// ── ProblemCard ──────────────────────────────────────────
function ProblemCard({ problem, onSelect }: {
  problem: Problem
  onSelect: (p: Problem) => void
}) {
  const status = problem.status || 'new'
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.new

  const [voted, setVoted] = useState(() => hasVoted(problem.id))
  const [commentOpen, setCommentOpen] = useState(false)

  // The upvote count renders straight from the live problem prop — Firestore's
  // latency compensation reflects our own increment immediately.
  async function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation()
    if (voted) return
    setVoted(true)
    recordVote(problem.id)
    try {
      await updateDoc(doc(db, 'problems', problem.id), { upvotes: increment(1) })
    } catch {
      setVoted(false)
      removeVote(problem.id)
    }
  }

  function handleCommentClick(e: React.MouseEvent) {
    e.stopPropagation()
    setCommentOpen(true)
  }

  return (
    <>
      <motion.div
        layoutId={`problem-card-${problem.id}`}
        onClick={() => onSelect(problem)}
        className="bg-white/[0.05] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-2 hover:bg-white/[0.08] hover:border-white/[0.16] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-colors duration-300 flex flex-col"
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="h-[160px] bg-white/[0.04] flex items-center justify-center overflow-hidden flex-shrink-0">
          {problem.photos?.[0] ? (
            <img src={problem.photos[0]} alt={problem.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl opacity-20">💡</span>
          )}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`text-[0.7rem] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
              {STATUS_LABELS[status]}
            </span>
            {problem.severity ? (
              <span className="text-[0.7rem] text-white/70 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                {SEVERITY_EMOJI[problem.severity]} {SEVERITY_LABEL[problem.severity]}
              </span>
            ) : null}
            {problem.claimedByTeam && (
              <span className="text-[0.7rem] text-white/70 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                👥 {problem.claimedByTeam}
              </span>
            )}
          </div>
          <h3 className="font-bold text-white text-base leading-snug mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {problem.title}
          </h3>
          <p className="text-white/65 text-xs leading-relaxed flex-1 line-clamp-3 mb-4">
            {problem.description}
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <span className="text-white/60 text-xs">by {problem.submitterName || 'Anonymous'}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpvote}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                  voted
                    ? 'text-white bg-emerald-500/30 border border-emerald-500/40 cursor-default'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                ▲ {problem.upvotes || 0}
              </button>
              <button
                onClick={handleCommentClick}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/60 hover:text-white/80 hover:bg-white/[0.06] transition-all"
              >
                💬 {(problem.comments || []).length}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {commentOpen && (
        <CommentPopover
          problem={problem}
          onClose={() => setCommentOpen(false)}
        />
      )}
    </>
  )
}

// ── CommentPopover ───────────────────────────────────────
type PopoverComment = { text: string; author: string; createdAt: number }

function CommentPopover({ problem, onClose }: { problem: Problem; onClose: () => void }) {
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Derived from the live problem prop — our own arrayUnion write shows up
  // immediately via Firestore latency compensation, as do other users' comments.
  const comments = ((problem.comments || []) as unknown[]).filter(
    (c): c is PopoverComment => typeof c === 'object' && c !== null && 'text' in c
  )
  const nameRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  async function handlePost() {
    if (submitting || !text.trim() || !name.trim()) return
    setSubmitting(true)
    setError('')
    const c: PopoverComment = { text: text.trim(), author: name.trim(), createdAt: Date.now() }
    try {
      await updateDoc(doc(db, 'problems', problem.id), { comments: arrayUnion(c) })
      setText('')
      textRef.current?.focus()
    } catch {
      setError('Failed to post comment. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm bg-[#131926] border border-white/[0.12] rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white text-sm font-semibold leading-snug line-clamp-1">{problem.title}</p>
            <p className="text-white/60 text-xs mt-0.5">Comments ({comments.length})</p>
          </div>
          <button onClick={onClose} className="text-white/55 hover:text-white/80 transition-colors ml-2">✕</button>
        </div>

        {comments.length === 0 ? (
          <p className="text-white/55 text-sm">No comments yet.</p>
        ) : (
          <div className="max-h-56 overflow-y-auto space-y-2 -mr-1 pr-1">
            {comments.map((c, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5">
                <p className="text-white/75 text-sm leading-relaxed">{c.text}</p>
                <p className="text-white/55 text-xs mt-1">{c.author}</p>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-xs">{error}</p>}
        <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name (required)"
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary transition-colors" />
        <input ref={textRef} value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handlePost()}
          placeholder="What do you think?"
          className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary transition-colors" />
        <button onClick={handlePost} disabled={submitting || !text.trim() || !name.trim()}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
          {submitting ? 'Posting…' : 'Post Comment'}
        </button>
      </motion.div>
    </div>
  )
}


// ── App ──────────────────────────────────────────────────
function App() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [view, setView] = useState<'gallery' | 'student'>(() => {
    // Auto-navigate to student dashboard after Google OAuth redirect
    const flag = localStorage.getItem('reopenStudentPortal')
    return flag && (Date.now() - parseInt(flag)) < 5 * 60 * 1000 ? 'student' : 'gallery'
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Consume the OAuth-redirect flag. Clearing it here (not in the state
  // initializer) keeps the initializer pure — StrictMode double-invokes
  // initializers in dev, which would eat the flag before the real render.
  useEffect(() => { localStorage.removeItem('reopenStudentPortal') }, [])

  // Load from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'problems'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const firestoreProblems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Problem))
      setProblems(firestoreProblems)
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [])

  // Filter + search + sort
  const visible = problems
    .filter(p => filter === 'all' || (p.status || 'new') === filter)
    .filter(p => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        p.title.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s) ||
        (p.submitterName || '').toLowerCase().includes(s)
      )
    })
    .sort((a, b) => {
      if (sort === 'upvotes') return (b.upvotes || 0) - (a.upvotes || 0)
      if (sort === 'severity') return (b.severity || 0) - (a.severity || 0)
      if (sort === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0)
      return (b.createdAt || 0) - (a.createdAt || 0)
    })

  // Derive the open modal from the live list so it receives real-time updates
  // (and closes itself if the problem is deleted).
  const selectedProblem = selectedId ? problems.find(p => p.id === selectedId) ?? null : null


  if (view === 'student') {
    return (
      <Suspense fallback={null}>
        <StudentDashboard onBack={() => setView('gallery')} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {wizardOpen && <SubmitWizard onClose={() => setWizardOpen(false)} />}
      <AnimatePresence>
        {selectedProblem && (
          <ProblemDetail
            key={selectedProblem.id}
            problem={selectedProblem}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      {/* ── HERO (contains brand + stats + CTA) ────────────── */}
      <section className="relative bg-[#0b0f1a] text-white px-6 pt-10 pb-16 overflow-hidden">
        <div className="pointer-events-none absolute -top-[20%] -left-[15%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(43,56,150,0.45)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,106,96,0.35)_0%,transparent_70%)]" />

        {/* Top nav row */}
        <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between mb-14">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💡</span>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-none" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Design Problem Bank
              </h1>
              <p className="text-xs text-white/65 mt-0.5">Real problems. Creative solutions.</p>
            </div>
          </div>
          <div className="flex items-center gap-5 text-sm text-white/65">
            <span><span className="text-white font-semibold">{problems.length}</span> Problems</span>
            <span><span className="text-emerald-400 font-semibold">{problems.filter(p => !p.status || p.status === 'new').length}</span> Available</span>
            <span><span className="text-purple-400 font-semibold">{problems.filter(p => p.status === 'solved').length}</span> Solved</span>
            <button
              onClick={() => setView('student')}
              className="px-4 py-1.5 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 transition-colors text-xs"
            >
              🎓 Student Login
            </button>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-5xl font-extrabold tracking-tight leading-[1.15] mb-5" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Got a problem that needs solving?
          </h2>
          <p className="text-lg text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
            Our design students tackle real-world challenges from the community.
            Submit something broken, frustrating, or overdue for a better solution —
            a student team may choose it as their next project.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="bg-white/[0.12] rounded-[14px] p-[3px]">
              <button onClick={() => setWizardOpen(true)} className="text-base px-7 py-[0.7rem] rounded-[11px] bg-primary text-white hover:bg-primary/90 transition-colors font-medium">
                📝 Submit a Problem
              </button>
            </div>
            <button
              onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-base px-7 py-[0.7rem] rounded-[11px] border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
            >
              Browse problems ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── FILTER + CAROUSEL ──────────────────────────────── */}
      <section id="gallery" className="bg-[#141824] border-t border-white/[0.06]">

        {/* Filter bar */}
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search problems..."
              className="w-full pl-9 pr-4 py-[0.65rem] rounded-[11px] bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-primary focus:bg-white/10 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-4 py-[0.4rem] rounded-[11px] text-sm font-medium border transition-all ${
                  filter === f.value
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white/[0.06] border-white/[0.15] text-white/75 hover:bg-white/[0.12] hover:text-white hover:border-white/25'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-[0.5rem] rounded-[11px] bg-[#141824] border border-white/[0.15] text-white/75 text-sm cursor-pointer"
          >
            <option value="newest" className="bg-[#141824]">Newest first</option>
            <option value="oldest" className="bg-[#141824]">Oldest first</option>
            <option value="upvotes" className="bg-[#141824]">Most upvoted</option>
            <option value="severity" className="bg-[#141824]">Highest severity</option>
          </select>
        </div>

        {/* Grid */}
        <div className="max-w-7xl mx-auto px-6 pb-16 pt-2">
          {loading ? (
            <div className="text-center py-16 text-white/40">Loading problems…</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-white/40">No problems match your filter.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {visible.map(p => <ProblemCard key={p.id} problem={p} onSelect={p => setSelectedId(p.id)} />)}
            </div>
          )}
        </div>

      </section>
    </div>
  )
}

export default App
