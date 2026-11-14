import { ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import { BodyToggle } from './BodyToggle'
import { MissionCard } from './MissionCard'
import { SiteList } from './SiteList'

/**
 * Site panel for the `browse` and `site` phases (K1).
 * - Desktop (md and up): a full-height glass panel on the right (26rem wide); the 3D scene shifts the planet
 *   into the space to its left (PANEL_PX in SpaceEngine.ts must match the width + margin).
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
  const bodyName = body === 'moon' ? 'Moon' : 'Mars'
  const kind = body === 'moon' ? 'base' : 'landing'

  return (
    <aside
      aria-label="Landing sites"
      className={`accent-transition fixed inset-x-0 bottom-0 z-20 mx-auto flex flex-col rounded-t-2xl border border-b-0 border-line bg-space/80 shadow-[0_-12px_40px_rgb(0_0_0/0.45)] backdrop-blur-xl transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        expanded ? 'h-[85svh]' : 'h-[40svh]'
      } md:inset-x-auto md:top-16 md:right-4 md:bottom-4 md:h-auto md:w-[26rem] md:rounded-2xl md:border-b md:shadow-[0_24px_60px_rgb(0_0_0/0.5)]`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Show less' : 'Show more'}
        className="group flex shrink-0 justify-center pt-2.5 pb-1 md:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-ink-muted/40 transition-colors group-hover:bg-ink-muted" />
      </button>

      <div key={site?.id ?? 'list'} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 sm:px-6 md:pt-5">
        {phase === 'site' && site ? (
          <MissionCard site={site} />
        ) : (
          <div className="space-y-5">
            <div className="sticky top-0 z-10 -mx-5 space-y-4 bg-space/85 px-5 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 md:-mt-5 md:pt-5">
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
              <div className="hidden md:block">
                <p className="accent-transition font-mono text-[11px] tracking-[0.18em] text-accent uppercase">{bodyName}</p>
                <p className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] tabular-nums">
                  {candidates} {kind} {candidates === 1 ? 'site' : 'sites'}
                </p>
              </div>
            </div>
            <SiteList />
          </div>
        )}
      </div>
    </aside>
  )
}
