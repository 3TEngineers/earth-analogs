import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useData } from '../data/DataProvider'
import { useIsDesktop, useSceneInset } from '../globe/sceneStore'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Analog, Site } from '../types/data'
import { BodyToggle } from './BodyToggle'
import { candidateLetter, formatLatLon, placeOf } from './format'
import { RuleTicks, SidePanel } from './ui'

/**
 * Browsing a world (`browse` phase): what you are looking at, and its sites to pick from.
 * - Desktop: a short introduction floats at the top left, the sites sit in a dock along the bottom as a row of
 *   cards, and the planet turns freely in the space between (the scene centres it there, see useSceneInset).
 * - Phones: the same content as a list in the bottom sheet.
 * Our candidates come first; the past landings we tested with the same rules follow, quieter.
 */
export function SiteDock() {
  const desktop = useIsDesktop()
  const { body, selectSite } = useAppState()
  const { sitesForBody } = useSelection()
  const data = useData()
  const analogs = data.status === 'ready' ? data.analogs.analogs : []
  const introRef = useSceneInset<HTMLDivElement>('intro', 'left', { active: desktop })
  const dockRef = useSceneInset<HTMLDivElement>('dock', 'bottom', { active: desktop })

  const isMoon = body === 'moon'
  const candidates = sitesForBody.filter((s) => s.selection.role === 'candidate')
  const landings = sitesForBody.filter((s) => s.selection.role === 'validation')
  const topMatch = (site: Site) => analogs.find((a) => a.siteId === site.id && a.rank === 1) ?? null
  const kind = isMoon ? 'base sites' : 'landing zones'
  const intro = isMoon
    ? `${candidates.length} ridges near the south pole have long sunlight, Earth in view for radio and permanent shadow close by. Pick one to see why it passed, and where on Earth to rehearse it.`
    : `${candidates.length} low, flat, firm plains pass every landing rule we took from past Mars missions. Pick one to see why it passed, and where on Earth to rehearse it.`

  if (!desktop) {
    return (
      <SidePanel label="Sites" viewKey={`list-${body}`}>
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow accent-transition text-accent">
            {candidates.length} {kind}
          </p>
          <BodyToggle />
        </div>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-ink/85">{intro}</p>
        <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {candidates.map((s, i) => (
            <li key={s.id}>
              <CandidateCard site={s} match={topMatch(s)} i={i} onSelect={() => selectSite(s.id, s.body)} />
            </li>
          ))}
        </ul>
        {landings.length > 0 && (
          <>
            <p className="eyebrow mt-7 text-ink-muted">Past landings, same rules</p>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {landings.map((s, i) => (
                <li key={s.id}>
                  <LandingCard site={s} i={candidates.length + i} onSelect={() => selectSite(s.id, s.body)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </SidePanel>
    )
  }

  return (
    <>
      <div ref={introRef} className="pointer-events-none fixed top-24 left-8 w-[19rem] lg:left-12 lg:w-[22rem]">
        <div key={body} className="panel-in on-sky">
          <p className="eyebrow accent-transition text-accent">{isMoon ? 'South pole, beyond 84° S' : 'The whole planet, screened'}</p>
          <h1 className="headline mt-3 text-7xl">{isMoon ? 'Moon' : 'Mars'}</h1>
          <p className="mt-4 leading-relaxed text-ink/85">{intro}</p>
          <ul className="mt-5 space-y-1.5 text-[0.8rem] text-ink-muted">
            <li className="flex items-center gap-2.5">
              <span className="accent-transition size-2 rounded-full bg-accent shadow-[0_0_8px_var(--body-accent)]" aria-hidden="true" />
              Our {kind}
            </li>
            <li className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-[#9aa4b6]" aria-hidden="true" />
              Past landings we tested with the same rules
            </li>
            <li className="flex items-center gap-2.5">
              <span className="mx-[3px] size-[3px] rounded-full bg-[#c3cad6]" aria-hidden="true" />
              Other past landings, name only
            </li>
          </ul>
        </div>
      </div>

      <div ref={dockRef} className="pointer-events-auto fixed inset-x-5 bottom-5 z-20">
        <div key={body} className="panel-in glass rounded-2xl p-3">
          <div className="flex gap-3 overflow-x-auto [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin]">
            {candidates.map((s, i) => (
              <div key={s.id} className="min-w-[12.5rem] flex-1">
                <CandidateCard site={s} match={topMatch(s)} i={i} onSelect={() => selectSite(s.id, s.body)} />
              </div>
            ))}
            {landings.length > 0 && (
              <div className="flex shrink-0 flex-col gap-2 border-l border-line pl-3">
                <p className="eyebrow px-1 pt-1 text-[0.65rem] text-ink-muted">Past landings, same rules</p>
                <div className="flex flex-1 gap-2">
                  {landings.map((s, i) => (
                    <div key={s.id} className="w-[10.5rem]">
                      <LandingCard site={s} i={candidates.length + i} onSelect={() => selectSite(s.id, s.body)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function CandidateCard({ site, match, i, onSelect }: { site: Site; match: Analog | null; i: number; onSelect: () => void }) {
  const passes = site.selection.criteria.map((c) => c.pass)
  const passed = passes.filter((p) => p === true).length

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ '--i': i } as CSSProperties}
      className="stagger accent-transition group flex h-full w-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3.5 text-left transition-colors hover:border-accent/60 hover:bg-white/[0.07]"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="accent-transition flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-semibold text-space">
          {candidateLetter(site.id)}
        </span>
        <span className="flex flex-col items-end gap-1" aria-label={`${passed} of ${passes.length} rules passed`}>
          <span className={`font-mono text-[11px] tabular-nums ${passed === passes.length ? 'text-similar' : 'text-different'}`}>
            {passed}/{passes.length} rules
          </span>
          <RuleTicks passes={passes} />
        </span>
      </span>
      <span className="mt-2.5 font-display text-[1.1rem] leading-tight font-semibold">{site.name}</span>
      <span className="mt-1 font-mono text-[11px] text-ink-muted tabular-nums">{formatLatLon(site.lat, site.lon)}</span>
      <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-[0.8rem] text-ink-muted">
        {match ? (
          <span className="min-w-0 truncate">
            On Earth: <span className="text-ink/90">{placeOf(match.name)}</span>
          </span>
        ) : (
          <span />
        )}
        <ArrowRight className="size-4 shrink-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
      </span>
    </button>
  )
}

function LandingCard({ site, i, onSelect }: { site: Site; i: number; onSelect: () => void }) {
  const passes = site.selection.criteria.map((c) => c.pass)
  const passed = passes.filter((p) => p === true).length

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{ '--i': i } as CSSProperties}
      className="stagger flex h-full w-full flex-col rounded-xl border border-white/[0.07] p-3 text-left transition-colors hover:border-white/30 hover:bg-white/[0.04]"
    >
      <span className="font-display text-[0.95rem] leading-tight font-medium text-ink/85">{site.name}</span>
      <span className="mt-1 font-mono text-[11px] text-ink-muted tabular-nums">
        {site.year ?? ''} · {site.agency}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-2.5" aria-label={`${passed} of ${passes.length} rules passed`}>
        <span className={`font-mono text-[11px] tabular-nums ${passed === passes.length ? 'text-similar' : 'text-different'}`}>
          {passed}/{passes.length}
        </span>
        <RuleTicks passes={passes} />
      </span>
    </button>
  )
}
