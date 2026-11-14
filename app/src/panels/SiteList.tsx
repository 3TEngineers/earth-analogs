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
      hint: 'Checked against the same criteria',
      sites: sitesForBody.filter((s) => s.selection.role === 'validation'),
    },
  ]

  return (
    <div className="space-y-5">
      {groups.map(
        (g) =>
          g.sites.length > 0 && (
            <section key={g.title} aria-label={g.title}>
              <h2 className="font-display text-xs font-semibold tracking-wider text-ink-muted uppercase">{g.title}</h2>
              <p className="mb-2 text-xs text-ink-muted">{g.hint}</p>
              <ul className="space-y-2">
                {g.sites.map((s) => (
                  <li key={s.id}>
                    <SiteCard site={s} selected={s.id === siteId} onSelect={() => selectSite(s.id, s.body)} />
                  </li>
                ))}
              </ul>
            </section>
          ),
      )}
    </div>
  )
}
