import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router'

const LINKS = [
  { to: '/explore/moon', label: 'Moon', dot: 'bg-moon', bar: 'after:bg-moon' },
  { to: '/explore/mars', label: 'Mars', dot: 'bg-mars', bar: 'after:bg-mars' },
  { to: '/earth', label: 'Earth', dot: 'bg-earth', bar: 'after:bg-earth' },
  { to: '/calculations', label: 'Calculations', dot: '', bar: 'after:bg-ink' },
  { to: '/about', label: 'About', dot: '', bar: 'after:bg-ink' },
]

/**
 * Top bar on every page: the project name (back to the landing page) and the five places to go.
 * The three worlds carry their colour as a dot, the same colour their markers and accents use everywhere else.
 * Below 768 px the links fold into a full-screen menu.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  // Following a link closes the menu.
  const [menuPath, setMenuPath] = useState(pathname)
  if (menuPath !== pathname) {
    setMenuPath(pathname)
    setOpen(false)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <header className="reveal pointer-events-none fixed inset-x-0 top-0 z-30">
      {/* Page text scrolling under the bar blurs out and fades instead of colliding with the links. */}
      <div
        className="absolute inset-x-0 top-0 -z-10 h-24 bg-gradient-to-b from-space/95 via-space/60 to-transparent backdrop-blur-md [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
        aria-hidden="true"
      />
      <div className="flex h-16 items-center justify-between px-5 sm:px-8">
        <NavLink to="/" className="press pointer-events-auto flex items-center gap-2.5 rounded-md" aria-label="Earth Analogs, home">
          <BrandMark />
          <span className="font-display text-[1.15rem] font-semibold tracking-[-0.01em]">Earth Analogs</span>
        </NavLink>

        <nav className="pointer-events-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `press relative flex items-center gap-2 rounded-md px-3 py-2 font-display text-[0.95rem] font-medium after:absolute after:inset-x-3 after:bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:transition-transform after:duration-300 ${l.bar} ${
                  isActive ? 'text-ink after:scale-x-100' : 'text-ink-muted after:scale-x-0 hover:text-ink'
                }`
              }
            >
              {l.dot && <span className={`size-1.5 rounded-full ${l.dot}`} aria-hidden="true" />}
              {l.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          className="press pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-space/60 px-3.5 py-1.5 font-display text-sm font-medium backdrop-blur-md md:hidden"
        >
          {open ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
          Menu
        </button>
      </div>

      {open && (
        <nav id="site-menu" aria-label="Main" className="panel-in pointer-events-auto fixed inset-x-0 top-16 bottom-0 bg-space/95 px-6 pt-6 backdrop-blur-xl md:hidden">
          <ul className="divide-y divide-line">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) => `flex items-center gap-3 py-4 font-display text-2xl font-medium ${isActive ? 'text-ink' : 'text-ink-muted'}`}
                >
                  <span className={`size-2 rounded-full ${l.dot || 'bg-white/25'}`} aria-hidden="true" />
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}

/** The three bodies as dots in their real size ratio (Moon 0.27 : Earth 1 : Mars 0.53) and their colours. */
function BrandMark() {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden="true">
      <span className="size-[4px] rounded-full bg-moon" />
      <span className="size-[14px] rounded-full bg-earth" />
      <span className="size-[7.5px] rounded-full bg-mars" />
    </span>
  )
}
