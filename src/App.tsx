/**
 * Design Problem Bank — React App
 *
 * HOW TO DROP IN 21st.dev COMPONENTS:
 *   1. Copy the .tsx file into src/components/ui/
 *   2. Import it below and swap it in for the placeholder section
 *   3. npm run dev — framer-motion, lucide-react, shadcn Button are all pre-installed
 *
 * next/link is shimmed → src/lib/link.tsx (renders a plain <a> tag)
 * Firebase is connected → src/lib/firebase.ts
 */

import './index.css'

function App() {
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
          <div className="flex items-center gap-3">
            <a
              href="/admin.html"
              className="text-sm px-4 py-2 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition-colors"
            >
              🎓 Student Login
            </a>
            <button className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
              ＋ Submit a Problem
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      {/*
        SWAP IN: import { HeroSection } from '@/components/blocks/hero-section-1'
        Then replace this <section> with <HeroSection />
      */}
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
            <button className="text-base px-7 py-[0.7rem] rounded-[11px] border border-white/20 text-white/80 hover:bg-white/10 transition-colors">
              Browse problems ↓
            </button>
          </div>
        </div>
      </section>

      {/* ── FILTER + GALLERY ───────────────────────────────── */}
      {/*
        SWAP IN: import { OfferCarousel } from '@/components/ui/offer-carousel'
        Map your Firestore problems to the Offer type and pass them in.
      */}
      <section className="bg-[#141824] border-t border-white/[0.06]">
        {/* Filter bar */}
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search problems..."
              className="w-full pl-9 pr-4 py-[0.65rem] rounded-[11px] bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/35 text-sm focus:outline-none focus:border-primary focus:bg-white/10 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'All', active: true },
              { label: '🟢 New', active: false },
              { label: '🟡 Claimed', active: false },
              { label: '🔵 In Progress', active: false },
              { label: '🟣 Solved', active: false },
            ].map(({ label, active }) => (
              <button
                key={label}
                className={`px-4 py-[0.4rem] rounded-[11px] text-sm font-medium border transition-all ${
                  active
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white/[0.06] border-white/[0.15] text-white/65 hover:bg-white/[0.12] hover:text-white hover:border-white/25'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <select className="px-3 py-[0.5rem] rounded-[11px] bg-white/[0.07] border border-white/[0.15] text-white/75 text-sm cursor-pointer">
            <option>Newest first</option>
            <option>Most upvoted</option>
            <option>Highest severity</option>
          </select>
        </div>

        {/* Cards placeholder */}
        <div className="max-w-7xl mx-auto px-6 pb-16 pt-2">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-12 text-center">
            <p className="text-white/50 text-sm leading-relaxed">
              Problem cards will render here from Firestore.
              <br />
              <span className="text-white/30 text-xs mt-1 block">
                Drop an <code className="text-white/50">OfferCarousel</code> or custom card component into this section.
              </span>
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}

export default App
