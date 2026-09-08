import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion, MotionConfig, useSpring, useTransform, type Variants } from 'framer-motion'
import { collection, orderBy, query, where, onSnapshot, doc, updateDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { hasVoted, recordVote, removeVote } from '@/lib/votes'
import { SubmitWizard } from '@/components/SubmitWizard'
import { ProblemDetail, type Problem } from '@/components/ProblemDetail'
import { DawsonLogo } from '@/components/DawsonLogo'
import { PhotoPlaceholder } from '@/components/PhotoPlaceholder'
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_EMOJI, SEVERITY_LABEL } from '@/lib/problemMeta'

// The Student Dashboard is its own page (src/dashboard.tsx → /dashboard/);
// its URL is distributed to students directly, so the gallery has no link to it.

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🟢 New', value: 'new' },
  { label: '🟡 Claimed', value: 'claimed' },
  { label: '🔵 In Progress', value: 'inprogress' },
  { label: '🟣 Solved', value: 'solved' },
]

// ── Motion vocabulary ────────────────────────────────────
// One spring for every direct-manipulation gesture (card lift, button press) so
// the whole page reacts with the same weight. Layout reflow — cards settling
// into new slots after a filter change — uses a duration curve instead, because
// a spring on a dozen simultaneously-moving cards reads as wobble.
const SPRING = { type: 'spring', stiffness: 380, damping: 30, mass: 0.6 } as const
const LAYOUT_EASE = { duration: 0.32, ease: [0.4, 0, 0.2, 1] } as const

const GRID_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.03 } },
}

const CARD_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] } },
}

// ── AnimatedNumber ───────────────────────────────────────
// Counts up on mount and eases between values afterwards, so the header stats
// acknowledge live Firestore updates instead of snapping.
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 70, damping: 18 })
  const display = useTransform(spring, v => Math.round(v).toString())
  useEffect(() => { spring.set(value) }, [value, spring])
  return <motion.span className={className}>{display}</motion.span>
}

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
      {/* The lift and the press live on framer-motion (springs); tint and shadow
          stay on CSS. Note the explicit transition-[…] property list —
          `transition-colors` does not cover box-shadow or transform, so a
          shadow or lift listed under it snaps while the tint fades. */}
      <motion.div
        layoutId={`problem-card-${problem.id}`}
        layout
        variants={CARD_VARIANTS}
        whileHover={{ y: -8 }}
        whileTap={{ scale: 0.985 }}
        onClick={() => onSelect(problem)}
        className="bg-white/[0.05] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer shadow-[inset_0_1px_0_rgb(255_255_255/0.07)] hover:bg-white/[0.08] hover:border-white/[0.16] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_22px_45px_-12px_rgb(0_0_0/0.55)] transition-[background-color,border-color,box-shadow] duration-300 flex flex-col"
        transition={{ layout: LAYOUT_EASE, y: SPRING, scale: SPRING }}
      >
        <div className="h-[160px] overflow-hidden flex-shrink-0">
          {problem.photos?.[0] ? (
            <img src={problem.photos[0]} alt={problem.title} className="w-full h-full object-cover" />
          ) : (
            <PhotoPlaceholder id={problem.id} bulbClass="w-11 h-11" />
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
          <h3 className="font-bold text-white text-base leading-snug mb-2 font-display">
            {problem.title}
          </h3>
          <p className="text-white/65 text-xs leading-relaxed flex-1 line-clamp-3 mb-4">
            {problem.description}
          </p>
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
            <span className="text-white/60 text-xs">by {problem.submitterName || 'Anonymous'}</span>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleUpvote}
                whileTap={voted ? undefined : { scale: 0.9 }}
                transition={SPRING}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                  voted
                    ? 'text-white bg-dawson-seagreen/30 border border-dawson-seagreen/40 cursor-default'
                    : 'text-white/60 hover:text-white/80 hover:bg-white/[0.06]'
                }`}
              >
                ▲ {problem.upvotes || 0}
              </motion.button>
              <motion.button
                onClick={handleCommentClick}
                whileTap={{ scale: 0.9 }}
                transition={SPRING}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white/60 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
              >
                💬 {(problem.comments || []).length}
              </motion.button>
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
        className="relative w-full max-w-sm bg-dawson-navy-800 border border-white/[0.12] rounded-2xl shadow-2xl p-4 flex flex-col gap-3"
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
        <motion.button onClick={handlePost} disabled={submitting || !text.trim() || !name.trim()}
          whileTap={{ scale: 0.98 }} transition={SPRING}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
          {submitting ? 'Posting…' : 'Post Comment'}
        </motion.button>
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
  const [loadError, setLoadError] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Load from Firestore in real-time. Only approved problems are public — the
  // rules reject any query that doesn't carry this where clause, and the
  // approved+createdAt pair is backed by a composite index (firestore.indexes.json).
  useEffect(() => {
    const q = query(collection(db, 'problems'), where('approved', '==', true), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const firestoreProblems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Problem))
      setProblems(firestoreProblems)
      setLoadError(false)
      setLoading(false)
    }, (err) => {
      // A permission or index error must look like a failure, not an empty
      // bank — otherwise a rules mistake renders a convincing "No problems yet".
      console.error('problems listener error:', err)
      setLoadError(true)
      setLoading(false)
    })
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

  return (
    // reducedMotion="user" honours the OS "reduce motion" setting for every
    // motion component below — transforms are dropped, opacity still fades.
    <MotionConfig reducedMotion="user">
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
        {/* A Royal Blue ramp top-to-bottom rather than one flat fill, so the
            surface has a direction and the glows have something to sit in. */}
        <section className="relative bg-gradient-to-b from-dawson-navy-900 via-dawson-navy-900 to-dawson-navy-800 text-white px-6 pt-10 pb-16 overflow-hidden">
          <div className="pointer-events-none absolute -top-[20%] -left-[15%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgb(var(--dawson-blue)/0.55)_0%,transparent_70%)]" />
          <div className="pointer-events-none absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgb(var(--dawson-seagreen)/0.30)_0%,transparent_70%)]" />
          {/* Vignette: settles the corners so the headline is the brightest
              thing on the page. Above the glows, below the z-10 content. */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_30%,rgb(0_0_0/0.38)_100%)]" />
          {/* Shadow gathering at the hero's bottom edge, falling into the
              reveal joint drawn by the gallery section below. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-[linear-gradient(180deg,transparent_0%,rgb(0_8_26/0.5)_100%)]" />

          {/* Top nav row */}
          <div className="relative z-10 max-w-5xl mx-auto flex items-center justify-between mb-14">
            <div className="flex items-center gap-3">
              <DawsonLogo />
              <div>
                <h1 className="font-bold text-lg tracking-tight text-white leading-none font-display">
                  Design Problem Bank
                </h1>
                <p className="text-xs text-white/65 mt-0.5">Dawson School · Real problems. Creative solutions.</p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm text-white/65">
              <span><AnimatedNumber value={problems.length} className="text-white font-semibold" /> Problems</span>
              <span><AnimatedNumber value={problems.filter(p => !p.status || p.status === 'new').length} className="text-dawson-seagreen font-semibold" /> Available</span>
              <span><AnimatedNumber value={problems.filter(p => p.status === 'solved').length} className="text-purple-300 font-semibold" /> Solved</span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <h2 className="text-5xl font-extrabold tracking-tight leading-[1.15] mb-5 font-display">
              Got a problem that needs solving?
            </h2>
            <p className="text-lg text-white/65 leading-relaxed mb-10 max-w-lg mx-auto">
              Our design students tackle real-world challenges from the community.
              Submit something broken, frustrating, or overdue for a better solution —
              a student team may choose it as their next project.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <div className="bg-white/[0.12] rounded-2xl p-[3px]">
                <motion.button onClick={() => setWizardOpen(true)}
                  whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}
                  className="text-base px-7 py-[0.7rem] rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium">
                  📝 Submit a Problem
                </motion.button>
              </div>
              <motion.button
                onClick={() => document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' })}
                whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} transition={SPRING}
                className="text-base px-7 py-[0.7rem] rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
              >
                Browse problems ↓
              </motion.button>
            </div>
          </div>
        </section>

        {/* ── FILTER + GALLERY ───────────────────────────────── */}
        {/* The gallery is a visibly separate plane from the hero — that break is
            deliberate. It is built as an architectural reveal joint rather than
            a drawn line: a dark recessed gap, then the lit top lip of the
            gallery panel, then light falling away from that lip. Read together
            with the hero's bottom shadow (above) the two sections behave like
            two physical panels meeting over a shadow gap, which is why the lip
            runs nearly edge to edge instead of fading out at the centre — a
            built edge does not taper. Shadow colour is Royal Blue pushed dark,
            never neutral black, so it stays in the blue system. */}
        <section id="gallery" className="relative bg-gradient-to-b from-dawson-navy-700 via-dawson-navy-700 to-dawson-navy-800">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(180deg,rgb(0_8_26/0.85)_0%,rgb(0_8_26/0.3)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-[3px] h-px bg-[linear-gradient(90deg,transparent_0%,rgb(123_176_212/0.7)_6%,rgb(123_176_212/0.85)_50%,rgb(123_176_212/0.7)_94%,transparent_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-[4px] h-20 bg-[linear-gradient(180deg,rgb(123_176_212/0.08)_0%,transparent_100%)]" />

          {/* Filter bar */}
          <div className="relative max-w-7xl mx-auto px-6 py-5 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 text-sm">🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search problems..."
                className="w-full pl-9 pr-4 py-[0.65rem] rounded-xl bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-primary focus:bg-white/10 transition-colors"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`relative px-4 py-[0.4rem] rounded-xl text-sm font-medium border transition-colors ${
                    filter === f.value
                      ? 'border-primary text-white'
                      : 'bg-white/[0.06] border-white/[0.15] text-white/75 hover:bg-white/[0.12] hover:text-white hover:border-white/25'
                  }`}
                >
                  {/* One shared element slides between pills instead of five
                      independent fills switching on and off. */}
                  {filter === f.value && (
                    <motion.span
                      layoutId="filter-pill"
                      className="absolute inset-0 rounded-xl bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{f.label}</span>
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="px-3 py-[0.5rem] rounded-xl bg-dawson-navy-700 border border-white/[0.15] text-white/75 text-sm cursor-pointer"
            >
              <option value="newest" className="bg-dawson-navy-700">Newest first</option>
              <option value="oldest" className="bg-dawson-navy-700">Oldest first</option>
              <option value="upvotes" className="bg-dawson-navy-700">Most upvoted</option>
              <option value="severity" className="bg-dawson-navy-700">Highest severity</option>
            </select>
          </div>

          {/* Grid */}
          <div className="relative max-w-7xl mx-auto px-6 pb-16 pt-2">
            {loading ? (
              <div className="text-center py-16 text-white/40">Loading problems…</div>
            ) : loadError ? (
              <div className="text-center py-16 text-red-300/80">
                Couldn't load problems. Refresh the page to try again.
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-16 text-white/40">
                {problems.length === 0
                  ? 'No problems yet — be the first to submit one.'
                  : 'No problems match your filter.'}
              </div>
            ) : (
              // `layout` on each card (see ProblemCard) makes the survivors of a
              // filter change glide to their new slots rather than the grid
              // redrawing in place.
              <motion.div
                variants={GRID_VARIANTS}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {visible.map(p => <ProblemCard key={p.id} problem={p} onSelect={p => setSelectedId(p.id)} />)}
              </motion.div>
            )}
          </div>

          {/* Build stamp — lets you confirm which version is live */}
          <div className="relative max-w-7xl mx-auto px-6 pb-8 text-center">
            <span className="text-white/25 text-xs">Build {__BUILD_STAMP__}</span>
          </div>

        </section>
      </div>
    </MotionConfig>
  )
}

export default App
