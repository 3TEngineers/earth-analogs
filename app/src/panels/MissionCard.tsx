import { ArrowLeft, ArrowRight, ImageOff, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { assetUrl } from '../data/assetUrl'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Site } from '../types/data'
import { formatLatLon } from './format'
import { SelectionChecklist } from './SelectionChecklist'

/** Card for the selected site: facts, summary, purpose, "Why this site", where Earth falls short, and the jump to Earth. */
export function MissionCard({ site }: { site: Site }) {
  const { reset, showAnalogs } = useAppState()
  const { analogs } = useSelection()
  const candidate = site.selection.role === 'candidate'
  const passed = site.selection.criteria.filter((c) => c.pass === true).length
  const total = site.selection.criteria.length

  return (
    <article>
      <div className="sticky top-0 z-10 -mx-5 bg-[#080b14] px-5 pt-3 pb-3 backdrop-blur-2xl sm:-mx-7 sm:px-7 md:pt-5">
        <button
          type="button"
          onClick={reset}
          className="press inline-flex items-center gap-1.5 rounded-md text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All sites
        </button>
      </div>

      <header className="mt-2">
        <p className="accent-transition font-mono text-xs tracking-[0.2em] text-accent uppercase">
          {candidate ? `Candidate · ${site.selection.goal}` : `Past landing · ${site.year ?? ''}`}
        </p>
        <h2 className="mt-2 font-display text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] lg:text-[2rem]">{site.name}</h2>
        {!candidate && <p className="mt-1 text-[15px] text-ink/70">{site.mission}</p>}
      </header>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.03]">
        <Stat label="Location" value={formatLatLon(site.lat, site.lon).replace(' · ', '\n')} />
        <Stat label="Criteria" value={`${passed} of ${total}`} tone={passed === total ? 'text-similar' : 'text-different'} />
        <Stat label={candidate ? 'Found by' : 'Agency'} value={site.agency} />
      </dl>

      {site.image ? (
        <img src={assetUrl(site.image)} alt={`Orbital view of ${site.name}`} className="mt-5 w-full rounded-xl border border-white/10" />
      ) : (
        <div className="mt-5 flex h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 text-sm text-ink-muted">
          <ImageOff className="size-4" aria-hidden="true" /> Orbital image coming soon
        </div>
      )}

      <p className="mt-6 text-base leading-relaxed text-ink/85">{site.summary}</p>

      {site.processes.length > 0 && (
        <ul aria-label="Surface processes" className="mt-4 flex flex-wrap gap-1.5">
          {site.processes.map((p) => (
            <li key={p} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[13px] text-ink/75">
              {p}
            </li>
          ))}
        </ul>
      )}

      {site.purpose && (
        <Section title="Why go there">
          <p className="text-[15px] leading-relaxed text-ink/80">{site.purpose.text}</p>
        </Section>
      )}

      <Section title={candidate ? 'Why this site' : 'Checked against our rules'}>
        <SelectionChecklist selection={site.selection} />
      </Section>

      {site.limits.length > 0 && (
        <Section title="Where Earth falls short">
          <ul className="space-y-2">
            {site.limits.map((l) => (
              <li key={l} className="flex gap-2.5 text-[15px] leading-snug text-ink/80">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-different" aria-hidden="true" />
                {l}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {analogs.length > 0 ? (
        <div className="sticky bottom-0 -mx-5 mt-8 bg-gradient-to-t from-[#080b14] from-60% to-transparent px-5 pt-6 pb-5 sm:-mx-7 sm:px-7">
          <button
            type="button"
            onClick={() => showAnalogs(analogs[0].id)}
            className="press accent-transition inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-display text-base font-medium text-space hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Show Earth training areas <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="h-8" />
      )}
    </article>
  )
}

function Stat({ label, value, tone = 'text-ink' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="px-3.5 py-3">
      <dt className="font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">{label}</dt>
      <dd className={`mt-1 font-mono text-sm leading-snug whitespace-pre-line tabular-nums ${tone}`}>{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="mb-3 border-b border-white/10 pb-2 font-mono text-xs tracking-[0.18em] text-ink uppercase">{title}</h3>
      {children}
    </section>
  )
}
