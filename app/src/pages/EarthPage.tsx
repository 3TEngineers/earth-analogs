import { ArrowRight } from 'lucide-react'
import { useMemo, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { AnalogReport } from '../panels/AnalogReport'
import { candidateLetter, placeOf } from '../panels/format'
import { SidePanel } from '../panels/ui'
import type { Analog, Body, Site } from '../types/data'

/**
 * Earth page ("/earth", "/earth/<training area id>"): every training area we found, on one globe.
 * <SpaceScene> shows Earth with all areas as markers, coloured by the world they stand in for (Mars or the Moon).
 * The panel lists them under the site each one belongs to; picking one opens its report and flies the globe there.
 * The selection lives in the URL, so a report can be linked to.
 */
export function EarthPage() {
  const { analogId } = useParams()
  const navigate = useNavigate()
  const data = useData()
  const sites = useMemo(() => (data.status === 'ready' ? data.sites.sites.filter((s) => s.selection.role === 'candidate') : []), [data])
  const analogs = useMemo(() => (data.status === 'ready' ? data.analogs.analogs : []), [data])
  const accent = { '--body-accent': 'var(--color-earth)' } as CSSProperties

  const pick = analogs.find((a) => a.id === analogId) ?? null
  const pickSite = pick ? (sites.find((s) => s.id === pick.siteId) ?? null) : null
  if (analogId && data.status === 'ready' && !pick) return <Navigate to="/earth" replace />

  if (pick && pickSite && data.status === 'ready') {
    const world = pickSite.body === 'mars' ? 'Mars' : 'the Moon'
    return (
      <main className="pointer-events-none fixed inset-0 z-10" style={accent}>
        <SiteHeader />
        <AnalogReport
          key={pick.id}
          site={pickSite}
          analog={pick}
          siblings={analogs.filter((a) => a.siteId === pickSite.id).sort((a, b) => a.rank - b.rank)}
          dimensions={data.analogs.dimensions.filter((d) => d.bodies.includes(pickSite.body))}
          onSelect={(id) => navigate(`/earth/${id}`)}
          back={{ label: `All ${analogs.length} training areas`, onClick: () => navigate('/earth') }}
          action={
            <Link
              to={`/explore/${pickSite.body}?site=${pickSite.id}`}
              className="press inline-flex shrink-0 items-center gap-1.5 font-display text-sm font-medium text-ink hover:text-accent"
            >
              See it on {world} <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          }
        />
      </main>
    )
  }

  const group = (body: Body) => sites.filter((s) => s.body === body)
  const count = (body: Body) => analogs.filter((a) => group(body).some((s) => s.id === a.siteId)).length

  return (
    <main className="pointer-events-none fixed inset-0 z-10" style={accent}>
      <SiteHeader />
      {data.status === 'error' && <p className="absolute bottom-4 left-4 text-different">{data.message}</p>}
      <SidePanel label="Training areas on Earth" viewKey="earth-list">
        <p className="eyebrow text-accent">Earth · the rehearsal ground</p>
        <h1 className="headline mt-2.5 text-[2rem] sm:text-[2.5rem]">{analogs.length || 24} places to rehearse</h1>
        <p className="mt-3 leading-relaxed text-ink/90">
          Each place stands in for one of our {sites.length || 7} sites: three per site, at least 500 km apart. Pick one to see
          how close the match is, what a crew can test there, and where the likeness stops.
        </p>

        {(['mars', 'moon'] as const).map((body) => (
          <section key={body} className="mt-8" style={{ '--body-accent': `var(--color-${body})` } as CSSProperties}>
            <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
              <h2 className="flex items-center gap-2.5 font-display text-xl font-semibold">
                <span className="size-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--body-accent)]" aria-hidden="true" />
                Standing in for {body === 'mars' ? 'Mars' : 'the Moon'}
              </h2>
              <p className="font-mono text-[11px] text-ink-muted tabular-nums">{count(body)} areas</p>
            </div>
            <div className="mt-4 grid gap-x-6 gap-y-6 lg:grid-cols-2">
              {group(body).map((site) => (
                <SiteGroup key={site.id} site={site} analogs={analogs.filter((a) => a.siteId === site.id).sort((a, b) => a.rank - b.rank)} />
              ))}
            </div>
          </section>
        ))}
      </SidePanel>
    </main>
  )
}

function SiteGroup({ site, analogs }: { site: Site; analogs: Analog[] }) {
  return (
    <div>
      <Link to={`/explore/${site.body}?site=${site.id}`} className="group flex items-center gap-2 font-display text-[0.95rem] font-medium hover:text-accent">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-space">{candidateLetter(site.id)}</span>
        <span className="min-w-0 truncate">{site.name}</span>
        <ArrowRight className="size-3.5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" aria-hidden="true" />
      </Link>
      <ul className="mt-2 space-y-1">
        {analogs.map((a) => (
          <li key={a.id}>
            <Link
              to={`/earth/${a.id}`}
              className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors hover:border-line hover:bg-white/[0.05]"
            >
              <span className="min-w-0">
                <span className="block truncate">{placeOf(a.name)}</span>
                <span className="block truncate text-[0.8rem] text-ink-muted">{a.country}</span>
              </span>
              <span className="font-mono text-sm tabular-nums">
                {a.totalScore}
                <span className="text-[10px] text-ink-muted">/100</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
