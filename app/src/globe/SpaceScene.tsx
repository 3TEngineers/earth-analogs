import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useData } from '../data/DataProvider'
import { placeOf } from '../panels/format'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Body } from '../types/data'
import { sceneStore } from './sceneStore'
import { PLANETS, type PlanetId } from './space/planets'
import { SpaceEngine, type Layout, type Marker } from './space/SpaceEngine'
import { BACKDROP_STAGE } from './space/story'

/** Space kept free under the fixed header when a planet is in focus (px). */
const HEADER_PX = 64

/**
 * The one 3D scene behind every page. It never unmounts, so moving from the landing page to /explore/mars is a
 * single continuous animation: Mars flies to the center, the other planets drift away, the landing sites appear.
 *
 *   /                    → story: the planets follow the page scroll; the first screen links a site to its Earth match
 *   /calculations, /about→ story, parked on the quiet backdrop stage
 *   /explore/:body       → focus on that body; markers = its sites (candidates bright, validation sites muted)
 *                          plus every other past landing from landings.json as a name-only tag
 *        phase "earth"   → focus on Earth; markers = the selected site's training areas
 *   /earth, /earth/:id   → focus on Earth; markers = all training areas, coloured by the body they stand in for
 */
export function SpaceScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SpaceEngine | null>(null)
  const [hover, setHover] = useState<{ label: string; x: number; y: number } | null>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { phase, selectSite, selectAnalog } = useAppState()
  const { sitesForBody, site, analogs, analog } = useSelection()
  const data = useData()
  // Stable references: a fresh [] on every render would rebuild every marker on every render.
  const landings = useMemo(() => (data.status === 'ready' ? data.landings.landings : []), [data])
  const allSites = useMemo(() => (data.status === 'ready' ? data.sites.sites : []), [data])
  const allAnalogs = useMemo(() => (data.status === 'ready' ? data.analogs.analogs : []), [data])

  const body = pathname.match(/^\/explore\/(moon|mars)$/)?.[1] as Body | undefined
  const earthRoute = pathname.match(/^\/earth(?:\/([^/]+))?$/)
  const onEarthPage = earthRoute !== null
  const earthId = earthRoute?.[1] ?? null
  const earthPick = useMemo(() => allAnalogs.find((a) => a.id === earthId) ?? null, [allAnalogs, earthId])

  // Latest handlers for the engine's events, without recreating the engine.
  const onMarker = (planet: PlanetId, id: string) => {
    if (planet === 'earth') {
      if (body) selectAnalog(id)
      else navigate(`/earth/${id}`)
    } else if (body) selectSite(id, planet)
    else navigate(`/explore/${planet}?site=${id}`)
  }
  const handlers = useRef({ navigate, onMarker })
  useEffect(() => {
    handlers.current = { navigate, onMarker }
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new SpaceEngine(container, {
      onPlanetClick: (planet) => handlers.current.navigate(PLANETS[planet].href),
      onMarkerClick: (planet, id) => handlers.current.onMarker(planet, id),
      onHover: setHover,
      // Pages fade their text in once the planets are there (see .reveal in index.css).
      onReady: () => {
        document.documentElement.dataset.sceneReady = 'true'
      },
    })
    engineRef.current = engine
    return () => {
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const layout = useMemo<Layout>(() => {
    if (onEarthPage) return { kind: 'focus', planet: 'earth', target: earthPick ? { lat: earthPick.lat, lon: earthPick.lon } : null }
    if (!body) return { kind: 'story' }
    if (phase === 'earth') return { kind: 'focus', planet: 'earth', target: analog ? { lat: analog.lat, lon: analog.lon } : null }
    return { kind: 'focus', planet: body, target: phase === 'site' && site ? { lat: site.lat, lon: site.lon } : null }
  }, [onEarthPage, earthPick, body, phase, site, analog])

  const markers = useMemo<{ sets: Partial<Record<PlanetId, Marker[]>>; labelled: PlanetId | null }>(() => {
    const bodyOf = (siteId: string) => allSites.find((s) => s.id === siteId)?.body ?? 'mars'
    const candidates = (b: Body): Marker[] =>
      allSites
        .filter((s) => s.body === b && s.selection.role === 'candidate')
        .map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, label: s.name, emphasis: 'strong', active: false }))
    const areas = (activeId: string | null): Marker[] =>
      allAnalogs.map((a) => ({
        id: a.id,
        lat: a.lat,
        lon: a.lon,
        label: placeOf(a.name),
        emphasis: 'strong',
        active: a.id === activeId,
        color: PLANETS[bodyOf(a.siteId)].accent,
      }))

    if (onEarthPage) return { sets: { earth: areas(earthPick?.id ?? null) }, labelled: 'earth' }
    if (!body) return { sets: { mars: candidates('mars'), moon: candidates('moon'), earth: areas(null) }, labelled: null }
    if (phase === 'earth') {
      const list: Marker[] = analogs.map((a) => ({
        id: a.id,
        lat: a.lat,
        lon: a.lon,
        label: `${a.rank} · ${placeOf(a.name)}`,
        emphasis: 'strong',
        active: a.id === analog?.id,
      }))
      return { sets: { earth: list }, labelled: 'earth' }
    }
    const siteMarkers: Marker[] = sitesForBody.map((s) => ({
      id: s.id,
      lat: s.lat,
      lon: s.lon,
      label: s.name,
      emphasis: s.selection.role === 'candidate' ? 'strong' : 'muted',
      active: s.id === site?.id,
    }))
    // Every other past landing: name and year only. Skip ones already shown as a validation site (within ~1°).
    const near = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) =>
      Math.abs(a.lat - b.lat) < 1 && Math.abs(((a.lon - b.lon + 540) % 360) - 180) < 1
    const landingMarkers: Marker[] = landings
      .filter((l) => l.body === body && !sitesForBody.some((s) => near(s, l)))
      .map((l) => ({ id: `landing:${l.name}`, lat: l.lat, lon: l.lon, label: `${l.name} · ${l.year}`, emphasis: 'landing', active: false }))
    return { sets: { [body]: [...siteMarkers, ...landingMarkers] }, labelled: body }
  }, [onEarthPage, earthPick, body, phase, analogs, analog, sitesForBody, site, landings, allSites, allAnalogs])

  // Compare by value so re-renders with equal content don't restart the animation.
  const layoutKey = JSON.stringify(layout)
  useEffect(() => {
    engineRef.current?.setLayout(JSON.parse(layoutKey) as Layout)
  }, [layoutKey])

  useEffect(() => {
    engineRef.current?.setMarkers(markers.sets, markers.labelled)
  }, [markers])

  // Scroll story, the landing pair and the panel insets come from the pages through the scene store.
  const onLanding = pathname === '/'
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const apply = () => {
      const s = sceneStore.get()
      engine.setStory(onLanding ? s.stage : BACKDROP_STAGE)
      engine.setPair(onLanding ? s.pair : null)
      engine.setInsets({ ...s.insets, top: Math.max(s.insets.top, HEADER_PX) })
    }
    apply()
    return sceneStore.subscribe(apply)
  }, [onLanding])

  return (
    <div ref={containerRef} className="fixed inset-0" role="img" aria-label="3D view of the Moon, Earth and Mars">
      {hover && (
        <div
          className="pointer-events-none absolute z-30 rounded-md border border-line bg-panel px-2 py-1 font-mono text-xs text-ink backdrop-blur-md"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          {hover.label}
        </div>
      )}
    </div>
  )
}
