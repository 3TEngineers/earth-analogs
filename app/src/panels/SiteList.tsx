import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Site } from '../types/data'
import { SiteCard } from './SiteCard'

/** Sites for the chosen body in two groups: our candidates first, then past landings (validation). */
export function SiteList() {
  const { siteId, selectSite } = useAppState()
  const { sitesForBody } = useSelection()

  const groups: { title: string; hint: string; sites: Site[] }[] = [
    {
      title: 'Our candidates',
      hint: 'Found by our screening',
      sites: sitesForBody.filter((s) => s.selection.role === 'candidate'),
    },
    {
      title: 'Past landings',
      hint: 'Same rules, used as a check',
      sites: sitesForBody.filter((s) => s.selection.role === 'validation'),
    },
  ]

  return (
    <div className="space-y-8">
      {groups.map(
        (g) =>
          g.sites.length > 0 && (
            <section key={g.title} aria-label={g.title}>
              <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-white/10 pb-2">
                <h3 className="font-mono text-xs tracking-[0.18em] text-ink uppercase">{g.title}</h3>
                <p className="text-[13px] text-ink-muted">{g.hint}</p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-1">
                {g.sites.map((s, i) => (
                  <li key={s.id}>
                    <SiteCard site={s} index={i + 1} selected={s.id === siteId} onSelect={() => selectSite(s.id, s.body)} />
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  )
}
