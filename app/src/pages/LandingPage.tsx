import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'

/**
 * Landing page ("/"), a scroll story over the fixed 3D scene (<SpaceScene>):
 *   screen 0  title and buttons; Earth rises from the bottom edge, the Moon and Mars peek in from the sides
 *   screen 1  Mars slides in large on the right, its text on the left
 *   screen 2  the Moon on the left, text on the right
 *   screen 3  Earth on the right, text on the left
 *   then      the method card, planets back behind it
 * The engine moves the planets from window.scrollY (one stage per screen height), so screens 0–3 must each be
 * exactly one screen tall. Text enters from blur when its section is in view (.story-item in index.css).
 * The page ignores pointer events except on links, so the planets stay clickable.
 * Facts follow docs/SCREENING_RESULTS.md and pipeline B3; site counts come from sites.json.
 */
export function LandingPage() {
  const data = useData()
  const sites = data.status === 'ready' ? data.sites.sites : []
  const count = (body: 'moon' | 'mars') => sites.filter((s) => s.body === body && s.selection.role === 'candidate').length
  const mars = count('mars')
  const moon = count('moon')
  const step = (i: number) => ({ '--i': i }) as CSSProperties
  const glow = '[text-shadow:0_2px_24px_rgb(5_7_13/0.9)]'
  const root = useInView()

  return (
    <main ref={root} className="pointer-events-none relative z-10">
      <SiteHeader showBrand={false} />

      <section data-story className="relative flex h-svh flex-col items-center px-6 pt-[15svh] text-center sm:pt-[17svh]">
        <div className="story-item flex flex-col items-center">
          <p className={`reveal font-mono text-[11px] tracking-[0.24em] text-ink-muted uppercase sm:text-xs ${glow}`} style={step(0)}>
            Moon and Mars, rehearsed on Earth
          </p>
          <h1
            className={`reveal mt-5 font-serif text-[3.4rem] leading-[0.95] tracking-[0.05em] uppercase sm:text-8xl lg:text-[7.5rem] ${glow}`}
            style={step(1)}
          >
            Earth Analogs
          </h1>
          <span className="reveal mt-6 block h-0.5 w-14 rounded-full bg-earth" style={step(2)} aria-hidden="true" />
          <p className={`reveal mt-6 max-w-xl text-base leading-relaxed text-ink/85 sm:text-lg ${glow}`} style={step(3)}>
            {mars > 0 ? <Fig>{mars}</Fig> : 'New'} landing zones on Mars, {moon > 0 ? <Fig>{moon}</Fig> : 'new'} base
            sites on the Moon, found with real mission limits. Then the places on Earth to rehearse each one.
          </p>
          <div className="reveal pointer-events-auto mt-8 flex flex-wrap justify-center gap-3" style={step(4)}>
            <Link
              to="/explore/mars"
              className="press rounded-full bg-mars px-6 py-2.5 font-medium text-space shadow-[0_0_32px_rgb(224_102_58/0.35)] hover:bg-mars/90"
            >
              Explore Mars
            </Link>
            <Link
              to="/explore/moon"
              className="press rounded-full border border-moon/50 bg-space/40 px-6 py-2.5 font-medium text-moon backdrop-blur-sm hover:border-moon hover:bg-moon/10"
            >
              Explore the Moon
            </Link>
          </div>
        </div>

        {/* Names beside the half-hidden Moon and Mars (engine HERO poses: x = ±0.98, radius ≈ 10.9 % of the screen height). */}
        <Link
          to="/explore/moon"
          className={`reveal pointer-events-auto absolute top-[47.5%] left-[calc(1%+10.9svh+1.25rem)] hidden -translate-y-1/2 font-serif text-xl tracking-[0.2em] text-ink/70 uppercase transition-colors hover:text-moon sm:block ${glow}`}
          style={step(5)}
        >
          Moon
        </Link>
        <Link
          to="/explore/mars"
          className={`reveal pointer-events-auto absolute top-[47.5%] right-[calc(1%+10.9svh+1.25rem)] hidden -translate-y-1/2 font-serif text-xl tracking-[0.2em] text-ink/70 uppercase transition-colors hover:text-mars sm:block ${glow}`}
          style={step(5)}
        >
          Mars
        </Link>

        <button
          type="button"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          aria-label="Scroll to Mars"
          className="reveal press pointer-events-auto absolute bottom-7 flex size-12 items-center justify-center rounded-full border border-white/15 bg-space/50 text-ink backdrop-blur-md hover:border-white/40"
          style={step(6)}
        >
          <ChevronDown className="size-5 animate-bounce motion-reduce:animate-none" aria-hidden="true" />
        </button>
      </section>

      <Chapter
        side="left"
        n="01"
        name="Mars"
        color="mars"
        lead={
          <>
            We ran the whole planet through landing rules from past missions. 4.3 % of Mars passes. From the largest safe
            patches we took <Fig>{mars}</Fig> zones, each far from every past lander and from each other.
          </>
        }
        stats={[
          { value: String(mars), label: 'landing zones' },
          { value: '4.3 %', label: 'of Mars is safe' },
          { value: '4 / 11', label: 'past landers pass all rules' },
        ]}
        action={{ to: '/explore/mars', label: 'Explore Mars' }}
      />

      <Chapter
        side="right"
        n="02"
        name="Moon"
        color="moon"
        lead={
          <>
            At the south pole the Sun circles the horizon. High ridges stay lit for most of the year, while the crater
            floors beside them never see the Sun and hold ice. We looked for ridges with both, and Earth in view for
            radio: <Fig>{moon}</Fig> passed. One lies outside NASA&apos;s Artemis regions.
          </>
        }
        stats={[
          { value: String(moon), label: 'base sites' },
          { value: '≥ 50 %', label: 'of the time in sunlight' },
          { value: '≤ 10 km', label: 'to permanent shadow' },
        ]}
        action={{ to: '/explore/moon', label: 'Explore the Moon' }}
      />

      <Chapter
        side="left"
        n="03"
        name="Earth"
        color="earth"
        lead={
          <>
            Crews rehearse here first. For each site we rank Earth&apos;s land by terrain, minerals, dryness and cold:
            high deserts like Atacama and Qaidam, the Dry Valleys of Antarctica, Arctic islands. Each place comes with
            what it can test.
          </>
        }
        note="No place on Earth has lower gravity, vacuum, a thin CO₂ atmosphere or space radiation. Every match says where it stops."
      />

      <section data-story data-story-loose className="mx-auto max-w-2xl px-6 pt-16 pb-32">
        <div className="story-item rounded-2xl border border-line bg-space/70 p-6 backdrop-blur-xl sm:p-10">
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-muted uppercase">Method</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">Rules first, places second</h2>
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

type BodyColor = 'mars' | 'moon' | 'earth'
const COLOR: Record<BodyColor, { text: string; bar: string; button: string }> = {
  mars: { text: 'text-mars', bar: 'bg-mars', button: 'bg-mars text-space hover:bg-mars/90' },
  moon: { text: 'text-moon', bar: 'bg-moon', button: 'bg-moon text-space hover:bg-moon/90' },
  earth: { text: 'text-earth', bar: 'bg-earth', button: 'bg-earth text-space hover:bg-earth/90' },
}

/** One story screen: text on one side, the planet (drawn by the engine) on the other; on phones the planet sits above. */
function Chapter(props: {
  side: 'left' | 'right'
  n: string
  name: string
  color: BodyColor
  lead: ReactNode
  stats?: { value: string; label: string }[]
  note?: string
  action?: { to: string; label: string }
}) {
  const c = COLOR[props.color]
  const step = (i: number) => ({ '--i': i }) as CSSProperties
  const glow = '[text-shadow:0_2px_20px_rgb(5_7_13/0.95)]'

  return (
    <section
      data-story
      className={`flex h-svh items-end px-6 pb-14 sm:px-12 md:items-center md:pb-0 lg:px-20 ${props.side === 'right' ? 'md:justify-end' : ''}`}
    >
      <div className={`w-full max-w-md ${glow}`}>
        <p className={`story-item font-mono text-xs tracking-[0.22em] uppercase ${c.text}`} style={step(0)}>
          {props.n} <span className="text-ink-muted">/ 03</span>
        </p>
        <h2
          className="story-item mt-3 font-serif text-6xl leading-none tracking-[0.06em] uppercase sm:text-7xl lg:text-8xl"
          style={step(1)}
        >
          {props.name}
        </h2>
        <span className={`story-item mt-5 block h-0.5 w-12 rounded-full ${c.bar}`} style={step(2)} aria-hidden="true" />
        <p className="story-item mt-5 text-base leading-relaxed text-ink/85 sm:text-lg" style={step(3)}>
          {props.lead}
        </p>

        {props.stats && (
          <dl className="story-item mt-7 grid grid-cols-3 gap-4 border-t border-white/10 pt-5" style={step(4)}>
            {props.stats.map((s) => (
              <div key={s.label}>
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-mono text-xl text-ink tabular-nums sm:text-2xl">{s.value}</dd>
                <dd className="mt-1 text-xs leading-snug text-ink-muted">{s.label}</dd>
              </div>
            ))}
          </dl>
        )}

        {props.note && (
          <p className="story-item mt-7 border-l-2 border-different/70 pl-4 text-sm leading-relaxed text-ink/70" style={step(4)}>
            {props.note}
          </p>
        )}

        {props.action && (
          <Link
            to={props.action.to}
            className={`story-item press pointer-events-auto mt-8 inline-flex rounded-full px-6 py-2.5 font-medium shadow-[0_0_28px_rgb(255_255_255/0.08)] ${c.button}`}
            style={step(5)}
          >
            {props.action.label}
          </Link>
        )}
      </div>
    </section>
  )
}

/** Marks each [data-story] section inside the returned ref with data-in-view while it fills most of the screen. */
function useInView() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const sections = ref.current?.querySelectorAll<HTMLElement>('[data-story]') ?? []
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const loose = (e.target as HTMLElement).dataset.storyLoose !== undefined
          const visible = e.intersectionRatio >= (loose ? 0.15 : 0.55)
          if (visible) (e.target as HTMLElement).dataset.inView = ''
          else delete (e.target as HTMLElement).dataset.inView
        }
      },
      { threshold: [0, 0.15, 0.55, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])
  return ref
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

function Fig({ children }: { children: ReactNode }) {
  return <span className="font-medium text-ink tabular-nums">{children}</span>
}
