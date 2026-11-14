import { ChevronRight } from 'lucide-react'
import type { Site } from '../types/data'

interface Props {
  site: Site
  selected: boolean
  onSelect: () => void
}

/** One site in the list. Candidates carry the body accent; past landings stay muted. */
export function SiteCard({ site, selected, onSelect }: Props) {
  const candidate = site.selection.role === 'candidate'
  const passed = site.selection.criteria.filter((c) => c.pass === true).length
  const total = site.selection.criteria.length

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`press accent-transition group flex w-full items-center gap-4 rounded-xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-accent ${
        selected
          ? 'border-accent bg-accent/10'
          : candidate
            ? 'border-line bg-white/[0.03] hover:border-accent/60 hover:bg-white/[0.06]'
            : 'border-line/60 hover:border-line hover:bg-white/[0.03]'
      }`}
    >
      <span
        className={`size-2.5 shrink-0 rounded-full ${candidate ? 'bg-accent shadow-[0_0_10px_var(--color-accent)]' : 'bg-ink-muted/50'}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate font-display text-[15px] font-medium ${candidate ? 'text-ink' : 'text-ink-muted'}`}>
          {site.name}
        </span>
        <span className="mt-0.5 block text-xs text-ink-muted tabular-nums">
          {site.year ?? 'New candidate'} · {site.agency} · {passed}/{total} criteria
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  )
}
