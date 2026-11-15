import { ChevronUp } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useIsDesktop, useSceneInset } from '../globe/sceneStore'

export function SidePanel({ label, viewKey, children, footer }: { label: string; viewKey: string; children: ReactNode; footer?: ReactNode }) {
  const desktop = useIsDesktop()
  const [liftedView, setLiftedView] = useState<string | null>(null)
  const lifted = liftedView === viewKey
  const ref = useSceneInset<HTMLElement>('panel', desktop ? 'right' : 'bottom', { hold: !desktop && lifted })

  return (
    <aside
      ref={ref}
      aria-label={label}
      className={`glass pointer-events-auto fixed inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-2xl border-b-0 transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none ${
        lifted ? 'h-[86svh]' : 'h-[42svh]'
      } md:inset-x-auto md:top-20 md:right-5 md:bottom-5 md:h-auto md:w-[min(46vw,42rem)] md:rounded-2xl md:border-b`}
    >
      <button
        type="button"
        onClick={() => setLiftedView(lifted ? null : viewKey)}
        aria-expanded={lifted}
        className="group flex shrink-0 items-center justify-center gap-1.5 pt-2 pb-1 font-display text-xs font-medium text-ink-muted md:hidden"
      >
        <span className="h-1 w-9 rounded-full bg-ink-muted/40 transition-colors group-hover:bg-ink-muted" aria-hidden="true" />
        <span className="sr-only">{lifted ? 'Show less' : 'Show more'}</span>
        <ChevronUp className={`size-4 transition-transform duration-300 ${lifted ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <div key={viewKey} className="panel-in min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6 sm:px-7 md:pt-6 [scrollbar-color:rgb(255_255_255/0.2)_transparent] [scrollbar-width:thin]">
        {children}
      </div>
      {footer && <div className="shrink-0 border-t border-line bg-space/40 px-5 py-3.5 sm:px-7">{footer}</div>}
    </aside>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div role="tablist" className="flex gap-1 border-b border-line">
      {tabs.map((t, i) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative px-3 py-2.5 font-display text-[0.95rem] font-medium first:pl-0 ${active ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
          >
            {t.label}
            {t.count && <span className="ml-1.5 font-mono text-[11px] text-ink-muted tabular-nums">{t.count}</span>}
            {active && <span className={`accent-transition absolute right-3 -bottom-px h-0.5 rounded-full bg-accent ${i === 0 ? 'left-0' : 'left-3'}`} aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}

export function PassBadge({ passed, total }: { passed: number; total: number }) {
  const all = passed === total
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-xs tabular-nums ${
        all ? 'border-similar/40 bg-similar/10 text-similar' : 'border-different/40 bg-different/10 text-different'
      }`}
    >
      {passed} / {total} rules passed
    </span>
  )
}

export function RuleTicks({ passes }: { passes: (boolean | null)[] }) {
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {passes.map((p, i) => (
        <span key={i} className={`h-1 w-3 rounded-full ${p === true ? 'bg-similar/85' : p === false ? 'bg-different/85' : 'bg-white/15'}`} />
      ))}
    </span>
  )
}

export function GroupTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="eyebrow text-ink">{children}</h3>
      {hint && <p className="text-[0.8rem] text-ink-muted">{hint}</p>}
    </div>
  )
}
