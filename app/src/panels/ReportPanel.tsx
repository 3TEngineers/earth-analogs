import { ArrowLeft, ExternalLink } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { assetUrl } from '../data/assetUrl'
import { useData } from '../data/DataProvider'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Analog, Confidence } from '../types/data'
import { formatLatLon } from './format'

/**
 * K4 — report for the Earth training area in focus (phase `earth`), in the same story style as MissionCard:
 * eyebrow, big serif name, accent bar, stats row, a 1 · 2 · 3 switcher, one bar per dimension, then what is similar,
 * what is different, what to test, and the fixed "What Earth can't reproduce" note from site.limits.
 * Text is shown exactly as given in analogs.json — never recomputed from the scores.
 */
export function ReportPanel() {
  const { selectAnalog, backToSite } = useAppState()
  const { site, analogs, analog, dimensions } = useSelection()
  const data = useData()
  const mock = data.status === 'ready' && data.analogs.mock
  const current = analog ?? analogs[0] ?? null
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  if (!site || !current) return null

  return (
    <article key={current.id} className="pb-10 md:pt-8">
      <div className="sticky top-0 z-10 -mx-5 bg-[#080b14] px-5 pt-3 pb-3 sm:-mx-7 sm:px-7 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0">
        <button
          type="button"
          onClick={backToSite}
          className="press inline-flex items-center gap-1.5 rounded-md font-mono text-xs tracking-[0.18em] text-ink-muted uppercase hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to {site.name}
        </button>
      </div>

      {mock && (
        <p className="mt-4 border-l-2 border-different/70 pl-3 font-mono text-[11px] leading-relaxed tracking-[0.12em] text-different uppercase">
          Sample data — the real Earth ranking is still being computed
        </p>
      )}

      <Switcher analogs={analogs} currentId={current.id} onSelect={selectAnalog} />

      <header className="mt-8">
        <p className="stagger accent-transition font-mono text-xs tracking-[0.22em] text-accent uppercase" style={step(0)}>
          Training area {current.rank} of {analogs.length} · {current.known ? 'Known analog' : 'New candidate'}
        </p>
        <h2
          className="stagger mt-3 font-serif text-[2.6rem] leading-[1.02] tracking-[0.02em] uppercase md:text-5xl lg:text-6xl"
          style={step(1)}
        >
          {current.name}
        </h2>
        <p className="stagger mt-2 text-base text-ink/70" style={step(1)}>
          {current.country} · for {site.name}
        </p>
        <span className="stagger accent-transition mt-5 block h-0.5 w-12 rounded-full bg-accent" style={step(2)} aria-hidden="true" />
      </header>

      <dl className="stagger mt-7 grid grid-cols-3 gap-4 border-t border-white/15 pt-5" style={step(3)}>
        <Stat label="Match score" value={`${current.totalScore}`} suffix="/100" />
        <Stat label="Location" value={formatLatLon(current.lat, current.lon).replace(' · ', '\n')} />
        <Stat label="Area radius" value={`${current.radiusKm}`} suffix=" km" />
      </dl>

      <div className="stagger" style={step(4)}>
        {current.image && <img src={assetUrl(current.image)} alt={`Satellite view of ${current.name}`} className="mt-8 w-full rounded-lg" />}

        {dimensions.length > 0 && (
          <Section title="How close it is">
            <ul className="space-y-4">
              {dimensions.map((d) => {
                const s = current.scores[d.id]
                return (
                  <li key={d.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-ink">{d.label}</span>
                      <span className="flex items-baseline gap-2 font-mono text-sm tabular-nums">
                        {s?.confidence && <ConfidenceTag value={s.confidence} />}
                        {s?.score == null ? <span className="text-ink-muted">No data</span> : s.score}
                      </span>
                    </div>
                    <Meter score={s?.score ?? null} />
                    <p className="mt-1 text-xs text-ink-muted">{d.description}</p>
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        {current.similarities.length > 0 && (
          <Section title="Where it's similar">
            <Bullets items={current.similarities} tone="before:bg-similar" />
          </Section>
        )}

        {current.differences.length > 0 && (
          <Section title="Where it's different">
            <Bullets items={current.differences} tone="before:bg-different" />
          </Section>
        )}

        {current.tests.length > 0 && (
          <Section title="What you can test here">
            <ul className="divide-y divide-white/10">
              {current.tests.map((t) => (
                <li key={t.title} className="py-3">
                  <p className="text-[15px] text-ink">{t.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/65">{t.detail}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="What Earth can't reproduce">
          <ul className="space-y-2 border-l-2 border-different/70 pl-4">
            {(site.limits.length > 0 ? site.limits : ['Gravity, vacuum and space radiation are different on every planet.']).map((l) => (
              <li key={l} className="text-[15px] leading-relaxed text-ink/75">
                {l}
              </li>
            ))}
          </ul>
        </Section>

        {current.processes.length > 0 && (
          <ul aria-label="Surface processes" className="mt-8 flex flex-wrap gap-x-4 gap-y-1">
            {current.processes.map((p) => (
              <li key={p} className="font-mono text-xs tracking-[0.14em] text-ink/70 uppercase before:mr-2 before:text-accent before:content-['+']">
                {p}
              </li>
            ))}
          </ul>
        )}

        {current.sources.length > 0 && (
          <Section title="Sources">
            <ul className="space-y-1.5">
              {current.sources.map((src) => (
                <li key={src}>
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm break-all text-ink/70 underline decoration-white/20 underline-offset-4 hover:text-ink"
                  >
                    {src.replace(/^https?:\/\//, '')} <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </article>
  )
}

/** 1 · 2 · 3 — the site's training areas; the current one is filled with the accent. */
function Switcher({ analogs, currentId, onSelect }: { analogs: Analog[]; currentId: string; onSelect: (id: string) => void }) {
  return (
    <nav aria-label="Training areas" className="mt-6 grid grid-cols-3 gap-2">
      {analogs.map((a) => {
        const active = a.id === currentId
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            aria-current={active}
            className={`press accent-transition min-w-0 border-t-2 pt-2 text-left focus-visible:outline-2 focus-visible:outline-accent ${
              active ? 'border-accent' : 'border-white/15 hover:border-white/40'
            }`}
          >
            <span className={`block font-mono text-xs tabular-nums ${active ? 'text-accent' : 'text-ink-muted'}`}>
              {String(a.rank).padStart(2, '0')}
            </span>
            <span className={`mt-0.5 block truncate text-[13px] ${active ? 'text-ink' : 'text-ink-muted'}`}>{a.name}</span>
          </button>
        )
      })}
    </nav>
  )
}

/** Quiet meter: 20 thin ticks, filled ones in soft white, no colour or glow (scores are relative, not alarms). */
function Meter({ score }: { score: number | null }) {
  const filled = score === null ? 0 : Math.round(score / 5)
  return (
    <div className="mt-2 flex gap-[3px]" aria-hidden="true">
      {Array.from({ length: 20 }, (_, i) => (
        <span key={i} className={`h-1.5 flex-1 rounded-[1px] ${i < filled ? 'bg-ink/55' : 'bg-white/[0.07]'}`} />
      ))}
    </div>
  )
}

function ConfidenceTag({ value }: { value: Confidence }) {
  const dots = value === 'high' ? 3 : value === 'medium' ? 2 : 1
  return (
    <span className="flex items-center gap-0.5" title={`${value} confidence`} aria-label={`${value} confidence`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`size-1 rounded-full ${i <= dots ? 'bg-ink/70' : 'bg-white/15'}`} />
      ))}
    </span>
  )
}

function Bullets({ items, tone }: { items: string[]; tone: string }) {
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li
          key={t}
          className={`relative pl-4 text-[15px] leading-relaxed text-ink/80 before:absolute before:top-[0.6em] before:left-0 before:size-1.5 before:rounded-full ${tone}`}
        >
          {t}
        </li>
      ))}
    </ul>
  )
}

function Stat({ label, value, suffix, tone = 'text-ink' }: { label: string; value: string; suffix?: string; tone?: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className={`font-mono text-base leading-snug whitespace-pre-line tabular-nums md:text-lg ${tone}`}>
        {value}
        {suffix && <span className="text-xs text-ink-muted">{suffix}</span>}
      </dd>
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
