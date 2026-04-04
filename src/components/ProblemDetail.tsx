import { useState } from 'react'
import { motion } from 'framer-motion'
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { StudentSession } from './StudentPortal'

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
  claimedByTeam?: string
  upvotes?: number
  comments?: Comment[]
  photos?: string[]
  createdAt?: number
  affects?: string
  where?: string
  frequency?: string
  duration?: string
  workaround?: string
  priorAttempts?: string
  constraints?: string
}

interface Comment {
  text: string
  author: string
  createdAt: number
}

const STATUS_LABELS: Record<string, string> = {
  new: 'NEW', claimed: 'CLAIMED', inprogress: 'IN PROGRESS', solved: 'SOLVED',
}
const STATUS_COLORS: Record<string, string> = {
  new:        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  claimed:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  inprogress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  solved:     'bg-purple-500/20 text-purple-300 border-purple-500/30',
}
const SEVERITY_EMOJI = ['', '😀', '😕', '😟', '😫', '😱']
const SEVERITY_LABEL = ['', 'Minor', 'Moderate', 'Painful', 'Serious', 'Critical']
const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily', weekly: 'A few times a week', monthly: 'A few times a month',
  occasionally: 'Occasionally', seasonal: 'Seasonally', once: 'One-time event',
}

interface Props {
  problem: Problem
  session: StudentSession | null
  onClose: () => void
  onClaim: (id: string) => void
}

export function ProblemDetail({ problem, session, onClose, onClaim }: Props) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const [upvotes, setUpvotes] = useState(problem.upvotes || 0)
  const [voted, setVoted] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Comment[]>((problem.comments || []) as Comment[])
  const [submittingComment, setSubmittingComment] = useState(false)

  const status = problem.status || 'new'
  const isSample = problem.id.startsWith('sample-')
  const canClaim = session?.team && status === 'new' && !isSample

  async function handleUpvote() {
    if (voted || isSample) return
    setVoted(true)
    setUpvotes(v => v + 1)
    await updateDoc(doc(db, 'problems', problem.id), { upvotes: increment(1) })
  }

  async function handleComment() {
    if (!commentText.trim() || !session?.user || isSample) return
    setSubmittingComment(true)
    const c: Comment = {
      text: commentText.trim(),
      author: session.user.displayName || session.user.email || 'Student',
      createdAt: Date.now(),
    }
    await updateDoc(doc(db, 'problems', problem.id), { comments: arrayUnion(c) })
    setComments(prev => [...prev, c])
    setCommentText('')
    setSubmittingComment(false)
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

      {/* Modal — shares layoutId with the card for the expand animation */}
      <div className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          layoutId={`problem-card-${problem.id}`}
          className="w-full max-w-2xl bg-[#131926] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden pointer-events-auto"
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Photos */}
          {photos.length > 0 && (
            <div className="relative h-52 bg-white/[0.04] flex-shrink-0 overflow-hidden">
              <img
                src={photos[photoIndex]}
                alt={problem.title}
                className="w-full h-full object-cover"
              />
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? 'bg-white' : 'bg-white/30'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Title + badges */}
            <div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-[0.7rem] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
                  {STATUS_LABELS[status]}
                </span>
                {problem.severity ? (
                  <span className="text-[0.7rem] text-white/50 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                    {SEVERITY_EMOJI[problem.severity]} {SEVERITY_LABEL[problem.severity]}
                  </span>
                ) : null}
                {problem.claimedByTeam && (
                  <span className="text-[0.7rem] text-white/50 px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
                    👥 {problem.claimedByTeam}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white leading-snug" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {problem.title}
              </h2>
              <p className="text-white/35 text-xs mt-1">
                Submitted by {problem.submitterName || 'Anonymous'}
                {problem.submitterRole && ` · ${problem.submitterRole}`}
              </p>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Description</h3>
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
                  <span key={c} className="text-[0.7rem] px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.1] text-white/50 capitalize">{c}</span>
                ))}
                {problem.disciplines?.map(d => (
                  <span key={d} className="text-[0.7rem] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25 text-primary/80 capitalize">{d.replace(/-/g, ' ')}</span>
                ))}
              </div>
            )}

            {/* Upvote + claim */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUpvote}
                disabled={voted || isSample}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
                  voted
                    ? 'bg-primary/20 border-primary/40 text-primary cursor-default'
                    : 'border-white/[0.12] text-white/50 hover:text-white hover:border-white/25'
                } disabled:opacity-40`}
              >
                ▲ {upvotes} {voted ? 'Upvoted' : 'Upvote'}
              </button>
              {canClaim && (
                <button
                  onClick={() => { onClaim(problem.id); onClose() }}
                  className="flex-1 py-2 rounded-xl bg-primary/20 border border-primary/40 text-primary text-sm font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all"
                >
                  🙋 Claim this Problem
                </button>
              )}
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                Comments ({comments.length})
              </h3>
              {comments.length === 0 && (
                <p className="text-white/25 text-sm">No comments yet.</p>
              )}
              <div className="space-y-3 mb-4">
                {comments.map((c, i) => (
                  <div key={i} className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5">
                    <p className="text-white/75 text-sm leading-relaxed">{c.text}</p>
                    <p className="text-white/30 text-xs mt-1">{c.author}</p>
                  </div>
                ))}
              </div>
              {session?.user && !isSample ? (
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleComment()}
                    placeholder="Add a comment…"
                    className="flex-1 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.12] text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={handleComment}
                    disabled={submittingComment || !commentText.trim()}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    Post
                  </button>
                </div>
              ) : (
                !isSample && <p className="text-white/25 text-xs">Sign in to leave a comment.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.08] flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm text-white/40 hover:text-white/70 transition-colors">
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5">
      <p className="text-white/35 text-[0.65rem] uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-white/75 text-sm">{value}</p>
    </div>
  )
}
