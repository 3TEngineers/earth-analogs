import { ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import { BodyToggle } from './BodyToggle'
import { MissionCard } from './MissionCard'
import { SiteList } from './SiteList'

/**
 * Site panel for the `browse` and `site` phases (K1). Same look as the landing-page story chapters.
 * - Desktop (md and up): no box. The text floats on the right over open space (30rem, 34rem from lg), the 3D
 *   scene shifts the planet to the left of it (`panelPx` in SpaceEngine.ts must match the width + right margin).
 *   The column scrolls inside and fades out at its top edge (the bottom keeps the sticky button).
 * - Mobile: a bottom sheet over the lower ~40 % of the screen, "More" lifts it to 85 %.
 * Content swaps (list ↔ site) arrive from blur, like the story text (.panel-in).
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
      className={`accent-transition fixed inset-x-0 bottom-0 z-20 mx-auto flex flex-col overflow-hidden rounded-t-2xl border border-b-0 border-white/10 bg-[#080b14]/92 shadow-[0_-12px_40px_rgb(0_0_0/0.45)] backdrop-blur-2xl transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        expanded ? 'h-[85svh]' : 'h-[40svh]'
      } md:inset-x-auto md:top-20 md:right-6 md:bottom-4 md:h-auto md:w-[30rem] md:rounded-none md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-none md:[text-shadow:0_2px_18px_rgb(5_7_13/0.95)] lg:right-12 lg:w-[34rem]`}
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

      <div
        key={site?.id ?? `list-${body}`}
        className="panel-in min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 md:px-1 md:[mask-image:linear-gradient(to_bottom,transparent,black_2rem)] md:[scrollbar-width:none]"
      >
        {phase === 'site' && site ? (
          <MissionCard site={site} />
        ) : (
          <div className="pb-10 md:pt-8">
            <div className="sticky top-0 z-10 -mx-5 flex items-center justify-between gap-4 bg-[#080b14] px-5 pt-3 pb-4 sm:-mx-7 sm:px-7 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-0">
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

            <header className="mt-6 mb-10 hidden md:block">
              <p className="accent-transition font-mono text-xs tracking-[0.22em] text-accent uppercase">
                {isMoon ? 'South pole' : 'Whole planet'} <span className="text-ink-muted">· {candidates} {isMoon ? 'base sites' : 'landing zones'}</span>
              </p>
              <h2 className="mt-3 font-serif text-7xl leading-none tracking-[0.06em] uppercase lg:text-8xl">{isMoon ? 'Moon' : 'Mars'}</h2>
              <span className="accent-transition mt-5 block h-0.5 w-12 rounded-full bg-accent" aria-hidden="true" />
              <p className="mt-5 text-lg leading-relaxed text-ink/85">
                {isMoon
                  ? 'Ridges near the south pole with long sunlight, Earth in view for radio and permanently shadowed ice close by. Pick one to see why it passed.'
                  : 'Low, flat, firm plains that pass every landing rule we took from past Mars missions. Pick one to see why it passed.'}
              </p>
            </header>
            <SiteList />
          </div>
        )}
      </div>
    </aside>
  )
}
