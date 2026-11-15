import { ArrowRight, ArrowUpRight } from 'lucide-react'
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
              <Person name="Sadık Bora Erteni" role="Data analysis and 3D visualisation" href="https://www.linkedin.com/in/sadik-bora-erteni/">
                Built the analysis pipeline with Deniz: the screening of Mars and the lunar south pole, the global Earth
                matching and the scoring model. Led the data-accuracy audits and worked on the 3D globes, the pages and their
                content.
              </Person>
              <Person name="Deniz Aslan" role="3D visualisation and data analysis" href="https://www.linkedin.com/in/deniz-aslan-358839274/">
                Built the interactive 3D experience of the Moon, Earth and Mars with Sadık, and the interface around it. Led the
                full re-validation of the Mars and Moon screening and worked on the data that selected the final landing zones.
              </Person>
              <Person name="Kamar Abid" role="Research and concept" href="https://www.linkedin.com/in/kamar-abid-679337374/">
                Helped shape the initial project concept. Researched the published landing constraints, NASA&apos;s Artemis III
                regions and the known analog sites, and cross-checked the field-test examples against their sources.
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
                  'MGS TES thermal inertia and albedo',
                  'USGS global geologic map of Mars (SIM 3292, Tanaka et al. 2014)',
                  'THEMIS day IR mosaic (close-ups)',
                  'Viking MDIM 2.1 colour mosaic (globe)',
                  'Published landing constraints: Pathfinder, MER, Phoenix, MSL, InSight, Mars 2020',
                ]}
              />
              <DataGroup
                name="Moon"
                dot="bg-moon"
                items={[
                  'LOLA south-pole slope map and elevation, 240 m',
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
                  'GPM IMERG precipitation climatology, 2000–2023',
                  'MODIS land surface temperature, vegetation (NDVI), albedo and land cover',
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
            <p className="max-w-3xl leading-relaxed text-ink/85">
              Yes, we used AI in this project, as an assistant. The idea, the method, every rule and every decision are the
              team&apos;s, shaped with our mentor; the breakdown below says where the tool helped.
            </p>
            <ul className="mt-6 grid gap-x-10 gap-y-5 leading-relaxed text-ink/85 md:grid-cols-3">
              <li>
                <strong className="font-display font-medium text-ink">Development support.</strong> Claude (Anthropic, through
                Claude Code) assisted with writing, reviewing and optimising code for the data pipeline and this website,
                including the 3D scene and its animations, and with debugging and library suggestions. The team directed the
                work, and reviewed and tested the results.
              </li>
              <li>
                <strong className="font-display font-medium text-ink">Research and documentation.</strong> Claude helped us
                compare the challenges, find datasets and published mission limits, cross-check our numbers against
                independent sources, and draft and edit the documentation and site text.
              </li>
              <li>
                <strong className="font-display font-medium text-ink">What is not AI.</strong> Every number on the site is
                computed from the NASA, USGS and ESA datasets listed above. No AI-generated images, video or audio are used:
                the planets and close-ups are real spacecraft imagery.
              </li>
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

function Person({ name, role, href, children }: { name: string; role: string; href: string; children: ReactNode }) {
  return (
    <li className="rounded-2xl border border-line bg-white/[0.03] p-5">
      <p className="font-display text-xl font-semibold">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${name} on LinkedIn (opens in a new tab)`}
          className="group inline-flex items-center gap-1.5 underline decoration-white/25 underline-offset-4 hover:decoration-white"
        >
          {name}
          <ArrowUpRight className="size-4 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
        </a>
      </p>
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
