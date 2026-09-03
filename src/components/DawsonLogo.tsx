// Dawson School logo — the approved reversed-colour (white) mark from the
// Marketing and Branding folder, served from public/dawson-logo-white.png.
//
// The brand manual specifies the reversed version for blue/dark backgrounds,
// which is every surface in this app, so it sits directly on the navy with no
// plate. Keep the safety space (≈ the height of "SCHOOL") clear around it, and
// never recolour, stretch, or crop it. The full-colour mark (light backgrounds
// only) is kept out of the bundle in the gitignored brand/ folder.
export function DawsonLogo({ imgClass = 'h-9' }: { imgClass?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}dawson-logo-white.png`}
      alt="Dawson School"
      className={`${imgClass} w-auto flex-shrink-0 select-none`}
      draggable={false}
    />
  )
}
