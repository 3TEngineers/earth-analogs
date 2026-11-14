import { ChevronRight } from 'lucide-react'
import type { Site } from '../types/data'
import { formatLatLon } from './format'

interface Props {
  site: Site
  index: number
  selected: boolean
  onSelect: () => void
}

/** One site in the list. Candidates: numbered, accent, a criteria meter. Past landings: quieter, with year and agency. */
export function SiteCard({ site, index, selected, onSelect }: Props) {
  const candidate = site.selection.role === 'candidate'
  const passed = site.selection.criteria.filter((c) => c.pass === true).length
  const total = site.selection.criteria.length

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`press accent-transition group grid w-full grid-cols-[2rem_1fr_auto] items-center gap-x-3 rounded-xl border px-4 py-3.5 text-left focus-visible:outline-2 focus-visible:outline-accent ${
        selected
          ? 'border-accent/70 bg-accent/10'
          : candidate
            ? 'border-white/10 bg-white/[0.035] hover:border-accent/50 hover:bg-white/[0.06]'
            : 'border-white/[0.06] hover:border-white/15 hover:bg-white/[0.03]'
      }`}
    >
      <span className={`font-mono text-sm tabular-nums ${candidate ? 'text-accent' : 'text-ink-muted'}`} aria-hidden="true">
        {candidate ? String(index).padStart(2, '0') : '—'}
      </span>

      <span className="min-w-0">
        <span className={`block font-display text-base leading-snug font-medium ${candidate ? 'text-ink' : 'text-ink/80'}`}>
          {site.name}
        </span>
        <span className="mt-1 flex items-center gap-2 font-mono text-xs text-ink-muted tabular-nums">
          {candidate ? formatLatLon(site.lat, site.lon) : `${site.year ?? ''} · ${site.agency}`}
        </span>
      </span>

      <span className="flex items-center gap-3">
        <span className="flex flex-col items-end gap-1" aria-label={`${passed} of ${total} criteria passed`}>
          <span className={`font-mono text-xs tabular-nums ${passed === total ? 'text-similar' : 'text-different'}`}>
            {passed}/{total}
          </span>
          <span className="flex gap-0.5" aria-hidden="true">
            {site.selection.criteria.map((c) => (
              <span
                key={c.id}
                className={`h-1 w-2.5 rounded-full ${c.pass === true ? 'bg-similar/80' : c.pass === false ? 'bg-different/80' : 'bg-white/15'}`}
              />
            ))}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </button>
  )
}
