import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { sceneStore } from '../globe/sceneStore'
import type { Pair } from '../globe/space/SpaceEngine'
import { formatLatLon, placeOf } from '../panels/format'
import type { Analog, Body, Site } from '../types/data'

/** How long one site ↔ Earth pair stays on the first screen. */
const PAIR_MS = 8000

/**
 * Landing page ("/"): what the project is, told in one scroll over the fixed 3D scene.
 *   0 hero      the question, what an analog is, and a live pair: one of our sites linked to its match on Earth
 *   1 brief     the whole method in three steps
 *   2 mars      step 1 on Mars: the planet screened, 5 zones kept
 *   3 moon      step 1 on the Moon: 3 ridges at the south pole (the Moon tips its pole toward the viewer)
 *   4 check     step 2: the same rules run on real landings
 *   5 earth     step 3: 24 training areas
 *   6 doors     where to go next
 * Each section carries data-stage with the number above; the scene blends the planet poses of globe/space/story.ts
 * from the scroll position between section centres, so sections may be any height.
 * The page ignores pointer events except on links and buttons, so the planets stay clickable.
 * Facts follow docs/SCREENING_RESULTS.md, docs/ANALOG_RESULTS.md and docs/AUDIT.md; counts come from the data files.
 */
export function LandingPage() {
  const data = useData()
  const sites = useMemo(() => (data.status === 'ready' ? data.sites.sites : []), [data])
  const analogs = useMemo(() => (data.status === 'ready' ? data.analogs.analogs : []), [data])
  const count = (body: Body) => sites.filter((s) => s.body === body && s.selection.role === 'candidate').length
  const mars = count('mars') || 5
  const moon = count('moon') || 3
  const areas = analogs.length || 24
  const root = useStory()
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <main ref={root} className="pointer-events-none relative z-10">
      <SiteHeader />

      {/* 0 — hero */}
      <section data-stage="0" className="relative flex min-h-svh flex-col justify-end px-6 pt-[46svh] pb-20 sm:px-10 md:justify-center md:pt-20 md:pb-20 lg:px-16">
        <div className="on-sky w-full max-w-[42rem]">
          <p className="reveal eyebrow text-ink-muted" style={step(0)}>
            NASA Space Apps Challenge 2026 · Team 3TE
          </p>
          <h1 className="reveal headline mt-4 text-[2.6rem] sm:text-5xl lg:text-[clamp(2.6rem,7vh,3.75rem)]" style={step(1)}>
            Where on Earth do you rehearse for the Moon and Mars?
          </h1>
          <p className="reveal mt-5 max-w-[38rem] text-[1.05rem] leading-relaxed text-ink/90 lg:text-[clamp(1rem,2.1vh,1.125rem)]" style={step(2)}>
            Before a crew lands on another world, it trains on Earth, in places that look and behave like the destination.
            Scientists call these places <strong className="font-semibold text-ink">analogs</strong>. We searched Mars and the
            Moon&apos;s south pole for new places to land, then searched all of Earth for the three places that match each one.
          </p>
          <div className="reveal pointer-events-auto mt-7 flex flex-wrap gap-3" style={step(3)}>
            <Link to="/explore/mars" className="press inline-flex items-center gap-2 rounded-full bg-mars px-6 py-3 font-display font-semibold text-space hover:bg-mars/90">
              Start with Mars <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/calculations"
              className="press rounded-full border border-white/25 bg-space/40 px-6 py-3 font-display font-medium backdrop-blur-sm hover:border-white/60"
            >
              How we calculated it
            </Link>
          </div>
        </div>

        <div className="reveal pointer-events-auto mt-8 w-full max-w-[36rem]" style={step(4)}>
          <PairCard sites={sites} analogs={analogs} />
        </div>

        <button
          type="button"
          onClick={() => document.querySelector('[data-stage="1"]')?.scrollIntoView({ behavior: 'smooth' })}
          className="reveal press pointer-events-auto absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-space/50 px-4 py-2 font-display text-sm font-medium text-ink/90 backdrop-blur-md hover:border-white/40 md:flex"
          style={step(6)}
        >
          The method in three steps <ArrowDown className="size-4" aria-hidden="true" />
        </button>
      </section>

      {/* 1 — the method in three steps */}
      <section data-stage="1" className="flex min-h-svh items-center px-6 py-24 sm:px-10 lg:px-16">
        <div className="on-sky mx-auto w-full max-w-6xl">
          <p className="story-item eyebrow text-ink-muted" style={step(0)}>
            The short version
          </p>
          <h2 className="story-item headline mt-4 max-w-3xl text-4xl sm:text-5xl" style={step(1)}>
            We chose where to land ourselves. Then we found those places on Earth.
          </h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            <BriefStep n={1} i={2} title="Find new places to land" figure={`${mars + moon}`} unit="sites of our own">
              Most analog studies start from places where spacecraft have already landed. We started from the maps: all of
              Mars, filtered with landing limits that real missions published, and the Moon&apos;s south pole, filtered with
              our own rules for a base. {mars} zones on Mars and {moon} ridges on the Moon passed.
            </BriefStep>
            <BriefStep n={2} i={3} title="Check the rules against history" figure="21" unit="real sites tested">
              The same rules ran on the 11 past Mars landings, the 7 named features of NASA&apos;s Artemis III regions and the
              3 landers that reached the Moon&apos;s south polar region. They agree where they should, and for every miss we
              asked why that mission went there.
            </BriefStep>
            <BriefStep n={3} i={4} title="Match each site to Earth" figure={`${areas}`} unit="training areas">
              For every site we ranked all land on Earth by terrain, rock, dryness and temperature and kept three places.
              Each one says what a crew can test there, and where the likeness stops.
            </BriefStep>
          </ol>
        </div>
      </section>

      {/* 2 — Mars */}
      <Feature stage={2} side="left" accent="var(--color-mars)" eyebrow="Step 1 · Mars" title={<>4.5 % of Mars is safe to land on. We kept {mars} zones.</>}>
        <p className="story-item text-[1.05rem] leading-relaxed text-ink/90 sm:text-lg" style={step(2)}>
          A lander needs air thick enough to brake in, sunlight in winter, firm ground and a wide, flat plain. We tested every
          part of the planet against five such rules. From the ground that passes, we took the {mars} points deepest inside
          it, each more than 500 km from any past landing and 1,500 km from the others.
        </p>
        <div className="story-item mt-7" style={step(3)}>
          <Funnel zones={mars} />
        </div>
        <Chips i={4} items={['Air to brake in', 'Winter sunlight', 'Firm, dust-free ground', 'Slope ≤ 3°', 'Relief ≤ 500 m']} />
        <FeatureLink i={5} to="/explore/mars" className="bg-mars text-space hover:bg-mars/90">
          Explore the {mars} landing zones
        </FeatureLink>
      </Feature>

      {/* 3 — Moon */}
      <Feature stage={3} side="right" accent="var(--color-moon)" eyebrow="Step 1 · Moon" title={<>{moon === 3 ? 'Three' : moon} ridges at the south pole could host a base.</>}>
        <p className="story-item text-[1.05rem] leading-relaxed text-ink/90 sm:text-lg" style={step(2)}>
          A base needs power, a radio link and water. At the pole the Sun circles the horizon, so a few high ridges stay lit
          more than half the time, while crater floors beside them never see the Sun and can keep ice. {moon} ridges pass all
          four rules. Two lie beside NASA&apos;s Artemis III regions; one lies outside them.
        </p>
        <dl className="story-item mt-7 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/15 pt-5 sm:grid-cols-4" style={step(3)}>
          <Rule value="≥ 50 %" label="of the time in sunlight" />
          <Rule value="≥ 50 %" label="of the time Earth in view" />
          <Rule value="≤ 10°" label="slope" />
          <Rule value="≤ 10 km" label="to a large permanent shadow" />
        </dl>
        <FeatureLink i={4} to="/explore/moon" className="bg-moon text-space hover:bg-moon/90">
          Explore the {moon} base sites
        </FeatureLink>
      </Feature>

      {/* 4 — the check */}
      <section data-stage="4" className="flex min-h-[90svh] items-center px-6 py-24 sm:px-10 lg:px-16">
        <div className="on-sky mx-auto w-full max-w-6xl">
          <p className="story-item eyebrow text-ink-muted" style={step(0)}>
            Step 2 · The check
          </p>
          <h2 className="story-item headline mt-4 max-w-3xl text-4xl sm:text-5xl" style={step(1)}>
            Do the rules hold up against real missions?
          </h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <Proof i={2} figure="6 of 11" title="past Mars landings pass every rule">
              Three of the other five landed far from the equator; Phoenix went north on purpose, to reach ice. Curiosity
              and Perseverance landed beside the mountain and the delta they came to study. All seven landings whose own
              published limits we found pass them.
            </Proof>
            <Proof i={3} figure="16 km" title="from one of our lunar ridges to a NASA feature">
              Our screening never used NASA&apos;s Artemis III regions. Two of our three ridges still came out near one: 16 km
              and 38 km from the named feature of de Gerlache Rim 2.
            </Proof>
            <Proof i={4} figure="100+ checks" title="on our own numbers, 0 failed">
              Every value was compared with a published figure, a known place or a fresh recomputation before it went on this
              site.
            </Proof>
          </div>
          <Link
            to="/calculations"
            className="story-item press pointer-events-auto mt-10 inline-flex items-center gap-2 font-display font-medium text-ink underline decoration-white/30 underline-offset-8 hover:decoration-white"
            style={step(5)}
          >
            See every rule and result <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* 5 — Earth */}
      <Feature stage={5} side="left" accent="var(--color-earth)" eyebrow="Step 3 · Earth" title={<>Every site gets three training areas on Earth.</>}>
        <p className="story-item text-[1.05rem] leading-relaxed text-ink/90 sm:text-lg" style={step(2)}>
          We scored all land on Earth against each site: slopes measured at the same map scale, rock type, rainfall, bare
          ground and temperature, and for the Moon a low Sun and frozen ground. The result is {areas} places, from basalt
          plains in the Sahara to the bare ground of Victoria Island in the Arctic.
        </p>
        <p className="story-item mt-6 border-l-2 border-different/80 pl-4 text-[0.95rem] leading-relaxed text-ink/80" style={step(3)}>
          No place on Earth has lower gravity, a vacuum, Mars&apos; thin air or space radiation. Every match says where it stops.
        </p>
        <FeatureLink i={4} to="/earth" className="bg-earth text-space hover:bg-earth/90">
          See all {areas} on Earth
        </FeatureLink>
      </Feature>

      {/* 6 — where next */}
      <section data-stage="6" className="px-6 pt-24 pb-10 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-6xl">
          <h2 className="story-item on-sky headline text-4xl sm:text-5xl" style={step(0)}>
            Pick a world.
          </h2>
          <div className="pointer-events-auto mt-10 grid gap-4 md:grid-cols-3">
            <Door i={1} to="/explore/mars" accent="var(--color-mars)" name="Mars" figure={mars} label="landing zones">
              Low, flat, firm plains that pass every landing rule.
            </Door>
            <Door i={2} to="/explore/moon" accent="var(--color-moon)" name="Moon" figure={moon} label="base sites">
              Sunlit ridges at the south pole, next to permanent shadow.
            </Door>
            <Door i={3} to="/earth" accent="var(--color-earth)" name="Earth" figure={areas} label="training areas">
              Deserts, plateaus and Arctic islands, each tied to one site.
            </Door>
          </div>
          <div className="story-item pointer-events-auto mt-6 flex flex-wrap gap-x-8 gap-y-3 font-display font-medium" style={step(4)}>
            <Link to="/calculations" className="press inline-flex items-center gap-2 text-ink underline decoration-white/30 underline-offset-8 hover:decoration-white">
              How we calculated it <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link to="/about" className="press inline-flex items-center gap-2 text-ink underline decoration-white/30 underline-offset-8 hover:decoration-white">
              The team and the data <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <footer className="on-sky mt-24 max-w-3xl border-t border-line pt-6 text-sm leading-relaxed text-ink-muted">
            Built for the NASA Space Apps Challenge 2026 by Team 3TE. Data from NASA, USGS, ESA Copernicus and the GLiM
            lithological map. A pre-screening at kilometre scale: real site selection uses metre-scale images and takes years.
          </footer>
        </div>
      </section>
    </main>
  )
}

interface PairItem {
  site: Site
  analog: Analog
}

/**
 * The live pair on the first screen: one of our sites and its top-ranked training area, switching every few seconds.
 * The 3D scene draws the same pair as an arc between the two bodies (sceneStore.setPair).
 * Switching stops while the pointer or keyboard focus is on the card, while the tab is hidden, once the page has
 * scrolled past the first screen, and for visitors who asked for reduced motion; the arrows always work.
 */
function PairCard({ sites, analogs }: { sites: Site[]; analogs: Analog[] }) {
  const pairs = useMemo<PairItem[]>(() => {
    const top = (body: Body) =>
      sites
        .filter((s) => s.body === body && s.selection.role === 'candidate')
        .flatMap((site) => {
          const analog = analogs.find((a) => a.siteId === site.id && a.rank === 1)
          return analog ? [{ site, analog }] : []
        })
    // Mars and Moon sites take turns, so both arcs show early.
    const m = top('mars')
    const l = top('moon')
    return Array.from({ length: Math.max(m.length, l.length) }, (_, i) => [m[i], l[i]])
      .flat()
      .filter((p): p is PairItem => p !== undefined)
  }, [sites, analogs])
  const [index, setIndex] = useState(0)
  const [held, setHeld] = useState(false)
  const current = pairs.length > 0 ? pairs[index % pairs.length] : null

  useEffect(() => {
    if (!current) return
    const pair: Pair = {
      from: { planet: current.site.body, lat: current.site.lat, lon: current.site.lon, label: current.site.name },
      to: { planet: 'earth', lat: current.analog.lat, lon: current.analog.lon, label: `${placeOf(current.analog.name)}, ${current.analog.country}` },
    }
    sceneStore.setPair(pair)
  }, [current])
  useEffect(() => () => sceneStore.setPair(null), [])

  const auto = pairs.length > 1 && !held && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (!auto) return
    const timer = window.setInterval(() => {
      if (!document.hidden && sceneStore.get().stage < 0.4) setIndex((i) => i + 1)
    }, PAIR_MS)
    return () => window.clearInterval(timer)
  }, [auto, index])

  if (!current) return null
  const { site, analog } = current
  const bodyName = site.body === 'mars' ? 'Mars' : 'Moon'
  const go = (d: number) => setIndex((i) => (i + d + pairs.length) % pairs.length)

  return (
    <div
      className="glass rounded-2xl p-4 sm:p-5"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-ink-muted">
          One of {pairs.length} pairs <span className="ml-1 font-mono tracking-normal text-ink/80 tabular-nums">{(index % pairs.length) + 1}/{pairs.length}</span>
        </p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => go(-1)} aria-label="Previous pair" className="press flex size-8 items-center justify-center rounded-full border border-line hover:border-white/40">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next pair" className="press flex size-8 items-center justify-center rounded-full border border-line hover:border-white/40">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div key={site.id} className="pair-swap mt-3 grid grid-cols-[1fr_auto] items-end gap-x-5" aria-live="polite">
        <div className="min-w-0 space-y-2.5">
          <PairRow dot={site.body === 'mars' ? 'bg-mars' : 'bg-moon'} world={bodyName} name={site.name} detail={formatLatLon(site.lat, site.lon)} />
          <PairRow dot="bg-earth" world="Earth" name={`${placeOf(analog.name)}, ${analog.country}`} detail={formatLatLon(analog.lat, analog.lon)} />
        </div>
        <p className="text-right">
          <span className="font-display text-5xl leading-none font-semibold tabular-nums">{analog.totalScore}</span>
          <span className="mt-1 block font-mono text-[11px] text-ink-muted">match / 100</span>
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-line pt-3">
        <Link to={`/explore/${site.body}?site=${site.id}`} className="press inline-flex items-center gap-1.5 font-display text-sm font-medium hover:text-accent">
          Open this site on {site.body === 'mars' ? 'Mars' : 'the Moon'} <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        {/* Time left before the next pair. */}
        <span className="h-0.5 w-20 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
          {auto && <span key={index} className="block h-full origin-left animate-[pair-timer_linear_both] bg-ink/60" style={{ animationDuration: `${PAIR_MS}ms` }} />}
        </span>
      </div>
    </div>
  )
}

function PairRow({ dot, world, name, detail }: { dot: string; world: string; name: string; detail: string }) {
  return (
    <div className="grid grid-cols-[3.6rem_1fr] items-baseline gap-x-2">
      <span className="flex items-center gap-1.5 font-display text-xs font-medium tracking-[0.14em] text-ink-muted uppercase">
        <span className={`size-1.5 rounded-full ${dot}`} aria-hidden="true" />
        {world}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg leading-tight font-medium">{name}</span>
        <span className="block font-mono text-[11px] text-ink-muted tabular-nums">{detail}</span>
      </span>
    </div>
  )
}

function BriefStep({ n, i, title, figure, unit, children }: { n: number; i: number; title: string; figure: string; unit: string; children: ReactNode }) {
  return (
    <li className="story-item flex flex-col rounded-2xl border border-line bg-space/55 p-6 backdrop-blur-md" style={{ '--i': i } as CSSProperties}>
      <p className="eyebrow text-ink-muted">Step {n}</p>
      <h3 className="mt-3 font-display text-2xl leading-tight font-semibold">{title}</h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/80">{children}</p>
      <p className="mt-auto flex items-baseline gap-2.5 pt-6">
        <span className="font-display text-4xl leading-none font-semibold tabular-nums">{figure}</span>
        <span className="text-sm text-ink-muted">{unit}</span>
      </p>
    </li>
  )
}

/** One planet's chapter: the planet (drawn by the scene) on one side, text on the other; on phones the planet sits above. */
function Feature(props: { stage: number; side: 'left' | 'right'; accent: string; eyebrow: string; title: ReactNode; children: ReactNode }) {
  return (
    <section
      data-stage={props.stage}
      style={{ '--body-accent': props.accent } as CSSProperties}
      className={`flex min-h-svh items-end px-6 pt-[52svh] pb-16 sm:px-10 md:items-center md:py-24 lg:px-16 ${props.side === 'right' ? 'md:justify-end' : ''}`}
    >
      <div className="on-sky w-full max-w-xl">
        <p className="story-item eyebrow text-accent" style={{ '--i': 0 } as CSSProperties}>
          {props.eyebrow}
        </p>
        <h2 className="story-item headline mt-4 mb-6 text-4xl sm:text-5xl" style={{ '--i': 1 } as CSSProperties}>
          {props.title}
        </h2>
        {props.children}
      </div>
    </section>
  )
}

function FeatureLink({ i, to, className, children }: { i: number; to: string; className: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={`story-item press pointer-events-auto mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display font-semibold [text-shadow:none] ${className}`}
      style={{ '--i': i } as CSSProperties}
    >
      {children} <ArrowRight className="size-4" aria-hidden="true" />
    </Link>
  )
}

/** How much of Mars survives the rules, drawn to scale: the coloured part of the bar is 4.5 % of its width. */
function Funnel({ zones }: { zones: number }) {
  return (
    <div className="space-y-3 font-mono text-xs text-ink-muted">
      <div className="flex items-center gap-3">
        <span className="w-32 shrink-0 whitespace-nowrap">Whole planet</span>
        <span className="h-2 flex-1 rounded-full bg-white/20" />
        <span className="w-14 text-right text-ink tabular-nums">100 %</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-32 shrink-0 whitespace-nowrap">Passes all rules</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
          <span className="block h-full w-[4.5%] rounded-full bg-accent" />
        </span>
        <span className="w-14 text-right text-ink tabular-nums">4.5 %</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="w-32 shrink-0 whitespace-nowrap">Zones we kept</span>
        <span className="flex flex-1 gap-1.5">
          {Array.from({ length: zones }, (_, i) => (
            <span key={i} className="size-2 rounded-full bg-accent shadow-[0_0_10px_var(--body-accent)]" />
          ))}
        </span>
        <span className="w-14 text-right text-ink tabular-nums">{zones}</span>
      </div>
    </div>
  )
}

function Chips({ i, items }: { i: number; items: string[] }) {
  return (
    <ul className="story-item mt-6 flex flex-wrap gap-2" style={{ '--i': i } as CSSProperties} aria-label="Landing rules">
      {items.map((item) => (
        <li key={item} className="rounded-full border border-white/20 bg-space/50 px-3 py-1 text-[0.8rem] text-ink/90 backdrop-blur-sm [text-shadow:none]">
          {item}
        </li>
      ))}
    </ul>
  )
}

function Rule({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-2xl font-semibold whitespace-nowrap tabular-nums">{value}</dd>
      <dd className="mt-1 text-[0.8rem] leading-snug text-ink-muted">{label}</dd>
    </div>
  )
}

function Proof({ i, figure, title, children }: { i: number; figure: string; title: string; children: ReactNode }) {
  return (
    <div className="story-item border-t border-white/25 pt-5" style={{ '--i': i } as CSSProperties}>
      <p className="font-display text-5xl leading-none font-semibold tabular-nums">{figure}</p>
      <h3 className="mt-3 font-display text-xl leading-snug font-medium">{title}</h3>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/80">{children}</p>
    </div>
  )
}

function Door(props: { i: number; to: string; accent: string; name: string; figure: number; label: string; children: ReactNode }) {
  return (
    <Link
      to={props.to}
      style={{ '--i': props.i, '--body-accent': props.accent } as CSSProperties}
      className="story-item press group glass flex flex-col rounded-2xl p-6 hover:border-accent/70"
    >
      <span className="flex items-center justify-between">
        <span className="flex items-center gap-2.5 font-display text-3xl font-semibold">
          <span className="size-2.5 rounded-full bg-accent" aria-hidden="true" />
          {props.name}
        </span>
        <ArrowRight className="size-5 text-ink-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent" aria-hidden="true" />
      </span>
      <span className="mt-6 flex items-baseline gap-2.5">
        <span className="font-display text-5xl leading-none font-semibold text-accent tabular-nums">{props.figure}</span>
        <span className="text-ink-muted">{props.label}</span>
      </span>
      <span className="mt-3 text-[0.95rem] leading-relaxed text-ink/80">{props.children}</span>
    </Link>
  )
}

/**
 * Drives the scroll story. Reports the scroll position to the 3D scene as a stage number (the data-stage of the
 * section whose centre is at mid-screen, blended toward the next one), and marks each section with data-in-view
 * while a good part of it is on screen, which lets its .story-item children in.
 */
function useStory() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const sections = Array.from(ref.current?.querySelectorAll<HTMLElement>('[data-stage]') ?? [])
    if (sections.length === 0) return
    const update = () => {
      const view = window.innerHeight
      const boxes = sections.map((el) => ({ el, stage: Number(el.dataset.stage), rect: el.getBoundingClientRect() }))
      const centre = (b: (typeof boxes)[number]) => b.rect.top + b.rect.height / 2
      let stage = boxes[0].stage
      for (let i = 0; i < boxes.length; i++) {
        const next = boxes[i + 1]
        if (view / 2 < centre(boxes[i])) break
        stage = boxes[i].stage
        if (next && view / 2 < centre(next)) {
          stage += ((view / 2 - centre(boxes[i])) / (centre(next) - centre(boxes[i]))) * (next.stage - boxes[i].stage)
          break
        }
      }
      sceneStore.setStage(stage)
      for (const b of boxes) {
        const visible = Math.min(b.rect.bottom, view) - Math.max(b.rect.top, 0)
        if (visible >= Math.min(b.rect.height, view) * 0.3) b.el.dataset.inView = ''
        else delete b.el.dataset.inView
      }
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      sceneStore.setStage(0)
    }
  }, [])
  return ref
}
