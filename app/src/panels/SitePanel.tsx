import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import { BodyToggle } from './BodyToggle'
import { MissionCard } from './MissionCard'
import { SiteList } from './SiteList'

/**
 * Right-hand panel for the `browse` and `site` phases (K1).
 * The `earth` phase is the report panel (K4), not built yet.
 */
export function SitePanel() {
  const { phase } = useAppState()
  const { site } = useSelection()

  if (phase === 'earth') return null

  return (
    <aside
      aria-label="Landing sites"
      className="accent-transition absolute inset-x-0 bottom-0 max-h-[55vh] overflow-y-auto rounded-t-xl border border-line bg-panel p-4 backdrop-blur-md md:inset-x-auto md:top-4 md:right-4 md:bottom-4 md:max-h-none md:w-[380px] md:rounded-xl"
    >
      {phase === 'site' && site ? (
        <MissionCard site={site} />
      ) : (
        <div className="space-y-4">
          <BodyToggle />
          <SiteList />
        </div>
      )}
    </aside>
  )
}
