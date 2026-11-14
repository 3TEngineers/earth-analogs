import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'

/**
 * Landing page ("/"). The Moon, Earth and Mars float behind this text in <SpaceScene>;
 * clicking the Moon or Mars (or the buttons) opens /explore/<body> and the planet flies forward.
 * The page itself ignores pointer events except on its links and buttons, so the planets stay clickable.
 * Copy and the facts block: Kmar — replace the TODO texts; keep numbers coming from the data files.
 */
export function LandingPage() {
  const data = useData()
  const sites = data.status === 'ready' ? data.sites.sites : []
  const count = (body: 'moon' | 'mars', role: 'candidate' | 'validation') =>
    sites.filter((s) => s.body === body && s.selection.role === role).length

  return (
    <main className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center gap-10 px-4 text-center">
      <SiteHeader />

      <section className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight drop-shadow-lg sm:text-6xl">Earth Analogs</h1>
        {/* TODO(Kmar): final tagline and intro. */}
        <p className="mt-5 text-lg text-ink/80 drop-shadow">
          We screened the Moon and Mars for new landing and base sites, then found the places on Earth where
          astronauts and engineers could train for them.
        </p>
      </section>

      <div className="pointer-events-auto flex gap-3">
        <Link to="/explore/moon" className="rounded-full border border-moon/60 px-5 py-2 font-medium text-moon backdrop-blur-sm transition hover:bg-moon/10">
          Explore the Moon
        </Link>
        <Link to="/explore/mars" className="rounded-full border border-mars/60 px-5 py-2 font-medium text-mars backdrop-blur-sm transition hover:bg-mars/10">
          Explore Mars
        </Link>
      </div>

      {/* TODO(Kmar): facts block — how we found the sites, key numbers, data used. */}
      <section className="grid grid-cols-2 gap-6 font-mono text-sm sm:grid-cols-4" aria-label="Key numbers">
        <Fact value={count('mars', 'candidate')} label="Mars landing zones found" />
        <Fact value={count('moon', 'candidate')} label="Moon base sites found" />
        <Fact value={count('mars', 'validation') + count('moon', 'validation')} label="Past landings checked" />
        <Fact value={data.status === 'ready' ? data.analogs.analogs.length : 0} label="Earth training areas" />
      </section>

      <p className="text-sm text-ink-muted">
        Or click a planet ·{' '}
        <Link to="/about" className="pointer-events-auto underline hover:text-ink">
          About the project
        </Link>
      </p>
    </main>
  )
}

function Fact({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl text-ink">{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  )
}
