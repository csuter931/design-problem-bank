import { useState, useEffect } from 'react'
import { collection, orderBy, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import './index.css'

// ── Sample problems (preview data) ──────────────────────
const SAMPLE_PROBLEMS: Problem[] = [
  {
    id: 'sample-1',
    title: 'Cafeteria lunch line takes too long',
    description: 'Students wait 15–20 minutes in line every day, leaving barely 10 minutes to eat. Many skip lunch entirely.',
    affects: 'All students and staff',
    status: 'new', severity: 4,
    categories: ['workspace', 'community'], disciplines: ['service-design'],
    submitterName: 'Maria Gonzalez', createdAt: Date.now() - 86400000 * 5,
    upvotes: 12, comments: [{}, {}],
    photos: ['https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&auto=format&fit=crop'],
  },
  {
    id: 'sample-2',
    title: 'Bike parking is unsafe and overcrowded',
    description: 'The existing bike racks are bent, jam-packed, and exposed to weather. Bikes fall over and locks barely fit.',
    status: 'claimed', severity: 3,
    categories: ['safety', 'sustainability'], disciplines: ['spatial-design'],
    submitterName: 'James Park', claimedByTeam: 'Team Sprocket',
    createdAt: Date.now() - 86400000 * 10, upvotes: 8, comments: [{}],
    photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&auto=format&fit=crop'],
  },
  {
    id: 'sample-3',
    title: 'No quiet study space during free periods',
    description: 'The library closes at 3pm and there\'s no designated quiet zone for students who need to focus during study hall.',
    status: 'inprogress', severity: 3,
    categories: ['workspace'], disciplines: ['spatial-design', 'ux-design'],
    submitterName: 'Dr. Sarah Lin', claimedByTeam: 'Studio Six',
    createdAt: Date.now() - 86400000 * 15, upvotes: 21, comments: [{}, {}],
    photos: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop'],
  },
  {
    id: 'sample-4',
    title: 'Bathroom soap dispensers always empty',
    description: 'Soap dispensers in the main building bathrooms are refilled maybe once a week. Students wash hands without soap.',
    status: 'new', severity: 5,
    categories: ['safety'], disciplines: ['service-design', 'product-design'],
    submitterName: 'Tom Richards',
    createdAt: Date.now() - 86400000 * 2, upvotes: 5, comments: [],
    photos: ['https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&auto=format&fit=crop'],
  },
  {
    id: 'sample-5',
    title: 'Recycling bins are confusing to use',
    description: 'Labels on recycling, compost, and landfill bins are unclear — most recyclables end up in landfill because no one knows what goes where.',
    status: 'solved', severity: 2,
    categories: ['sustainability', 'communication'], disciplines: ['graphic-design'],
    submitterName: 'Eco Club',
    createdAt: Date.now() - 86400000 * 30, upvotes: 16, comments: [{}],
    photos: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600&auto=format&fit=crop'],
  },
]

// ── Types ────────────────────────────────────────────────
interface Problem {
  id: string
  title: string
  description: string
  status?: 'new' | 'claimed' | 'inprogress' | 'solved'
  severity?: number
  categories?: string[]
  disciplines?: string[]
  submitterName?: string
  claimedByTeam?: string
  upvotes?: number
  comments?: unknown[]
  photos?: string[]
  createdAt?: number
  affects?: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'NEW',
  claimed: 'CLAIMED',
  inprogress: 'IN PROGRESS',
  solved: 'SOLVED',
}

const STATUS_COLORS: Record<string, string> = {
  new:        'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  claimed:    'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  inprogress: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  solved:     'bg-purple-500/20 text-purple-300 border-purple-500/30',
}

const SEVERITY_EMOJI = ['', '😀', '😕', '😟', '😫', '😱']
const SEVERITY_LABEL = ['', 'Minor', 'Moderate', 'Painful', 'Serious', 'Critical']

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🟢 New', value: 'new' },
  { label: '🟡 Claimed', value: 'claimed' },
  { label: '🔵 In Progress', value: 'inprogress' },
  { label: '🟣 Solved', value: 'solved' },
]

// ── ProblemCard ──────────────────────────────────────────
function ProblemCard({ problem }: { problem: Problem }) {
  const status = problem.status || 'new'
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.new

  return (
    <div className="flex-shrink-0 w-[300px] bg-white/[0.05] border border-white/[0.08] rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-2 transition-transform duration-300 flex flex-col snap-start">
      {/* Image */}
      <div className="h-[160px] bg-white/[0.04] flex items-center justify-center overflow-hidden">
        {problem.photos?.[0] ? (
          <img src={problem.photos[0]} alt={problem.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl opacity-20">💡</span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`text-[0.7rem] font-semibold px-2 py-0.5 rounded-full border ${statusColor}`}>
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

        {/* Title */}
        <h3 className="font-bold text-white text-base leading-snug mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
          {problem.title}
        </h3>

        {/* Description */}
        <p className="text-white/50 text-xs leading-relaxed flex-1 line-clamp-3 mb-4">
          {problem.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
          <span className="text-white/35 text-xs">by {problem.submitterName || 'Anonymous'}</span>
          <div className="flex items-center gap-3 text-white/35 text-xs">
            <span>▲ {problem.upvotes || 0}</span>
            <span>💬 {(problem.comments || []).length}</span>
          </div>
        </div>
      </div>
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

  // Load from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, 'problems'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const firestoreProblems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Problem))
      setProblems([...SAMPLE_PROBLEMS, ...firestoreProblems])
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
      return (b.createdAt || 0) - (a.createdAt || 0)
    })

  const scrollCarousel = (dir: 'left' | 'right') => {
    const el = document.getElementById('carouselTrack')
    if (el) el.scrollBy({ left: dir === 'left' ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[rgba(18,22,40,0.92)] backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💡</span>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Design Problem Bank
              </h1>
              <p className="text-xs text-white/50">Real problems. Creative solutions.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <span><span className="text-white font-semibold">{problems.length}</span> Problems</span>
            <span><span className="text-emerald-400 font-semibold">{problems.filter(p => !p.status || p.status === 'new').length}</span> Available</span>
            <span><span className="text-purple-400 font-semibold">{problems.filter(p => p.status === 'solved').length}</span> Solved</span>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative bg-[#0b0f1a] text-white py-24 px-6 text-center overflow-hidden">
        <div className="pointer-events-none absolute -top-[20%] -left-[15%] w-[700px] h-[700px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(43,56,150,0.45)_0%,transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(0,106,96,0.35)_0%,transparent_70%)]" />
        <div className="relative z-10 max-w-2xl mx-auto">
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
              <button className="text-base px-7 py-[0.7rem] rounded-[11px] bg-primary text-white hover:bg-primary/90 transition-colors font-medium">
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
                    : 'bg-white/[0.06] border-white/[0.15] text-white/65 hover:bg-white/[0.12] hover:text-white hover:border-white/25'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-[0.5rem] rounded-[11px] bg-white/[0.07] border border-white/[0.15] text-white/75 text-sm cursor-pointer"
          >
            <option value="newest">Newest first</option>
            <option value="upvotes">Most upvoted</option>
            <option value="severity">Highest severity</option>
          </select>
        </div>

        {/* Carousel */}
        <div className="relative group px-2 pb-12">
          <button
            onClick={() => scrollCarousel('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.15] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            ‹
          </button>

          {loading ? (
            <div className="text-center py-16 text-white/40">Loading problems…</div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-white/40">No problems match your filter.</div>
          ) : (
            <div
              id="carouselTrack"
              className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-10 pb-2"
            >
              {visible.map(p => <ProblemCard key={p.id} problem={p} />)}
            </div>
          )}

          <button
            onClick={() => scrollCarousel('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.15] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
          >
            ›
          </button>
        </div>

      </section>
    </div>
  )
}

export default App
