import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'

/**
 * Landing page ("/"). Text sits in a left column; the Moon, Earth and Mars own the rest of the screen
 * (<SpaceScene>, positions in globe/space/planets.ts). Clicking a planet or a button opens /explore/<body>.
 * The page ignores pointer events except on its links, so the planets stay clickable.
 * The three steps are a real sequence (screen → check → match), so they carry numbers; every figure comes
 * from the data files. Copy: Kmar may refine it.
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

  return (
    <main className="pointer-events-none relative z-10 flex h-full items-center overflow-y-auto px-6 pt-16 pb-8 sm:px-[7vw]">
      <SiteHeader showBrand={false} />

      <div className="max-w-[30rem] [text-shadow:0_1px_18px_rgb(5_7_13/0.95)]">
        <h1 className="reveal font-display text-4xl leading-[0.95] font-semibold tracking-[-0.035em] sm:text-5xl xl:text-6xl" style={step(0)}>
          Earth
          <br />
          Analogs
        </h1>
        <p className="reveal mt-5 text-lg leading-snug text-ink/90" style={step(1)}>
          New places to land on Mars and to live on the Moon — and where on Earth to train for them.
        </p>

        <ol className="mt-7 space-y-4 border-l border-line pl-5">
          <Step i={2} n={1} title="Screen">
            Every point on Mars and near the lunar south pole, checked against published mission limits: elevation,
            slope, latitude and surface for landing; sunlight, Earth in view and nearby ice for a base. <Fig>{mars}</Fig> landing{' '}
            {mars === 1 ? 'zone' : 'zones'} and <Fig>{moon}</Fig> base {moon === 1 ? 'site' : 'sites'} pass.
          </Step>
          <Step i={3} n={2} title="Check">
            The same rules run on <Fig>{past}</Fig> places where we already landed, so we can see they tell good sites
            from bad ones.
          </Step>
          <Step i={4} n={3} title="Match">
            Each site&apos;s terrain, minerals, dryness and cold compared with Earth: <Fig>{areas}</Fig> training areas,
            with what is similar, what is not, and what to test there.
          </Step>
        </ol>

        <div className="reveal pointer-events-auto mt-7 flex flex-wrap items-center gap-3" style={step(5)}>
          <Link
            to="/explore/mars"
            className="press rounded-full bg-mars px-6 py-2.5 font-medium text-space hover:bg-mars/90"
          >
            Explore Mars
          </Link>
          <Link
            to="/explore/moon"
            className="press rounded-full border border-moon/50 px-6 py-2.5 font-medium text-moon backdrop-blur-sm hover:border-moon hover:bg-moon/10"
          >
            Explore the Moon
          </Link>
          <Link to="/about" className="press px-2 py-2.5 text-sm text-ink-muted hover:text-ink">
            About
          </Link>
        </div>
      </div>
    </main>
  )
}

function Step({ i, n, title, children }: { i: number; n: number; title: string; children: ReactNode }) {
  return (
    <li className="reveal relative" style={{ '--i': i } as CSSProperties}>
      <span className="absolute top-1 -left-[1.6rem] grid size-2 place-items-center rounded-full bg-accent ring-4 ring-space" aria-hidden="true" />
      <h2 className="font-display text-sm font-semibold tracking-wide text-ink">
        <span className="text-ink-muted tabular-nums">{n}</span>&nbsp;&nbsp;{title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{children}</p>
    </li>
  )
}

function Fig({ children }: { children: number }) {
  return <span className="font-medium text-ink tabular-nums">{children}</span>
}
