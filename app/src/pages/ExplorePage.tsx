import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { StateDebugPanel } from '../dev/StateDebugPanel'
import { GlobeView } from '../globe/GlobeView'
import { useAppState } from '../state/AppState'
import type { Body } from '../types/data'

const BODIES: Body[] = ['moon', 'mars']

/**
 * Explore page ("/explore/moon" or "/explore/mars").
 * The URL decides the body; everything after that (site → Earth analogs) lives in the shared state.
 * Globe: Deniz (src/globe/). Panels: Kmar (src/panels/) — StateDebugPanel is the temporary stand-in.
 */
export default function ExplorePage() {
  const { body } = useParams()
  const isValid = BODIES.includes(body as Body)
  const state = useAppState()
  const data = useData()

  // Keep the shared state in sync with the URL.
  useEffect(() => {
    if (isValid && state.body !== body) state.setBody(body as Body)
  }, [isValid, body, state])

  // Leaving the page clears the selection, so coming back starts fresh.
  const { reset } = state
  useEffect(() => reset, [reset])

  if (!isValid) return <Navigate to="/" replace />

  return (
    <main className="relative h-full">
      <GlobeView />
      <SiteHeader />
      {data.status === 'ready' && data.sites.mock && (
        <p className="absolute top-12 left-4 z-10 font-mono text-xs text-different">Mock data</p>
      )}
      {data.status === 'error' && <p className="absolute bottom-4 left-4 text-different">{data.message}</p>}
      <StateDebugPanel />
    </main>
  )
}
