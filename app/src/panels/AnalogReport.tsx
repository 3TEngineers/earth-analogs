import { ArrowLeft, ExternalLink } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import type { Analog, Confidence, Dimension, Site } from '../types/data'
import { formatLatLon, groundOf, placeOf } from './format'
import { orbitalImage } from './orbitalImage'
import { OrbitalView } from './OrbitalView'
import { GroupTitle, SidePanel, Tabs } from './ui'

type Tab = 'match' | 'tests' | 'limits'

interface Props {
  /** The site this place stands in for. */
  site: Site
  analog: Analog
  /** The site's training areas, by rank: the switcher at the top. */
  siblings: Analog[]
  dimensions: Dimension[]
  onSelect: (analogId: string) => void
  back: { label: string; onClick: () => void }
  /** Extra action under the header (the Earth page links to the site here). */
  action?: ReactNode
}

/**
 * Report for one training area on Earth, used by the explore flow (`earth` phase) and by the Earth page.
 * Three tabs keep it short: how close the match is, what a crew can test there, and where the likeness stops.
 * Sentences are shown exactly as the pipeline wrote them into analogs.json, never recomputed from the scores.
 */
export function AnalogReport({ site, analog, siblings, dimensions, onSelect, back, action }: Props) {
  const [tab, setTab] = useState<Tab>('match')
  const step = (i: number) => ({ '--i': i }) as CSSProperties
  const bodyName = site.body === 'mars' ? 'Mars' : 'Moon'
  const ground = groundOf(analog.name)

  return (
    <SidePanel label={`Training area: ${analog.name}`} viewKey={analog.id}>
      <button type="button" onClick={back.onClick} className="press inline-flex items-center gap-1.5 rounded-md font-display text-sm font-medium text-ink-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" /> {back.label}
      </button>

      {siblings.length > 1 && (
        <nav aria-label={`Training areas for ${site.name}`} className="mt-4 grid grid-cols-3 gap-2">
          {siblings.map((a) => {
            const active = a.id === analog.id
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onSelect(a.id)}
                aria-current={active}
                className={`press min-w-0 rounded-lg border px-3 py-2 text-left ${active ? 'border-earth/70 bg-earth/10' : 'border-line hover:border-white/40'}`}
              >
                <span className={`block font-mono text-[11px] tabular-nums ${active ? 'text-earth' : 'text-ink-muted'}`}>
                  {a.rank} · {a.totalScore}/100
                </span>
                <span className={`mt-0.5 block truncate font-display text-[0.95rem] font-medium ${active ? 'text-ink' : 'text-ink-muted'}`}>{placeOf(a.name)}</span>
              </button>
            )
          })}
        </nav>
      )}

      <header className="mt-5 grid grid-cols-[1fr_auto] items-start gap-x-5">
        <div className="min-w-0">
          <p className="stagger eyebrow text-earth" style={step(0)}>
            Earth · Training area {analog.rank} of {siblings.length} · {analog.known ? 'Published analog region' : 'New place'}
          </p>
          <h2 className="stagger headline mt-2.5 text-[2rem] sm:text-[2.5rem]" style={step(1)}>
            {placeOf(analog.name)}
          </h2>
          <p className="stagger mt-2 text-ink/85" style={step(2)}>
            {ground ? `${ground} · ` : ''}
            {analog.country}
          </p>
          <p className="stagger mt-1 font-mono text-[0.8rem] text-ink-muted tabular-nums" style={step(2)}>
            {formatLatLon(analog.lat, analog.lon)} · about {analog.radiusKm * 2} km across
          </p>
        </div>
        <p className="stagger text-right" style={step(1)}>
          <span className="font-display text-6xl leading-none font-semibold tabular-nums">{analog.totalScore}</span>
          <span className="mt-1 block font-mono text-[11px] text-ink-muted">match / 100</span>
        </p>
      </header>

      <div className="stagger mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.03] px-3.5 py-2.5" style={step(3)}>
        <p className="flex min-w-0 items-center gap-2 text-[0.95rem]">
          <span className={`size-2 shrink-0 rounded-full ${site.body === 'mars' ? 'bg-mars' : 'bg-moon'}`} aria-hidden="true" />
          <span className="text-ink-muted">Stands in for</span>
          <span className="truncate font-display font-medium">
            {site.name}, {bodyName}
          </span>
        </p>
        {action}
      </div>

      {analog.known && analog.knownName && (
        <p className="stagger mt-2.5 text-[0.85rem] leading-relaxed text-ink-muted" style={step(3)}>
          Not a new find: this spot lies in a region scientists already use as an analog (
          {analog.knownRef ? (
            <a href={analog.knownRef} target="_blank" rel="noreferrer" className="text-ink/85 underline decoration-white/25 underline-offset-4 hover:text-ink">
              {analog.knownName}
            </a>
          ) : (
            <span className="text-ink/85">{analog.knownName}</span>
          )}
          ).
        </p>
      )}

      <div className="stagger mt-5" style={step(4)}>
        <Tabs
          tabs={[
            { id: 'match', label: 'How close it is' },
            { id: 'tests', label: 'What to test', count: String(analog.tests.length) },
            { id: 'limits', label: 'Limits and sources' },
          ]}
          value={tab}
          onChange={setTab}
        />

        <div key={tab} className="panel-in pt-5">
          {tab === 'match' && (
            <div className="space-y-6">
              <OrbitalView key={analog.id} image={orbitalImage('earth', analog.lat, analog.lon, analog.image)} alt={`Satellite view of ${analog.name}`} />
              {dimensions.length > 0 && (
                <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {dimensions.map((d) => {
                    const s = analog.scores[d.id]
                    return (
                      <li key={d.id}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="font-display font-medium">{d.label}</span>
                          <span className="flex items-baseline gap-2 font-mono text-sm tabular-nums">
                            {s?.confidence && <ConfidenceDots value={s.confidence} />}
                            {s?.score == null ? <span className="text-ink-muted">not scored</span> : s.score}
                          </span>
                        </div>
                        <Meter score={s?.score ?? null} />
                        <p className="mt-1.5 text-[0.8rem] leading-snug text-ink-muted">{s?.note || d.description}</p>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="grid gap-6 sm:grid-cols-2">
                {analog.similarities.length > 0 && (
                  <Block title="Where it is similar">
                    <Bullets items={analog.similarities} tone="before:bg-similar" />
                  </Block>
                )}
                {analog.differences.length > 0 && (
                  <Block title="Where it differs">
                    <Bullets items={analog.differences} tone="before:bg-different" />
                  </Block>
                )}
              </div>
            </div>
          )}

          {tab === 'tests' && (
            <div className="space-y-3">
              {analog.tests.length === 0 && <p className="text-ink-muted">No dimension is close enough here to suggest a test.</p>}
              {analog.tests.map((t) => (
                <div key={t.title} className="rounded-xl border border-line bg-white/[0.03] p-4">
                  <p className="font-display text-[1.05rem] leading-snug font-medium">{t.title}</p>
                  <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">{t.detail}</p>
                </div>
              ))}
              {analog.tests.length > 0 && (
                <p className="pt-1 text-[0.8rem] leading-relaxed text-ink-muted">
                  Tests come from the dimensions that score 70 or more. The examples are real field campaigns at other
                  analog sites.
                </p>
              )}
            </div>
          )}

          {tab === 'limits' && (
            <div className="space-y-6">
              <Block title="What no place on Earth can copy">
                <ul className="space-y-1.5 border-l-2 border-different/70 pl-4">
                  {(site.limits.length > 0 ? site.limits : ['Gravity, vacuum and space radiation are different on every world.']).map((l) => (
                    <li key={l} className="text-[0.95rem] leading-relaxed text-ink/80">
                      {l}
                    </li>
                  ))}
                </ul>
              </Block>
              {analog.sources.length > 0 && (
                <Block title="Data behind this match">
                  <ul className="space-y-1.5">
                    {analog.sources.map((src) => (
                      <li key={src}>
                        <a
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[0.85rem] break-all text-ink/75 underline decoration-white/20 underline-offset-4 hover:text-ink"
                        >
                          {src.replace(/^https?:\/\//, '')} <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Block>
              )}
            </div>
          )}
        </div>
      </div>
    </SidePanel>
  )
}

/** Score bar, 0–100. Plain white fill: scores are relative, not alarms. */
function Meter({ score }: { score: number | null }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden="true">
      {score !== null && <div className="h-full rounded-full bg-ink/70" style={{ width: `${score}%` }} />}
    </div>
  )
}

function ConfidenceDots({ value }: { value: Confidence }) {
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
        <li key={t} className={`relative pl-4 text-[0.95rem] leading-relaxed text-ink/85 before:absolute before:top-[0.6em] before:left-0 before:size-1.5 before:rounded-full ${tone}`}>
          {t}
        </li>
      ))}
    </ul>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <GroupTitle>{title}</GroupTitle>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}
