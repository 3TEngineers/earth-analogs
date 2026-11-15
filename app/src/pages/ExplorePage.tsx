import { useEffect } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { useData } from '../data/DataProvider'
import { AnalogReport } from '../panels/AnalogReport'
import { SiteDetail } from '../panels/SiteDetail'
import { SiteDock } from '../panels/SiteDock'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Body } from '../types/data'

const BODIES: Body[] = ['moon', 'mars']

export default function ExplorePage() {
  const { body } = useParams()
  const [params] = useSearchParams()
  const linkedSite = params.get('site')
  const isValid = BODIES.includes(body as Body)
  const { body: stateBody, phase, setBody, selectSite, selectAnalog, backToSite, reset } = useAppState()
  const { site, analogs, analog, dimensions } = useSelection()
  const data = useData()

  useEffect(() => {
    if (isValid && stateBody !== body) setBody(body as Body)
  }, [isValid, body, stateBody, setBody])

  const linked = data.status === 'ready' ? (data.sites.sites.find((s) => s.id === linkedSite && s.body === body) ?? null) : null
  useEffect(() => {
    if (linked) selectSite(linked.id, linked.body)
  }, [linked, selectSite])

  useEffect(() => reset, [reset])

  if (!isValid) return <Navigate to="/" replace />
  const current = analog ?? analogs[0] ?? null

  return (
    <main className="pointer-events-none fixed inset-0 z-10">
      <SiteHeader />
      {data.status === 'error' && <p className="absolute bottom-4 left-4 text-different">{data.message}</p>}
      {phase === 'browse' && <SiteDock />}
      {phase === 'site' && site && <SiteDetail key={site.id} site={site} />}
      {phase === 'earth' && site && current && (
        <AnalogReport
          key={current.id}
          site={site}
          analog={current}
          siblings={analogs}
          dimensions={dimensions}
          onSelect={selectAnalog}
          back={{ label: `Back to ${site.name}`, onClick: backToSite }}
        />
      )}
    </main>
  )
}
