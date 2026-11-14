import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'

/**
 * TEMPORARY. Exercises the shared state until Kmar's real panels (K1, K4) replace it.
 * Delete this file and its use in pages/ExplorePage.tsx once src/panels/ has the site list and report.
 * The Moon / Mars switch lives in the URL now (header links), not here.
 */
export function StateDebugPanel() {
  const state = useAppState()
  const { sitesForBody, site, analogs, analog } = useSelection()

  return (
    <aside className="accent-transition absolute top-14 right-4 bottom-4 z-10 w-80 overflow-y-auto rounded-xl border border-line bg-panel p-4 text-sm backdrop-blur-md">
      <p className="mb-3 font-mono text-xs text-ink-muted">Temporary state panel (replaced by K1/K4)</p>

      {state.phase !== 'earth' && (
        <ul className="space-y-2">
          {sitesForBody.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => state.selectSite(s.id, s.body)}
                className={`w-full rounded-md border px-3 py-2 text-left ${s.id === site?.id ? 'border-accent' : 'border-line'}`}
              >
                <span className="font-display">{s.name}</span>
                <span className="block font-mono text-xs text-ink-muted">
                  {s.agency} · {s.year ?? 'future'} · {s.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {state.phase === 'site' && site && (
        <button
          type="button"
          onClick={() => state.showAnalogs(analogs[0]?.id ?? null)}
          className="mt-4 w-full rounded-md bg-accent px-3 py-2 font-medium text-space"
        >
          Show Earth analogs →
        </button>
      )}

      {state.phase === 'earth' && (
        <div className="space-y-2">
          {analogs.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => state.selectAnalog(a.id)}
              className={`w-full rounded-md border px-3 py-2 text-left ${a.id === analog?.id ? 'border-accent' : 'border-line'}`}
            >
              <span className="font-mono text-accent">#{a.rank}</span> {a.name}, {a.country}
              <span className="block font-mono text-xs text-ink-muted">
                {a.totalScore}/100 · {a.known ? 'Known analog' : 'New candidate'}
              </span>
            </button>
          ))}
          <button type="button" onClick={state.backToSite} className="mt-2 text-ink-muted underline">
            ← Back to {site?.name}
          </button>
        </div>
      )}

      <pre className="mt-6 font-mono text-xs whitespace-pre-wrap text-ink-muted">
        {JSON.stringify({ phase: state.phase, body: state.body, siteId: state.siteId, analogId: state.analogId }, null, 2)}
      </pre>
    </aside>
  )
}
