/**
 * Drop-in shim for next/link.
 * 21st.dev components import from "next/link" — Vite resolves that alias here.
 * Renders a plain <a> tag; swap for react-router <Link> if routing is added.
 */
import React from 'react'

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, ...props }, ref) => (
    <a href={href} ref={ref} {...props}>
      {children}
    </a>
  )
)
Link.displayName = 'Link'

export default Link
