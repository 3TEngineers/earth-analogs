import { Check, Minus, X } from 'lucide-react'
import type { Selection } from '../types/data'

/**
 * "Why this site" checklist from site.selection.
 * Past landings get a different title: a ✗ there is expected and shows the criteria tell sites apart.
 */
export function SelectionChecklist({ selection }: { selection: Selection }) {
  const title = selection.role === 'candidate' ? 'Why this site' : 'Checked against our criteria'

  return (
    <section aria-label={title} className="rounded-lg border border-line p-3">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <p className="mb-2 text-xs text-ink-muted">{selection.goal}</p>

      <ul className="space-y-2">
        {selection.criteria.map((c) => (
          <li key={c.id} className="flex gap-2">
            <StatusIcon pass={c.pass} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm">{c.label}</span>
                <span className="font-mono text-sm">{c.value === null ? 'No data' : `${c.value} ${c.unit}`}</span>
              </div>
              <div className="text-xs text-ink-muted">{c.rule}</div>
              <div className="text-[11px] text-ink-muted/80">{c.source}</div>
            </div>
          </li>
        ))}
      </ul>

      {selection.note && <p className="mt-3 border-t border-line pt-2 text-xs text-ink-muted">{selection.note}</p>}
    </section>
  )
}

function StatusIcon({ pass }: { pass: boolean | null }) {
  if (pass === null) return <Minus aria-label="No data" className="mt-0.5 size-4 shrink-0 text-ink-muted" />
  if (pass) return <Check aria-label="Passes" className="mt-0.5 size-4 shrink-0 text-similar" />
  return <X aria-label="Fails" className="mt-0.5 size-4 shrink-0 text-different" />
}
