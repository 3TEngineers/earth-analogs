import { ArrowRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'

/**
 * About page ("/about"): the challenge, the team, the data and image credits, and how AI was used.
 * The method and its limits live on the calculations page. Facts follow docs/DATA_SOURCES.md and the AI log in
 * docs/PROJECT_HISTORY.md §13 — keep them in sync.
 */
export function AboutPage() {
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <main className="relative z-10 min-h-svh px-6 pt-28 pb-24 sm:px-10">
      {/* Veil over the 3D scene, the size of the screen (a blur as tall as the page is costly to paint). */}
      <div className="fixed inset-0 -z-10 bg-space/75 backdrop-blur-[6px]" aria-hidden="true" />
      <SiteHeader />
      <article className="mx-auto max-w-5xl">
        <header className="max-w-3xl">
          <p className="stagger eyebrow text-ink-muted" style={step(0)}>
            NASA Space Apps Challenge 2026 · Team 3TE
          </p>
          <h1 className="stagger headline mt-4 text-5xl sm:text-6xl" style={step(1)}>
            About the project
          </h1>
          <p className="stagger mt-6 text-lg leading-relaxed text-ink/90" style={step(2)}>
            Our challenge: <em className="text-ink not-italic">Identify Earth locations that analog the permanent Moon base locations and Mars</em>.
            Instead of starting from places where we have already landed, we first found our own landing zones on Mars and base
            sites on the Moon, then searched Earth for the ground where crews could rehearse for each one.
          </p>
          <Link
            to="/calculations"
            className="stagger press mt-6 inline-flex items-center gap-2 font-display font-medium underline decoration-white/30 underline-offset-8 hover:decoration-white"
            style={step(3)}
          >
            How we calculated it <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </header>

        <div className="stagger" style={step(4)}>
          <Section title="The team">
            <ul className="grid gap-4 md:grid-cols-3">
              <Person name="Sadık Bora Erteni" role="Data and analysis">
                The pipeline: screening Mars and the lunar south pole, the global Earth pass, ranking and the data files the site
                reads.
              </Person>
              <Person name="Deniz Aslan" role="3D and interface">
                The 3D scene with the Moon, Earth and Mars, the flights between them, and the design of the site.
              </Person>
              <Person name="Kmar" role="Research and content">
                Published landing constraints, the Artemis III regions, known analog sites and what can be tested where.
              </Person>
            </ul>
          </Section>

          <Section title="Data we used">
            <div className="grid gap-8 sm:grid-cols-3">
              <DataGroup
                name="Mars"
                dot="bg-mars"
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
                dot="bg-moon"
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
                dot="bg-earth"
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

          <Section title="How we used AI">
            <ul className="grid gap-x-10 gap-y-4 leading-relaxed text-ink/85 md:grid-cols-3">
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
          <Link to="/explore/mars" className="press inline-flex items-center gap-2 rounded-full bg-mars px-6 py-3 font-display font-semibold text-space hover:bg-mars/90">
            Explore Mars <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link to="/explore/moon" className="press rounded-full border border-white/25 px-6 py-3 font-display font-medium hover:border-white/60">
            Explore the Moon
          </Link>
          <Link to="/earth" className="press rounded-full border border-white/25 px-6 py-3 font-display font-medium hover:border-white/60">
            See the places on Earth
          </Link>
        </div>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <h2 className="headline mb-6 border-b border-line pb-4 text-3xl">{title}</h2>
      {children}
    </section>
  )
}

function Person({ name, role, children }: { name: string; role: string; children: ReactNode }) {
  return (
    <li className="rounded-2xl border border-line bg-white/[0.03] p-5">
      <p className="font-display text-xl font-semibold">{name}</p>
      <p className="eyebrow mt-1.5 text-ink-muted">{role}</p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/85">{children}</p>
    </li>
  )
}

function DataGroup({ name, dot, items }: { name: string; dot: string; items: string[] }) {
  return (
    <div>
      <p className="flex items-center gap-2.5 font-display text-xl font-semibold">
        <span className={`size-2.5 rounded-full ${dot}`} aria-hidden="true" />
        {name}
      </p>
      <ul className="mt-3 space-y-2 text-[0.9rem] leading-snug text-ink/80">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </div>
  )
}
