import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { hasVoted, recordVote, removeVote } from '@/lib/votes'
import { STATUS_LABELS, STATUS_COLORS, SEVERITY_EMOJI, SEVERITY_LABEL } from '@/lib/problemMeta'

export interface Problem {
  id: string
  title: string
  description: string
  status?: 'new' | 'claimed' | 'inprogress' | 'solved'
  severity?: number
  categories?: string[]
  disciplines?: string[]
  submitterName?: string
  submitterRole?: string
  submitterContact?: string
  claimedByTeam?: string
  upvotes?: number
  comments?: unknown[]
  photos?: string[]
  createdAt?: number
  affects?: string
  where?: string
  frequency?: string
  duration?: string
  workaround?: string
  priorAttempts?: string
  constraints?: string
  internalNotes?: Array<{ author: string; text: string; createdAt: number }>
}

interface Comment {
  text: string
  author: string
  createdAt: number
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'A few times a week', monthly: 'A few times a month',
  occasionally: 'Occasionally', seasonal: 'Seasonally', once: 'One-time event',
}

interface Props {
  problem: Problem
  onClose: () => void
  isSuperUser?: boolean
  currentTeam?: { name: string; members: string; joinedAt?: number } | null
  user?: import('firebase/auth').User | null
  onClaim?: (id: string) => void
  onEdit?: (p: Problem) => void
  onDelete?: (id: string) => void
  onUnclaim?: (id: string) => void
}

export function ProblemDetail({ problem, onClose, isSuperUser, currentTeam, user, onClaim, onEdit, onDelete, onUnclaim }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [voted, setVoted] = useState(() => hasVoted(problem.id))
  const [commentText, setCommentText] = useState('')
  const [anonName, setAnonName] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [noteText, setNoteText] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [noteError, setNoteError] = useState('')

  // Upvotes, comments, and notes render straight from the live problem prop —
  // our own writes appear immediately via Firestore latency compensation, and
  // other users' updates flow in through the parent's snapshot listener.
  const upvotes = problem.upvotes || 0
  const comments = ((problem.comments || []) as unknown[]).filter((c): c is Comment =>
    typeof c === 'object' && c !== null && 'text' in c
  )
  const notes = problem.internalNotes ?? []

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowLeft') setPhotoIndex(i => (i - 1 + photos.length) % photos.length)
      else if (e.key === 'ArrowRight') setPhotoIndex(i => (i + 1) % photos.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen])

  const status = problem.status || 'new'
  const canSeeNotes = isSuperUser || (!!currentTeam && currentTeam.name === problem.claimedByTeam)
  const canAddNote = canSeeNotes && (isSuperUser || status !== 'solved')

  async function handleUpvote() {
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

  async function handleComment() {
    if (submittingComment || !commentText.trim() || !anonName.trim()) return
    const author = anonName.trim()
    setSubmittingComment(true)
    setCommentError('')
    const c: Comment = { text: commentText.trim(), author, createdAt: Date.now() }
    try {
      await updateDoc(doc(db, 'problems', problem.id), { comments: arrayUnion(c) })
      setCommentText('')
    } catch {
      setCommentError('Failed to post comment. Please try again.')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleAddNote() {
    if (submittingNote || !canAddNote || !noteText.trim() || !user) return
    setSubmittingNote(true)
    setNoteError('')
    const newNote = {
      author: user.displayName || user.email || 'Unknown',
      text: noteText.trim(),
      createdAt: Date.now(),
    }
    try {
      // arrayUnion appends atomically — a full-array replace would silently drop
      // a note written by a teammate between this modal opening and saving.
      await updateDoc(doc(db, 'problems', problem.id), { internalNotes: arrayUnion(newNote) })
      setNoteText('')
    } catch {
      setNoteError('Failed to save note. Please try again.')
    } finally {
      setSubmittingNote(false)
    }
  }

  function timeAgo(ts: number) {
    const s = Math.floor((Date.now() - ts) / 1000)
    if (s < 60) return 'just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  const photos = problem.photos || []

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />

      <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          layoutId={`problem-card-${problem.id}`}
          className="w-full max-w-2xl bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden pointer-events-auto"
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Photos */}
          {photos.length > 0 && (
            <div className="relative flex-shrink-0 bg-black/30">
              <img
                src={photos[photoIndex]}
                alt={problem.title}
                className="w-full max-h-72 object-contain cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
              />
              {photos.length > 1 && (
                <>
                  {/* Side click zones — wide nav targets; the center of the photo still opens the zoom view */}
                  <div
                    className="absolute inset-y-0 left-0 w-1/4 cursor-pointer flex items-center pl-2 group"
                    onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                  >
                    <div className="w-8 h-8 rounded-full bg-black/50 text-white text-lg flex items-center justify-center group-hover:bg-black/70 transition-colors pointer-events-none">‹</div>
                  </div>
                  <div
                    className="absolute inset-y-0 right-0 w-1/4 cursor-pointer flex items-center justify-end pr-2 group"
                    onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                  >
                    <div className="w-8 h-8 rounded-full bg-black/50 text-white text-lg flex items-center justify-center group-hover:bg-black/70 transition-colors pointer-events-none">›</div>
                  </div>
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full pointer-events-none">
                    {photoIndex + 1} / {photos.length}
                  </div>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? 'bg-white' : 'bg-white/30'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Scrollable body */}
          <div className="overflow-y-auto overscroll-y-contain flex-1 px-6 py-5 space-y-5">

            {/* Title + badges */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-[0.7rem] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                {problem.severity ? (
                  <span className="text-[0.7rem] text-white/90 px-2 py-0.5 rounded-full bg-white/[0.12] border border-white/[0.28]">
                    {SEVERITY_EMOJI[problem.severity]} {SEVERITY_LABEL[problem.severity]}
                  </span>
                ) : null}
                {problem.claimedByTeam && (
                  <span className="text-[0.7rem] text-white/90 px-2 py-0.5 rounded-full bg-white/[0.12] border border-white/[0.28]">
                    👥 {problem.claimedByTeam}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {problem.title}
              </h2>
              <p className="text-white/60 text-xs mt-1">
                Submitted by {problem.submitterName || 'Anonymous'}
                {problem.submitterRole && ` · ${problem.submitterRole}`}
              </p>
            </div>

            {/* Super user controls */}
            {isSuperUser && (
              <div className="bg-amber-500/[0.07] border border-amber-500/25 rounded-xl px-4 py-3">
                <p className="text-amber-400/70 text-[0.65rem] font-semibold uppercase tracking-wider mb-2">🛡 Super User Controls</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onEdit?.(problem)}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/70 text-xs font-medium hover:text-white hover:bg-white/[0.10] transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  {problem.claimedByTeam && (
                    <button
                      onClick={() => onUnclaim?.(problem.id)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-white/70 text-xs font-medium hover:text-white hover:bg-white/[0.10] transition-colors"
                    >
                      ✕ Unclaim
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${problem.title}"? This cannot be undone.`)) onDelete?.(problem.id)
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">Description</h3>
              <p className="text-white/75 text-sm leading-relaxed">{problem.description}</p>
            </div>

            {/* Detail grid */}
            {(problem.affects || problem.where || problem.frequency || problem.duration) && (
              <div className="grid grid-cols-2 gap-3">
                {problem.affects && <DetailField label="Who it affects" value={problem.affects} />}
                {problem.where && <DetailField label="Where" value={problem.where} />}
                {problem.frequency && <DetailField label="How often" value={FREQUENCY_LABELS[problem.frequency] || problem.frequency} />}
                {problem.duration && <DetailField label="How long" value={problem.duration} />}
              </div>
            )}

            {problem.workaround && <DetailField label="Current workaround" value={problem.workaround} />}
            {problem.priorAttempts && <DetailField label="Prior attempts" value={problem.priorAttempts} />}
            {problem.constraints && <DetailField label="Known constraints" value={problem.constraints} />}

            {/* Tags */}
            {((problem.categories?.length || 0) > 0 || (problem.disciplines?.length || 0) > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {problem.categories?.map(c => (
                  <span key={c} className="text-[0.7rem] px-2 py-0.5 rounded-full bg-white/[0.12] border border-white/[0.28] text-white/90 capitalize">{c}</span>
                ))}
                {problem.disciplines?.map(d => (
                  <span key={d} className="text-[0.7rem] px-2 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/50 text-indigo-200 capitalize">{d.replace(/-/g, ' ')}</span>
                ))}
              </div>
            )}

            {/* Upvote + Claim */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUpvote}
                disabled={voted}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  voted
                    ? 'bg-emerald-500/25 border-emerald-500/50 text-white cursor-default'
                    : 'border-white/[0.25] text-white/75 hover:text-white hover:border-white/40'
                } disabled:opacity-40`}
              >
                ▲ {upvotes} {voted ? 'Upvoted' : 'Upvote'}
              </button>
            </div>

            {/* Internal notes — visible to claiming team or super user */}
            {canSeeNotes && (
              <div>
                <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                  Team Notes{' '}
                  <span className="normal-case font-normal text-white/50">
                    {isSuperUser ? '(visible to you as a super user)' : '(only visible to your team)'}
                  </span>
                </h3>
                {notes.length === 0 && (
                  <p className="text-white/55 text-sm mb-3">No notes yet.</p>
                )}
                <div className="space-y-2 mb-3">
                  {notes.map((n, i) => (
                    <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5">
                      <p className="text-white/75 text-sm leading-relaxed">{n.text}</p>
                      <p className="text-white/55 text-xs mt-1">{n.author} · {timeAgo(n.createdAt)}</p>
                    </div>
                  ))}
                </div>
                {noteError && <p className="text-red-400 text-xs mb-2">{noteError}</p>}
                {canAddNote ? (
                  <div className="flex gap-2">
                    <input
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                      placeholder="Add a team note…"
                      className="flex-1 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary transition-colors"
                    />
                    <button
                      onClick={handleAddNote}
                      disabled={submittingNote || !noteText.trim()}
                      className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
                    >
                      {submittingNote ? 'Saving…' : 'Add'}
                    </button>
                  </div>
                ) : (
                  <p className="text-white/55 text-xs">Notes are locked once a problem is solved.</p>
                )}
              </div>
            )}

            {/* Public comments */}
            <div>
              <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">
                Comments ({comments.length})
              </h3>
              {comments.length === 0 && (
                <p className="text-white/55 text-sm">No comments yet.</p>
              )}
              <div className="space-y-3 mb-4">
                {comments.map((c, i) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5">
                    <p className="text-white/75 text-sm leading-relaxed">{c.text}</p>
                    <p className="text-white/55 text-xs mt-1">{c.author}</p>
                  </div>
                ))}
              </div>
              {commentError && <p className="text-red-400 text-xs mb-2">{commentError}</p>}
              <div className="flex flex-col gap-2">
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
                <div className="flex gap-2">
                  <input
                    value={anonName}
                    onChange={e => setAnonName(e.target.value)}
                    placeholder="Your name"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleComment}
                    disabled={submittingComment || !commentText.trim() || !anonName.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    {submittingComment ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-white/65 hover:text-white transition-colors">
              Close
            </button>
            {onClaim && (problem.status || 'new') === 'new' && (
              currentTeam ? (
                <button
                  onClick={() => { onClaim(problem.id); onClose() }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  🙋 Claim for {currentTeam.name}
                </button>
              ) : (
                <span className="text-white/50 text-xs">Join a team to claim this problem.</span>
              )
            )}
          </div>
        </motion.div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-[500] bg-black/90 flex items-center justify-center">
          {/* Backdrop — click anywhere outside the image to close */}
          <div className="absolute inset-0 cursor-zoom-out" onClick={() => setLightboxOpen(false)} />

          {/* Wrapper shrink-wraps to the image so the side zones cover exactly the photo */}
          <div className="relative">
            <img
              src={photos[photoIndex]}
              alt={problem.title}
              className={`max-w-[92vw] max-h-[92vh] object-contain select-none ${photos.length === 1 ? 'cursor-zoom-out' : ''}`}
              onClick={photos.length === 1 ? () => setLightboxOpen(false) : undefined}
            />
            {/* Image halves navigate (multiple photos) */}
            {photos.length > 1 && (
              <>
                <div
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                />
                <div
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                />
              </>
            )}
          </div>

          {/* Arrows — visible affordance at screen edges, also clickable */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center hover:bg-white/20 transition-colors"
                onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
              >‹</button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white text-2xl flex items-center justify-center hover:bg-white/20 transition-colors"
                onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
              >›</button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                {photoIndex + 1} / {photos.length}
              </div>
            </>
          )}

          {/* Close button */}
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-lg"
            onClick={() => setLightboxOpen(false)}
          >✕</button>
        </div>
      )}
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
      <p className="text-white/60 text-[0.65rem] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white/75 text-sm">{value}</p>
    </div>
  )
}
