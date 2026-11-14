import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { assetUrl } from '../data/assetUrl'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Site } from '../types/data'
import { formatLatLon } from './format'
import { SelectionChecklist } from './SelectionChecklist'

/**
 * The selected site, laid out like a landing-page story chapter: eyebrow, big name, accent bar, summary, a stats row,
 * then the evidence (criteria), where Earth falls short, and the jump to Earth. Items arrive staggered from blur.
 */
export function MissionCard({ site }: { site: Site }) {
  const { reset, showAnalogs } = useAppState()
  const { analogs } = useSelection()
  const candidate = site.selection.role === 'candidate'
  const passed = site.selection.criteria.filter((c) => c.pass === true).length
  const total = site.selection.criteria.length
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  return (
    <article className="md:pt-8">
      <div className="sticky top-0 z-10 -mx-5 bg-[#080b14] px-5 pt-3 pb-3 sm:-mx-7 sm:px-7 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <button
          type="button"
          onClick={reset}
          className="press inline-flex items-center gap-1.5 rounded-md font-mono text-xs tracking-[0.18em] text-ink-muted uppercase hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All sites
        </button>
      </div>

      <header className="mt-4 md:mt-8">
        <p className="stagger accent-transition font-mono text-xs tracking-[0.22em] text-accent uppercase" style={step(0)}>
          {candidate ? `Candidate · ${site.selection.goal}` : `Past landing · ${site.year ?? ''} · ${site.agency}`}
        </p>
        <h2
          className="stagger mt-3 font-serif text-[2.6rem] leading-[1.02] tracking-[0.02em] uppercase md:text-5xl lg:text-6xl"
          style={step(1)}
        >
          {site.name}
        </h2>
        <span className="stagger accent-transition mt-5 block h-0.5 w-12 rounded-full bg-accent" style={step(2)} aria-hidden="true" />
        {!candidate && (
          <p className="stagger mt-4 text-base text-ink/70" style={step(3)}>
            {site.mission}
          </p>
        )}
        <p className="stagger mt-5 text-base leading-relaxed text-ink/85 md:text-lg" style={step(3)}>
          {site.summary}
        </p>
      </header>

      <dl className="stagger mt-7 grid grid-cols-3 gap-4 border-t border-white/15 pt-5" style={step(4)}>
        <Stat label="Location" value={formatLatLon(site.lat, site.lon).replace(' · ', '\n')} />
        <Stat label="Criteria" value={`${passed} / ${total}`} tone={passed === total ? 'text-similar' : 'text-different'} />
        <Stat label={candidate ? 'Found by' : 'Agency'} value={site.agency} />
      </dl>

      {site.processes.length > 0 && (
        <ul aria-label="Surface processes" className="stagger mt-6 flex flex-wrap gap-x-4 gap-y-1" style={step(5)}>
          {site.processes.map((p) => (
            <li key={p} className="font-mono text-xs tracking-[0.14em] text-ink/70 uppercase before:mr-2 before:text-accent before:content-['+']">
              {p}
            </li>
          ))}
        </ul>
      )}

      <div className="stagger" style={step(6)}>
        {site.image ? (
          <img src={assetUrl(site.image)} alt={`Orbital view of ${site.name}`} className="mt-8 w-full rounded-lg" />
        ) : (
          <div className="mt-8 flex h-16 items-center justify-center gap-2 border-y border-dashed border-white/10 text-sm text-ink-muted">
            <ImageOff className="size-4" aria-hidden="true" /> Orbital image coming soon
          </div>
        )}

        {site.purpose && (
          <Section title="Why go there">
            <p className="text-base leading-relaxed text-ink/85">{site.purpose.text}</p>
          </Section>
        )}

        <Section title={candidate ? 'Why this site' : 'Checked against our rules'}>
          <SelectionChecklist selection={site.selection} />
        </Section>

        {site.limits.length > 0 && (
          <Section title="Where Earth falls short">
            <ul className="space-y-2 border-l-2 border-different/70 pl-4">
              {site.limits.map((l) => (
                <li key={l} className="text-[15px] leading-relaxed text-ink/75">
                  {l}
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {analogs.length > 0 ? (
        <div className="sticky bottom-0 -mx-5 mt-10 bg-gradient-to-t from-[#080b14] from-60% to-transparent px-5 pt-6 pb-6 sm:-mx-7 sm:px-7 md:mx-0 md:from-[#05070d] md:from-50% md:px-0">
          <button
            type="button"
            onClick={() => showAnalogs(analogs[0].id)}
            className="press accent-transition inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-space shadow-[0_0_32px_rgb(255_255_255/0.1)] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-md:w-full"
          >
            Show Earth training areas <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="h-10" />
      )}
    </article>
  )
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className={`font-mono text-base leading-snug whitespace-pre-line tabular-nums md:text-lg ${tone}`}>{value}</dd>
      <dd className="mt-1 text-xs text-ink-muted">{label}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h3 className="mb-1 border-b border-white/15 pb-2.5 font-mono text-xs tracking-[0.2em] text-ink uppercase">{title}</h3>
      <div className="pt-3">{children}</div>
    </section>
  )
}
