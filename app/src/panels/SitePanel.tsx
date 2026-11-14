import { ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import { BodyToggle } from './BodyToggle'
import { MissionCard } from './MissionCard'
import { SiteList } from './SiteList'

/**
 * Bottom sheet for the `browse` and `site` phases (K1). It covers the lower ~40 % of the screen
 * (the 3D scene centers the planet above it) and scrolls inside, so a site can grow long details,
 * images and charts. "Expand" lifts it to most of the screen for reading.
 * The `earth` phase is the report panel (K4), not built yet.
 */
export function SitePanel() {
  const { phase, siteId } = useAppState()
  const { site } = useSelection()
  // Expansion belongs to one view: a new selection starts at the normal height again.
  const view = `${phase}:${siteId ?? ''}`
  const [expandedView, setExpandedView] = useState<string | null>(null)
  const expanded = expandedView === view
  const toggle = () => setExpandedView(expanded ? null : view)

  if (phase === 'earth') return null

  return (
    <aside
      aria-label="Landing sites"
      className={`accent-transition fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-4xl flex-col rounded-t-2xl border border-b-0 border-line bg-space/80 shadow-[0_-12px_40px_rgb(0_0_0/0.45)] backdrop-blur-xl transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        expanded ? 'h-[85svh]' : 'h-[40svh]'
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? 'Show less' : 'Show more'}
        className="group flex shrink-0 justify-center pt-2.5 pb-1"
      >
        <span className="h-1 w-10 rounded-full bg-ink-muted/40 transition-colors group-hover:bg-ink-muted" />
      </button>

      <div key={site?.id ?? 'list'} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 sm:px-8">
        {phase === 'site' && site ? (
          <MissionCard site={site} />
        ) : (
          <div className="space-y-5">
            <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-4 bg-space/85 px-5 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
              <BodyToggle />
              <button
                type="button"
                onClick={toggle}
                className="press flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
              >
                {expanded ? 'Less' : 'More'}
                <ChevronUp className={`size-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
            </div>
            <SiteList />
          </div>
        )}
      </div>
    </aside>
  )
}
