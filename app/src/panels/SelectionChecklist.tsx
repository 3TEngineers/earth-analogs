import { Check, Minus, X } from 'lucide-react'
import type { Selection } from '../types/data'
import { pretty } from './format'

/**
 * Criteria from site.selection, one row each: what was measured, the value, the rule and the data source.
 * Past landings may fail some rows on purpose: that shows the rules tell sites apart.
 * The section title is set by the caller (MissionCard).
 */
export function SelectionChecklist({ selection }: { selection: Selection }) {
  return (
    <div>
      <ul className="divide-y divide-white/[0.07] rounded-xl border border-white/10 bg-white/[0.02]">
        {selection.criteria.map((c) => (
          <li key={c.id} className="grid grid-cols-[1.25rem_1fr_auto] gap-x-3 px-4 py-3.5">
            <StatusIcon pass={c.pass} />
            <div className="min-w-0">
              <p className="text-[15px] leading-snug text-ink">{c.label}</p>
              <p className="mt-1 text-[13px] leading-snug text-ink/60">Rule {pretty(c.rule)}</p>
              <p className="mt-0.5 font-mono text-[11px] text-ink-muted/80">{pretty(c.source)}</p>
            </div>
            <p className="text-right font-mono text-[15px] leading-snug text-ink tabular-nums">
              {c.value === null ? (
                <span className="text-ink-muted">No data</span>
              ) : (
                <>
                  {c.value}
                  <span className="block text-[11px] text-ink-muted">{pretty(c.unit)}</span>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>

      {selection.note && (
        <p className="mt-3 rounded-xl border-l-2 border-accent/60 bg-white/[0.03] px-4 py-3 text-[13px] leading-relaxed text-ink/70">
          {pretty(selection.note)}
        </p>
      )}
    </div>
  )
}

function StatusIcon({ pass }: { pass: boolean | null }) {
  const base = 'mt-0.5 flex size-5 items-center justify-center rounded-full'
  if (pass === null)
    return (
      <span className={`${base} bg-white/10`}>
        <Minus aria-label="No data" className="size-3 text-ink-muted" />
      </span>
    )
  if (pass)
    return (
      <span className={`${base} bg-similar/15`}>
        <Check aria-label="Passes" className="size-3 text-similar" strokeWidth={3} />
      </span>
    )
  return (
    <span className={`${base} bg-different/15`}>
      <X aria-label="Fails" className="size-3 text-different" strokeWidth={3} />
    </span>
  )
}
