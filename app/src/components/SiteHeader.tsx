import { NavLink } from 'react-router'

/** Top bar on every page: project name (back to the landing page) and navigation. The landing page hides the name (its title is right there). */
export function SiteHeader({ showBrand = true }: { showBrand?: boolean }) {
  const link = ({ isActive }: { isActive: boolean }) =>
    `press rounded-md px-2.5 py-1 text-sm ${isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'}`

  return (
    <header className="reveal pointer-events-auto fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4">
      <NavLink to="/" className={`font-display text-lg font-semibold tracking-tight ${showBrand ? '' : 'invisible'}`}>
        Earth Analogs
      </NavLink>
      <nav className="flex gap-1" aria-label="Main">
        <NavLink to="/explore/moon" className={link}>
          Moon
        </NavLink>
        <NavLink to="/explore/mars" className={link}>
          Mars
        </NavLink>
        <NavLink to="/about" className={link}>
          About
        </NavLink>
      </nav>
    </header>
  )
}
