import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react'
import { assetUrl } from '../data/assetUrl'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Site } from '../types/data'
import { SelectionChecklist } from './SelectionChecklist'

function formatCoords(site: Site) {
  return `${site.lat.toFixed(2)}°, ${site.lon.toFixed(2)}°`
}

/** Card for the selected site: mission facts, summary, processes, "Why this site", and the jump to Earth. */
export function MissionCard({ site }: { site: Site }) {
  const { reset, showAnalogs } = useAppState()
  const { analogs } = useSelection()

  return (
    <article className="space-y-4">
      <button
        type="button"
        onClick={reset}
        className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <ArrowLeft className="size-3.5" /> All sites
      </button>

      <header>
        <h2 className="font-display text-xl font-semibold">{site.name}</h2>
        <p className="text-sm text-ink-muted">{site.mission}</p>
        <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <dt className="text-ink-muted">Agency</dt>
            <dd className="font-mono">{site.agency}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Year</dt>
            <dd className="font-mono">{site.year ?? 'Candidate'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Location</dt>
            <dd className="font-mono">{formatCoords(site)}</dd>
          </div>
        </dl>
      </header>

      {site.image ? (
        <img src={assetUrl(site.image)} alt={`Orbital view of ${site.name}`} className="w-full rounded-lg border border-line" />
      ) : (
        <div className="flex h-24 items-center justify-center gap-2 rounded-lg border border-dashed border-line text-xs text-ink-muted">
          <ImageOff className="size-4" /> Image coming soon
        </div>
      )}

      <p className="text-sm leading-relaxed">{site.summary}</p>

      {site.processes.length > 0 && (
        <ul aria-label="Processes" className="flex flex-wrap gap-1.5">
          {site.processes.map((p) => (
            <li key={p} className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">
              {p}
            </li>
          ))}
        </ul>
      )}

      <SelectionChecklist selection={site.selection} />

      {analogs.length > 0 && (
        <button
          type="button"
          onClick={() => showAnalogs(analogs[0].id)}
          className="accent-transition inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-display font-medium text-space hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Show Earth training areas <ArrowRight className="size-4" />
        </button>
      )}
    </article>
  )
}
