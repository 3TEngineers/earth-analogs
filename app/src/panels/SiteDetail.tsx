import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Site } from '../types/data'
import { candidateLetter, formatLatLon, placeOf, pretty } from './format'
import { orbitalImage } from './orbitalImage'
import { OrbitalView } from './OrbitalView'
import { RuleList, SelectionChecklist } from './SelectionChecklist'
import { GroupTitle, PassBadge, SidePanel, Tabs } from './ui'

type Tab = 'overview' | 'rules' | 'earth'

/**
 * One site (`site` phase): what it is, why it passed (or, for a past landing, where it fails), and where on Earth
 * to rehearse it. The report is split over three tabs so the panel stays short; the jump to Earth stays in view.
 */
export function SiteDetail({ site }: { site: Site }) {
  const { reset, selectSite, showAnalogs } = useAppState()
  const { analogs, sitesForBody } = useSelection()
  const [tab, setTab] = useState<Tab>('overview')
  const candidate = site.selection.role === 'candidate'
  const passed = site.selection.criteria.filter((c) => c.pass === true).length
  const total = site.selection.criteria.length
  const bodyName = site.body === 'mars' ? 'Mars' : 'Moon'
  const missionRules = site.selection.missionRules ?? []
  const step = (i: number) => ({ '--i': i }) as CSSProperties

  // Step through the body's sites without going back to the list.
  const position = sitesForBody.findIndex((s) => s.id === site.id)
  const neighbour = (d: number) => sitesForBody[(position + d + sitesForBody.length) % sitesForBody.length]
  const go = (d: number) => {
    const next = neighbour(d)
    if (next) selectSite(next.id, next.body)
  }

  const tabs: { id: Tab; label: string; count?: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'rules', label: candidate ? 'Why it passed' : 'Rule check', count: `${passed}/${total}` },
    ...(analogs.length > 0 ? [{ id: 'earth' as const, label: 'On Earth', count: String(analogs.length) }] : []),
  ]

  return (
    <SidePanel
      label={site.name}
      viewKey={site.id}
      footer={
        analogs.length > 0 ? (
          <button
            type="button"
            onClick={() => showAnalogs(analogs[0].id)}
            className="press flex w-full items-center justify-center gap-2 rounded-full bg-earth px-6 py-3 font-display font-semibold text-space hover:bg-earth/90"
          >
            Fly to its {analogs.length} training areas on Earth <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        ) : candidate ? (
          <p className="text-center text-sm text-ink-muted">Earth training areas for this site have not been computed yet.</p>
        ) : undefined
      }
    >
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={reset} className="press inline-flex items-center gap-1.5 rounded-md font-display text-sm font-medium text-ink-muted hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" /> All sites on {site.body === 'mars' ? 'Mars' : 'the Moon'}
        </button>
        <div className="flex items-center gap-1.5">
          <span className="mr-1 font-mono text-[11px] text-ink-muted tabular-nums">
            {position + 1}/{sitesForBody.length}
          </span>
          <button type="button" onClick={() => go(-1)} aria-label="Previous site" className="press flex size-8 items-center justify-center rounded-full border border-line hover:border-white/40">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next site" className="press flex size-8 items-center justify-center rounded-full border border-line hover:border-white/40">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <header className="mt-5">
        <p className="stagger eyebrow accent-transition text-accent" style={step(0)}>
          {candidate ? `${bodyName} · ${site.selection.goal} ${candidateLetter(site.id)} · found by our screening` : `${bodyName} · Past landing · ${site.year ?? ''} · ${site.agency}`}
        </p>
        <h2 className="stagger headline mt-2.5 text-[2rem] sm:text-[2.5rem]" style={step(1)}>
          {site.name}
        </h2>
        <div className="stagger mt-3 flex flex-wrap items-center gap-x-4 gap-y-2" style={step(2)}>
          <span className="font-mono text-[0.8rem] text-ink-muted tabular-nums">{formatLatLon(site.lat, site.lon)}</span>
          <PassBadge passed={passed} total={total} />
        </div>
        <p className="stagger mt-4 leading-relaxed text-ink/90" style={step(3)}>
          {site.summary}
        </p>
      </header>

      <div className="stagger mt-5" style={step(4)}>
        <Tabs tabs={tabs} value={tab} onChange={setTab} />

        <div key={tab} className="panel-in pt-5">
          {tab === 'overview' && (
            <div className="space-y-6">
              <OrbitalView key={site.id} image={orbitalImage(site.body, site.lat, site.lon, site.image)} alt={`View from orbit around ${site.name}`} />
              {site.purpose && (
                <Block title={candidate ? 'Why go there' : 'Why the mission went there'}>
                  <p className="leading-relaxed text-ink/90">{site.purpose.text}</p>
                  {site.purpose.sources.length > 0 && (
                    <p className="mt-2 text-[0.8rem] text-ink-muted">
                      Sources:{' '}
                      {site.purpose.sources.map((url, i) => (
                        <span key={url}>
                          {i > 0 && ', '}
                          <a href={url} target="_blank" rel="noreferrer" className="underline decoration-white/30 underline-offset-2 hover:text-ink">
                            {sourceName(url)}
                          </a>
                        </span>
                      ))}
                    </p>
                  )}
                </Block>
              )}
              {site.selection.note && (
                <Block title={candidate ? 'How it was picked' : 'What the check shows'}>
                  <p className="leading-relaxed text-ink/85">{pretty(site.selection.note)}</p>
                </Block>
              )}
              {site.processes.length > 0 && (
                <Block title="What shaped the ground">
                  <ul className="flex flex-wrap gap-2">
                    {site.processes.map((p) => (
                      <li key={p} className="rounded-full border border-line px-3 py-1 text-[0.85rem] text-ink/85">
                        {p}
                      </li>
                    ))}
                  </ul>
                </Block>
              )}
            </div>
          )}

          {tab === 'rules' && (
            <div className="space-y-5">
              <p className="text-[0.95rem] leading-relaxed text-ink-muted">
                {candidate
                  ? 'Every limit below had to hold at once. Limits marked "ours" are our own choices, made where no published limit fits the scale of the maps.'
                  : 'The same limits we used to find our own sites, run on a place where a spacecraft really landed.'}
              </p>
              <SelectionChecklist selection={site.selection} />
              {missionRules.length > 0 && (
                <Block title="The limits its own mission set">
                  <p className="mb-4 text-[0.95rem] leading-relaxed text-ink-muted">
                    Every mission writes its own limits for its own spacecraft and goal. These are the ones this mission&apos;s team
                    published, checked with the same elevation map we use.
                  </p>
                  <RuleList criteria={missionRules} />
                </Block>
              )}
            </div>
          )}

          {tab === 'earth' && (
            <div className="space-y-6">
              <ul className="space-y-2.5">
                {analogs.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => showAnalogs(a.id)}
                      className="group grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-left transition-colors hover:border-earth/60 hover:bg-white/[0.07]"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-earth font-display text-sm font-semibold text-space">{a.rank}</span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-[1.05rem] leading-tight font-semibold">
                          {placeOf(a.name)}, {a.country}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.8rem] text-ink-muted">{a.similarities[0] ?? ''}</span>
                      </span>
                      <span className="text-right">
                        <span className="font-display text-2xl leading-none font-semibold tabular-nums">{a.totalScore}</span>
                        <span className="block font-mono text-[10px] text-ink-muted">/ 100</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {site.limits.length > 0 && (
                <Block title="What no place on Earth can copy">
                  <ul className="space-y-1.5 border-l-2 border-different/70 pl-4">
                    {site.limits.map((l) => (
                      <li key={l} className="text-[0.95rem] leading-relaxed text-ink/80">
                        {l}
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

/** A short, readable name for a source link: the site it is on. */
function sourceName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.endsWith('nasa.gov')) return host.startsWith('nssdc') ? 'NASA NSSDCA' : 'NASA'
    if (host.endsWith('isro.gov.in')) return 'ISRO'
    if (host.endsWith('unoosa.org')) return 'UN COPUOS'
    if (host.endsWith('nature.com')) return 'Nature Astronomy'
    if (host.endsWith('usra.edu')) return 'LPSC abstract'
    return host
  } catch {
    return url
  }
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <GroupTitle>{title}</GroupTitle>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}
