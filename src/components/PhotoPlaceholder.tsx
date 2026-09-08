// Stand-in tile for a problem with no photo, used by the gallery card and the
// dashboard thumbnail. Replaces a flat grey panel holding a 💡 emoji — emoji
// cannot be tinted, so it rendered as a drab grey blob, and a wall of identical
// grey panels was the single most conspicuous thing on a photo-less gallery.
//
// Deliberately stays inside the blue half of the palette (Dawson Blue, Royal
// Blue, navy shades). The secondary brand colours all carry status meaning —
// seagreen = new, orange = claimed, carolina = in progress, purple = solved
// (see STATUS_COLORS in lib/problemMeta) — so a hue-coded tile would read as a
// status badge and contradict the card's own badge. Varying tone and angle
// within one family gives a grid of photo-less cards rhythm without inventing
// new colour semantics. The warm lift is Alabaster, which carries no status.

// Full literal class strings: Tailwind scans source text, so these must not be
// assembled at runtime or the gradients get purged from the stylesheet.
const GRADIENTS = [
  'bg-[linear-gradient(135deg,rgb(0_51_160/0.50)_0%,rgb(0_32_91/0.38)_100%)]',
  'bg-[linear-gradient(160deg,rgb(0_32_91/0.55)_0%,rgb(0_51_160/0.30)_100%)]',
  'bg-[linear-gradient(115deg,rgb(0_51_160/0.34)_0%,rgb(0_18_56/0.58)_100%)]',
  'bg-[linear-gradient(200deg,rgb(0_24_69/0.52)_0%,rgb(0_51_160/0.42)_100%)]',
  'bg-[linear-gradient(145deg,rgb(0_51_160/0.44)_0%,rgb(0_32_91/0.50)_100%)]',
]

// Deterministic so a given problem always draws the same tile — the gallery
// re-sorts and re-filters constantly, and a tile that changed colour on every
// reflow would read as a bug.
function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function BulbMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0-3.5 10.9c.5.35.8.92.8 1.53V16h5.4v-.57c0-.61.3-1.18.8-1.53A6 6 0 0 0 12 3z" />
      <path d="M9.8 19h4.4" />
      <path d="M10.6 21.4h2.8" />
    </svg>
  )
}

export function PhotoPlaceholder({ id, bulbClass = 'w-10 h-10' }: {
  /** Problem id — picks the tile, and keeps it stable across re-sorts. */
  id: string
  /** Size of the bulb mark; the tile itself always fills its container. */
  bulbClass?: string
}) {
  const gradient = GRADIENTS[hashId(id) % GRADIENTS.length]
  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden shadow-[inset_0_-1px_0_rgb(255_255_255/0.06)] ${gradient}`}
    >
      {/* Alabaster lift from the top-left, so the tile reads as a lit surface
          rather than a flat swatch. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_18%,rgb(237_234_224/0.11)_0%,transparent_58%)]" />
      <BulbMark className={`relative text-dawson-alabaster/25 ${bulbClass}`} />
    </div>
  )
}
