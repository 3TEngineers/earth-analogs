import { useData } from './data/DataProvider'
import { StateDebugPanel } from './dev/StateDebugPanel'
import { GlobeView } from './globe/GlobeView'

/**
 * Page layout. The globe fills the screen; panels sit on top of it.
 * Deniz owns src/globe/, Kmar owns src/panels/ and src/pages/; both use src/state/.
 */
export default function App() {
  const data = useData()

  return (
    <main className="relative h-full overflow-hidden bg-space">
      <GlobeView />

      <header className="pointer-events-none absolute top-4 left-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Earth Analogs</h1>
        <p className="text-sm text-ink-muted">Find the places on Earth that resemble Moon and Mars landing sites.</p>
        {data.status === 'ready' && data.sites.mock && (
          <p className="mt-1 font-mono text-xs text-different">Mock data</p>
        )}
      </header>

      {data.status === 'loading' && <p className="absolute bottom-4 left-4 text-ink-muted">Loading data…</p>}
      {data.status === 'error' && <p className="absolute bottom-4 left-4 text-different">{data.message}</p>}

      <StateDebugPanel />
    </main>
  )
}
