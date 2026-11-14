import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { StateDebugPanel } from '../dev/StateDebugPanel'
import { useAppState } from '../state/AppState'
import type { Body } from '../types/data'

const BODIES: Body[] = ['moon', 'mars']

/**
 * Explore page ("/explore/moon" or "/explore/mars").
 * The planet itself is drawn by <SpaceScene> behind this page; the URL decides which body is in focus,
 * and everything after that (site → Earth training areas) lives in the shared state.
 * Panels: Kmar (src/panels/) — StateDebugPanel is the temporary stand-in.
 * Empty areas let pointer events through so the user can drag the globe.
 */
export default function ExplorePage() {
  const { body } = useParams()
  const isValid = BODIES.includes(body as Body)
  const { body: stateBody, setBody, reset } = useAppState()
  const data = useData()

  // Keep the shared state in sync with the URL.
  useEffect(() => {
    if (isValid && stateBody !== body) setBody(body as Body)
  }, [isValid, body, stateBody, setBody])

  // Leaving the page clears the selection, so coming back starts fresh.
  useEffect(() => reset, [reset])

  if (!isValid) return <Navigate to="/" replace />

  return (
    <main className="pointer-events-none relative z-10 h-full">
      <SiteHeader />
      {data.status === 'ready' && data.sites.mock && (
        <p className="absolute top-12 left-4 font-mono text-xs text-different">Mock data</p>
      )}
      {data.status === 'error' && <p className="absolute bottom-4 left-4 text-different">{data.message}</p>}
      <div className="pointer-events-auto">
        <StateDebugPanel />
      </div>
    </main>
  )
}
