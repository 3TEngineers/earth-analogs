import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'

/**
 * About page ("/about"), in the landing story style: about us (team, roles) and about the project (method in short,
 * the data we used, where it stops, image credits, AI usage). Facts follow docs/SCREENING_RESULTS.md,
 * docs/ANALOG_RESULTS.md, docs/DATA_SOURCES.md and the AI log in docs/PROJECT_HISTORY.md §13 — keep them in sync.
 * Written by Deniz while Kmar is away; Kmar may rewrite any of it.
 */
export function AboutPage() {
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <main className="relative z-10 min-h-svh bg-space/80 px-6 pt-28 pb-24 backdrop-blur-md sm:px-12">
      <SiteHeader />
      <article className="mx-auto max-w-3xl">
        <header>
          <p className="stagger font-mono text-xs tracking-[0.22em] text-earth uppercase" style={step(0)}>
            NASA Space Apps Challenge 2026 · Team 3TE
          </p>
          <h1 className="stagger mt-4 font-serif text-6xl leading-none tracking-[0.05em] uppercase sm:text-8xl" style={step(1)}>
            About
          </h1>
          <span className="stagger mt-6 block h-0.5 w-14 rounded-full bg-earth" style={step(2)} aria-hidden="true" />
          <p className="stagger mt-6 max-w-2xl text-lg leading-relaxed text-ink/85" style={step(3)}>
            Our challenge: <em className="not-italic text-ink">Identify Earth locations that analog the permanent Moon base locations and
            Mars</em>. Instead of starting from places where we have already landed, we first found our own landing zones on Mars
            and base sites on the Moon, then searched Earth for the ground where crews could rehearse for each one.
          </p>
        </header>

        <div className="stagger" style={step(4)}>
          <Section n="01" title="The team">
            <ul className="divide-y divide-white/10">
              <Person name="Sadık Bora Erteni" role="Data and analysis">
                The pipeline: screening Mars and the lunar south pole, the global Earth pass, ranking and the data files the
                site reads.
              </Person>
              <Person name="Deniz Aslan" role="3D and interface">
                The 3D scene with the Moon, Earth and Mars, the flights between them, and the design of the site.
              </Person>
              <Person name="Kmar" role="Research and content">
                Published landing constraints, the Artemis III regions, known analog sites and what can be tested where.
              </Person>
            </ul>
          </Section>

          <Section n="02" title="How we found the places">
            <ol className="space-y-5">
              <Step title="Screen">
                The whole of Mars and the Moon south of 84° S, checked against limits from published mission documents. Mars:
                elevation (air to slow down in), latitude (winter sun), thermal inertia (firm, not dusty ground), slope and
                relief. Moon: sunlight, Earth in view, slope and distance to permanent shadow. Result: 4 landing zones and 3
                base sites.
              </Step>
              <Step title="Validate">
                The same rules on the 11 past Mars landings: Viking 1, Spirit, InSight and Perseverance pass every rule; the
                others fail for known reasons. ESA&apos;s Oxia Planum also passes. On the Moon, 4 of 7 Artemis III features have
                passing ground next to them.
              </Step>
              <Step title="Match">
                Earth&apos;s land on a 0.25° grid by dryness, vegetation and temperature, then ranked for each site on terrain
                (slope distributions at the same pixel size) and rock type. Three places per site, at least 500 km apart: 21
                training areas. Published analogs such as the Dry Valleys, Qaidam and Atacama land in the top 1.5 % on climate.
              </Step>
            </ol>
          </Section>

          <Section n="03" title="Where it stops">
            <ul className="space-y-3 border-l-2 border-different/70 pl-5 text-[15px] leading-relaxed text-ink/80">
              <li>
                This is a pre-screening at kilometre scale (Mars) and 240 m (Moon). Real site selection uses metre-scale
                images and takes years.
              </li>
              <li>Rock type on Earth comes from a 0.5° map, and the rock family of each site is our reading of its geology.</li>
              <li>Water history on Mars (lakes, deltas, hydrated minerals) is not scored: there is no global, comparable layer.</li>
              <li>The lunar ridges are steeper than the polar places we found on Earth, so lunar terrain matches are weak — the reports say so.</li>
              <li>
                No place on Earth has lower gravity, vacuum, a thin CO₂ atmosphere, the Moon&apos;s ~300 °C day–night swing or
                space radiation. Every report lists this.
              </li>
            </ul>
          </Section>

          <Section n="04" title="Data we used">
            <div className="grid gap-8 sm:grid-cols-3">
              <DataGroup
                name="Mars"
                color="text-mars"
                items={[
                  'MOLA MEGDR topography, 16 px/deg, and MOLA 463 m DEM',
                  'MGS TES thermal inertia',
                  'THEMIS day IR mosaic (close-ups)',
                  'Viking MDIM 2.1 colour mosaic (globe)',
                  'Published landing constraints: Pathfinder, MER, Phoenix, MSL, InSight, Mars 2020',
                ]}
              />
              <DataGroup
                name="Moon"
                color="text-moon"
                items={[
                  'LOLA south-pole slope map, 240 m',
                  'LOLA sunlit time, Earth visibility and permanent shadow (NASA PGDA)',
                  'LRO WAC mosaics (close-ups)',
                  'NASA SVS CGI Moon Kit (globe)',
                  'Artemis III candidate regions',
                ]}
              />
              <DataGroup
                name="Earth"
                color="text-earth"
                items={[
                  'GPM IMERG precipitation',
                  'MODIS land surface temperature, vegetation (NDVI) and land cover',
                  'Copernicus DEM GLO-30',
                  'GLiM global lithological map (Hartmann & Moosdorf 2012)',
                  'Sentinel-2 cloudless 2020 by EOX (close-ups), NASA Blue Marble (globe)',
                ]}
              />
            </div>
            <p className="mt-6 text-sm leading-relaxed text-ink-muted">
              Close-up images are cut live from the USGS Astrogeology and EOX map servers; credits sit under each image. Full
              list with links and resolutions in the project repository (<span className="font-mono text-xs">docs/DATA_SOURCES.md</span>).
            </p>
          </Section>

          <Section n="05" title="AI usage">
            <ul className="space-y-3 text-[15px] leading-relaxed text-ink/80">
              <li>
                The idea — find new candidate sites first, then their Earth training areas, and show where each analogy breaks —
                and the choice of challenge are the team&apos;s, shaped with our mentor.
              </li>
              <li>
                We used Claude (Claude Code) as an assistant: to compare the challenges, check data availability, draft the
                scoring method and documentation, and write code for the data pipeline and this website. We reviewed and tested
                what it produced.
              </li>
              <li>Every number on the site comes from the datasets above. No AI-generated images are used.</li>
            </ul>
          </Section>
        </div>

        <div className="mt-16 flex flex-wrap gap-3">
          <Link to="/explore/mars" className="press rounded-full bg-mars px-6 py-2.5 font-medium text-space hover:bg-mars/90">
            Explore Mars
          </Link>
          <Link
            to="/explore/moon"
            className="press rounded-full border border-moon/50 px-6 py-2.5 font-medium text-moon hover:border-moon hover:bg-moon/10"
          >
            Explore the Moon
          </Link>
        </div>
      </article>
    </main>
  )
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="mb-6 flex items-baseline gap-4 border-b border-white/15 pb-3">
        <span className="font-mono text-xs text-earth tabular-nums">{n}</span>
        <span className="font-mono text-xs tracking-[0.2em] text-ink uppercase">{title}</span>
      </h2>
      {children}
    </section>
  )
}

function Person({ name, role, children }: { name: string; role: string; children: ReactNode }) {
  return (
    <li className="grid gap-x-8 gap-y-1 py-5 sm:grid-cols-[14rem_1fr]">
      <div>
        <p className="font-serif text-2xl tracking-[0.03em] uppercase">{name}</p>
        <p className="mt-1 font-mono text-[11px] tracking-[0.16em] text-ink-muted uppercase">{role}</p>
      </div>
      <p className="text-[15px] leading-relaxed text-ink/80 sm:pt-1">{children}</p>
    </li>
  )
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="grid gap-x-8 gap-y-1 sm:grid-cols-[8rem_1fr]">
      <h3 className="font-mono text-xs tracking-[0.18em] text-ink uppercase sm:pt-1">{title}</h3>
      <p className="text-[15px] leading-relaxed text-ink/80">{children}</p>
    </li>
  )
}

function DataGroup({ name, color, items }: { name: string; color: string; items: string[] }) {
  return (
    <div>
      <p className={`font-serif text-2xl tracking-[0.06em] uppercase ${color}`}>{name}</p>
      <ul className="mt-3 space-y-2 text-sm leading-snug text-ink/75">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}
