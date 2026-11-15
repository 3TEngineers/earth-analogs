import { Check, Minus, X } from 'lucide-react'
import type { Criterion, Selection } from '../types/data'
import { pretty } from './format'

/**
 * The rules a site was tested against, one row each: pass or fail, what was measured, the limit, the value and the
 * data it comes from. Past landings may fail some rows on purpose: that shows the rules tell sites apart.
 */
export function SelectionChecklist({ selection }: { selection: Selection }) {
  return <RuleList criteria={selection.criteria} />
}

/** The same rows for any list of rules: ours, or the limits a mission's own team set. */
export function RuleList({ criteria }: { criteria: Criterion[] }) {
  return (
    <ul className="divide-y divide-line">
      {criteria.map((c) => (
        <li key={c.id} className="grid grid-cols-[1.25rem_1fr_auto] gap-x-3 py-3.5 first:pt-0">
          <StatusIcon pass={c.pass} />
          <div className="min-w-0">
            <p className="leading-snug text-ink">{c.label}</p>
            <p className="mt-1 text-[0.8rem] leading-snug text-ink-muted">Limit {pretty(c.rule)}</p>
            <p className="mt-0.5 font-mono text-[11px] text-ink-muted/70">{pretty(c.source)}</p>
            {c.why && (
              <p className="mt-2 border-l-2 border-different/70 pl-3 text-[0.85rem] leading-relaxed text-ink/85">
                <span className="font-medium text-ink">Why it did not matter here: </span>
                {c.why}
              </p>
            )}
          </div>
          <p className="text-right font-display text-xl leading-tight font-semibold tabular-nums">
            {c.value === null ? (
              <span className="font-sans text-sm font-normal text-ink-muted">No data</span>
            ) : (
              <>
                {c.value}
                <span className="block font-mono text-[11px] font-normal text-ink-muted">{pretty(c.unit)}</span>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
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
