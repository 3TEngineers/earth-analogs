import type { Site } from '../types/data'

interface Props {
  site: Site
  selected: boolean
  onSelect: () => void
}

/** One row in the site list. Candidates use the accent; past landings stay muted. */
export function SiteCard({ site, selected, onSelect }: Props) {
  const candidate = site.selection.role === 'candidate'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`accent-transition w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        selected ? 'border-accent bg-white/5' : candidate ? 'border-accent/40 hover:border-accent' : 'border-line hover:border-ink-muted'
      }`}
    >
      <span className={`block font-display ${candidate ? 'text-ink' : 'text-ink-muted'}`}>{site.name}</span>
      <span className="mt-0.5 block font-mono text-xs text-ink-muted">
        {site.agency} · {site.year ?? 'Candidate'}
      </span>
    </button>
  )
}
