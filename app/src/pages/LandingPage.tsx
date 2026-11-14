import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'

/**
 * Landing page ("/"). The Moon, Earth and Mars float behind this text in <SpaceScene> and drift with the mouse;
 * clicking the Moon or Mars (or a button) opens /explore/<body> and the planet flies forward.
 * The page ignores pointer events except on its links, so the planets stay clickable.
 * Text arrives in a short stagger once the planets are in view (.reveal, --i).
 * Copy: Kmar — replace the TODO texts; keep numbers coming from the data files.
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
    <main className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
      <SiteHeader />

      <h1
        className="reveal font-display text-5xl font-semibold tracking-[-0.03em] [text-shadow:0_2px_24px_rgb(5_7_13/0.8)] sm:text-7xl"
        style={step(0)}
      >
        Earth Analogs
      </h1>

      {/* TODO(Kmar): final intro. */}
      <p className="reveal mt-6 max-w-[38rem] text-lg leading-relaxed text-ink/85 [text-shadow:0_1px_16px_rgb(5_7_13/0.9)]" style={step(1)}>
        We screened the Moon and Mars for new landing and base sites, then found the places on Earth where
        astronauts and engineers could train for them.
      </p>

      <div className="reveal pointer-events-auto mt-10 flex flex-wrap justify-center gap-3" style={step(2)}>
        <Link
          to="/explore/moon"
          className="press rounded-full border border-moon/50 bg-space/40 px-6 py-2.5 font-medium text-moon backdrop-blur-sm hover:border-moon hover:bg-moon/10"
        >
          Explore the Moon
        </Link>
        <Link
          to="/explore/mars"
          className="press rounded-full border border-mars/50 bg-space/40 px-6 py-2.5 font-medium text-mars backdrop-blur-sm hover:border-mars hover:bg-mars/10"
        >
          Explore Mars
        </Link>
      </div>

      {/* TODO(Kmar): how we found the sites. Numbers come from the data files. */}
      <p className="reveal mt-10 max-w-[34rem] text-sm leading-relaxed text-ink-muted [text-shadow:0_1px_12px_rgb(5_7_13/0.9)]" style={step(3)}>
        <Num>{mars}</Num> landing {mars === 1 ? 'zone' : 'zones'} on Mars and <Num>{moon}</Num> base{' '}
        {moon === 1 ? 'site' : 'sites'} on the Moon, checked against <Num>{past}</Num> past landings, with{' '}
        <Num>{areas}</Num> places on Earth to train for them.{' '}
        <Link to="/about" className="pointer-events-auto underline decoration-ink-muted/50 underline-offset-4 hover:text-ink">
          How we did it
        </Link>
      </p>
    </main>
  )
}

function Num({ children }: { children: number }) {
  return <span className="font-medium text-ink tabular-nums">{children}</span>
}
