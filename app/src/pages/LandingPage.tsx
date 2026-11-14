import { ChevronDown } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'

/**
 * Landing page ("/"). Screen one: the title and two buttons in the center, the Moon, Earth and Mars floating
 * around them (<SpaceScene>, fixed behind the page). Scrolling down reveals the method; more sections can be
 * added below. The page ignores pointer events except on links, so the planets stay clickable; wheel scrolling
 * still reaches the page. Site counts come from sites.json; the method text follows docs/SCREENING_RESULTS.md.
 * Training-area counts are left out on purpose until the Earth analogs are final (B8).
 */
export function LandingPage() {
  const data = useData()
  const sites = data.status === 'ready' ? data.sites.sites : []
  const count = (body: 'moon' | 'mars') => sites.filter((s) => s.body === body && s.selection.role === 'candidate').length
  const mars = count('mars')
  const moon = count('moon')
  const step = (i: number) => ({ '--i': i }) as CSSProperties
  const glow = '[text-shadow:0_2px_24px_rgb(5_7_13/0.9)]'

  return (
    <main className="pointer-events-none relative z-10">
      <SiteHeader showBrand={false} />

      <section className="relative flex min-h-svh flex-col items-center justify-center px-6 text-center">
        <p className={`reveal font-mono text-[11px] tracking-[0.22em] text-ink-muted uppercase sm:text-xs ${glow}`} style={step(0)}>
          Mars <span className="text-mars">·</span> Moon <span className="text-earth">·</span> Earth
        </p>
        <h1 className={`reveal mt-4 font-display text-5xl font-semibold tracking-[-0.035em] sm:text-7xl ${glow}`} style={step(1)}>
          Earth Analogs
        </h1>
        <p className={`reveal mt-5 max-w-lg text-lg leading-snug text-ink/90 sm:text-xl ${glow}`} style={step(2)}>
          {mars > 0 ? <Fig>{mars}</Fig> : 'New'} landing zones on Mars, {moon > 0 ? <Fig>{moon}</Fig> : 'new'} base
          sites on the Moon, found with real mission limits. Then the places on Earth to rehearse each one.
        </p>
        <div className="reveal pointer-events-auto mt-9 flex flex-wrap justify-center gap-3" style={step(3)}>
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
        <p
          className="reveal absolute bottom-8 flex flex-col items-center gap-1.5 font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase"
          style={step(5)}
        >
          Method
          <ChevronDown className="size-4 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </p>
      </section>

      <section className="mx-auto max-w-2xl px-6 pb-32">
        <div className="rounded-2xl border border-line bg-space/70 p-6 backdrop-blur-xl sm:p-10">
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">Method</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Rules first, places second
          </h2>
          <ol className="mt-8 space-y-8">
            <Step n="01" title="Screen">
              We ran the whole of Mars and the lunar south pole through limits taken from published mission documents.
              For landing: air to slow down in, winter sunlight, firm ground, gentle slopes. For a base: hours of
              sunlight, Earth in view for radio, ice in permanent shadow close by. <Fig>{mars}</Fig> Mars zones and{' '}
              <Fig>{moon}</Fig> lunar ridges passed every rule.
            </Step>
            <Step n="02" title="Validate">
              The same rules ran on the places spacecraft have already landed. Most pass. Those that fail do so for
              known reasons: Curiosity&apos;s Gale crater is too rough at kilometre scale, because Mount Sharp was the
              target.
            </Step>
            <Step n="03" title="Match">
              For each site we rank Earth&apos;s land by terrain, minerals, dryness and cold, and say what every
              training area can test. No place on Earth has lunar gravity, vacuum or space radiation, so each match
              also lists where the analogy stops.
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

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] gap-x-3">
      <span className="pt-1 font-mono text-xs text-accent tabular-nums" aria-hidden="true">
        {n}
      </span>
      <div>
        <h3 className="font-mono text-xs tracking-[0.18em] text-ink uppercase">{title}</h3>
        <p className="mt-2 leading-relaxed text-ink-muted">{children}</p>
      </div>
    </li>
  )
}

function Fig({ children }: { children: number }) {
  return <span className="font-medium text-ink tabular-nums">{children}</span>
}
