import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { PlanetLineup } from '../globe/PlanetLineup'

/**
 * Landing page ("/").
 * Layout and planets: Deniz (PlanetLineup lives in src/globe/).
 * Copy and the facts block: Kmar — replace the TODO texts; keep numbers coming from the data files.
 */
export function LandingPage() {
  const data = useData()
  const sites = data.status === 'ready' ? data.sites.sites : []
  const count = (body: 'moon' | 'mars', role: 'candidate' | 'validation') =>
    sites.filter((s) => s.body === body && s.selection.role === role).length

  return (
    <main className="relative flex h-full flex-col items-center justify-center gap-12 px-4 text-center">
      <SiteHeader />

      <section className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Earth Analogs</h1>
        {/* TODO(Kmar): final tagline and intro. */}
        <p className="mt-4 text-lg text-ink-muted">
          We screened the Moon and Mars for new landing and base sites, then found the places on Earth where
          astronauts and engineers could train for them.
        </p>
      </section>

      <PlanetLineup />

      {/* TODO(Kmar): facts block — how we found the sites, key numbers, data used. */}
      <section className="grid grid-cols-2 gap-6 font-mono text-sm sm:grid-cols-4" aria-label="Key numbers">
        <Fact value={count('mars', 'candidate')} label="Mars landing zones found" />
        <Fact value={count('moon', 'candidate')} label="Moon base sites found" />
        <Fact value={count('mars', 'validation') + count('moon', 'validation')} label="Past landings checked" />
        <Fact value={data.status === 'ready' ? data.analogs.analogs.length : 0} label="Earth training areas" />
      </section>

      <p className="text-sm text-ink-muted">
        Pick the Moon or Mars to explore its sites · <Link to="/about" className="underline hover:text-ink">About the project</Link>
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
