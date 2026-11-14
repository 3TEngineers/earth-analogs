import { ChevronDown } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'

/**
 * Landing page ("/"). Screen one: the title and two buttons in the center, the Moon, Earth and Mars floating
 * around them (<SpaceScene>, fixed behind the page). Scrolling down reveals how we found the sites; more
 * sections can be added below. The page ignores pointer events except on links, so the planets stay
 * clickable; wheel scrolling still reaches the page. Every figure comes from the data files. Copy: Kmar may refine it.
 */
export function LandingPage() {
  const data = useData()
  const sites = data.status === 'ready' ? data.sites.sites : []
  const count = (body: 'moon' | 'mars', role: 'candidate' | 'validation') =>
    sites.filter((s) => s.body === body && s.selection.role === role).length
  const mars = count('mars', 'candidate')
  const moon = count('moon', 'candidate')
  const past = count('mars', 'validation') + count('moon', 'validation')
  const areas = data.status === 'ready' ? data.analogs.analogs.length : 0
  const step = (i: number) => ({ '--i': i }) as CSSProperties
  const glow = '[text-shadow:0_2px_24px_rgb(5_7_13/0.9)]'

  return (
    <main className="pointer-events-none relative z-10">
      <SiteHeader showBrand={false} />

      <section className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <h1 className={`reveal font-display text-5xl font-semibold tracking-[-0.035em] sm:text-7xl ${glow}`} style={step(0)}>
          Earth Analogs
        </h1>
        <p className={`reveal mt-5 max-w-xl text-lg leading-snug text-ink/90 sm:text-xl ${glow}`} style={step(1)}>
          New places to land on Mars and to live on the Moon — and where on Earth to train for them.
        </p>
        <div className="reveal pointer-events-auto mt-9 flex flex-wrap justify-center gap-3" style={step(2)}>
          <Link to="/explore/mars" className="press rounded-full bg-mars px-6 py-2.5 font-medium text-space hover:bg-mars/90">
            Explore Mars
          </Link>
          <Link
            to="/explore/moon"
            className="press rounded-full border border-moon/50 bg-space/30 px-6 py-2.5 font-medium text-moon backdrop-blur-sm hover:border-moon hover:bg-moon/10"
          >
            Explore the Moon
          </Link>
        </div>
        <p className="reveal absolute bottom-8 flex flex-col items-center gap-1 text-xs text-ink-muted" style={step(4)}>
          How we found them
          <ChevronDown className="size-4 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-32">
        <div className="rounded-2xl border border-line bg-space/70 p-6 backdrop-blur-xl sm:p-10">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">How we found them</h2>
          <ol className="mt-8 space-y-7 border-l border-line pl-6">
            <Step n={1} title="Screen">
              Every point on Mars and near the lunar south pole, checked against published mission limits: elevation,
              slope, latitude and surface for landing; sunlight, Earth in view and nearby ice for a base. <Fig>{mars}</Fig>{' '}
              landing {mars === 1 ? 'zone' : 'zones'} and <Fig>{moon}</Fig> base {moon === 1 ? 'site' : 'sites'} pass.
            </Step>
            <Step n={2} title="Check">
              The same rules run on <Fig>{past}</Fig> places where we already landed, so we can see they tell good sites
              from bad ones.
            </Step>
            <Step n={3} title="Match">
              Each site&apos;s terrain, minerals, dryness and cold compared with Earth: <Fig>{areas}</Fig> training areas,
              each with what is similar, what is not, and what to test there.
            </Step>
          </ol>
          <div className="pointer-events-auto mt-10 flex flex-wrap gap-3">
            <Link to="/explore/mars" className="press rounded-full bg-mars px-5 py-2 text-sm font-medium text-space hover:bg-mars/90">
              Explore Mars
            </Link>
            <Link to="/about" className="press rounded-full border border-line px-5 py-2 text-sm text-ink-muted hover:border-ink-muted hover:text-ink">
              About the project
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[1.85rem] size-2.5 rounded-full bg-accent ring-4 ring-space" aria-hidden="true" />
      <h3 className="font-display text-lg font-semibold">
        <span className="mr-2 text-ink-muted tabular-nums">{n}</span>
        {title}
      </h3>
      <p className="mt-1.5 leading-relaxed text-ink-muted">{children}</p>
    </li>
  )
}

function Fig({ children }: { children: number }) {
  return <span className="font-medium text-ink tabular-nums">{children}</span>
}
