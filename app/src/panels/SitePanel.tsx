import { ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import { BodyToggle } from './BodyToggle'
import { MissionCard } from './MissionCard'
import { SiteList } from './SiteList'

/**
 * Site panel for the `browse` and `site` phases (K1).
 * - Desktop (md and up): a full-height glass panel on the right (30rem, 34rem from lg); the 3D scene shifts the
 *   planet into the space to its left (`panelPx` in SpaceEngine.ts must match these widths).
 * - Mobile: a bottom sheet over the lower ~40 % of the screen, "More" lifts it to 85 %.
 * Both scroll inside, so a site can grow long details, images and charts.
 * The `earth` phase is the report panel (K4), not built yet.
 */
export function SitePanel() {
  const { phase, siteId, body } = useAppState()
  const { site, sitesForBody } = useSelection()
  // Expansion (mobile only) belongs to one view: a new selection starts at the normal height again.
  const view = `${phase}:${siteId ?? ''}`
  const [expandedView, setExpandedView] = useState<string | null>(null)
  const expanded = expandedView === view
  const toggle = () => setExpandedView(expanded ? null : view)

  if (phase === 'earth') return null

  const candidates = sitesForBody.filter((s) => s.selection.role === 'candidate').length
  const isMoon = body === 'moon'

  return (
    <aside
      aria-label="Landing sites"
      className={`accent-transition fixed inset-x-0 bottom-0 z-20 mx-auto flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-[#080b14]/90 shadow-[0_-12px_40px_rgb(0_0_0/0.45)] backdrop-blur-2xl transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        expanded ? 'h-[85svh]' : 'h-[40svh]'
      } md:inset-x-auto md:top-16 md:right-4 md:bottom-4 md:h-auto md:w-[30rem] md:rounded-2xl md:border-b md:shadow-[0_24px_60px_rgb(0_0_0/0.55)] lg:w-[34rem]`}
    >
      {/* Accent hairline along the top edge. */}
      <span className="accent-transition pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" aria-hidden="true" />

      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Show less' : 'Show more'}
        className="group flex shrink-0 justify-center pt-2.5 pb-1 md:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-ink-muted/40 transition-colors group-hover:bg-ink-muted" />
      </button>

      <div key={site?.id ?? 'list'} className="panel-in min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7">
        {phase === 'site' && site ? (
          <MissionCard site={site} />
        ) : (
          <div className="pb-8">
            <div className="sticky top-0 z-10 -mx-5 bg-[#080b14] px-5 pt-3 pb-4 backdrop-blur-2xl sm:-mx-7 sm:px-7 md:pt-6">
              <div className="flex items-center justify-between gap-4">
                <BodyToggle />
                <button
                  type="button"
                  onClick={toggle}
                  className="press flex items-center gap-1 text-sm text-ink-muted hover:text-ink md:hidden"
                >
                  {expanded ? 'Less' : 'More'}
                  <ChevronUp className={`size-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
              </div>
            </div>
            <header className="mt-2 mb-7 hidden md:block">
              <p className="accent-transition font-mono text-xs tracking-[0.2em] text-accent uppercase">
                {isMoon ? 'Moon · South pole' : 'Mars · Whole planet'}
              </p>
              <h2 className="mt-2 font-display text-[2rem] leading-tight font-semibold tracking-[-0.025em]">
                <span className="tabular-nums">{candidates}</span> {isMoon ? 'base' : 'landing'} {candidates === 1 ? 'site' : 'sites'}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink/70">
                {isMoon
                  ? 'Ridges near the south pole with long sunlight, Earth in view for radio and permanently shadowed ice close by.'
                  : 'Low, flat, firm plains that pass every landing rule we took from past Mars missions.'}
              </p>
            </header>
            <SiteList />
          </div>
        )}
      </div>
    </aside>
  )
}
