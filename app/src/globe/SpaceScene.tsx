import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppState } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Body } from '../types/data'
import { SpaceEngine, type Layout, type Marker } from './space/SpaceEngine'
import type { PlanetId } from './space/planets'

/**
 * The one 3D scene behind every page (Deniz). It never unmounts, so moving from the landing
 * page to /explore/mars is a single continuous animation: Mars flies to the center, the other
 * planets drift away, the landing sites appear.
 *
 *   /, /about            → landing: Moon, Earth, Mars float behind the text
 *   /explore/:body       → focus on that body; markers = its sites (candidates bright, past landings muted)
 *   phase "earth"        → focus on Earth; markers = the selected site's training areas
 */
export function SpaceScene() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SpaceEngine | null>(null)
  const [hover, setHover] = useState<{ label: string; x: number; y: number } | null>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { phase, selectSite, selectAnalog } = useAppState()
  const { sitesForBody, site, analogs, analog } = useSelection()

  const body = pathname.match(/^\/explore\/(moon|mars)$/)?.[1] as Body | undefined

  // Latest handlers for the engine's events, without recreating the engine.
  const handlers = useRef({ navigate, selectSite, selectAnalog })
  useEffect(() => {
    handlers.current = { navigate, selectSite, selectAnalog }
  }, [navigate, selectSite, selectAnalog])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new SpaceEngine(container, {
      onPlanetClick: (planet) => handlers.current.navigate(`/explore/${planet}`),
      onMarkerClick: (planet, id) => {
        if (planet === 'earth') handlers.current.selectAnalog(id)
        else handlers.current.selectSite(id, planet)
      },
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
    if (!body) return { kind: 'landing' }
    if (phase === 'earth') return { kind: 'focus', planet: 'earth', target: analog ? { lat: analog.lat, lon: analog.lon } : null }
    return { kind: 'focus', planet: body, target: phase === 'site' && site ? { lat: site.lat, lon: site.lon } : null }
  }, [body, phase, site, analog])

  const markers = useMemo<{ planet: PlanetId | null; list: Marker[] }>(() => {
    if (!body) return { planet: null, list: [] }
    if (phase === 'earth') {
      return {
        planet: 'earth',
        list: analogs.map((a) => ({ id: a.id, lat: a.lat, lon: a.lon, label: `#${a.rank} ${a.name}`, emphasis: 'strong', active: a.id === analog?.id })),
      }
    }
    return {
      planet: body,
      list: sitesForBody.map((s) => ({
        id: s.id,
        lat: s.lat,
        lon: s.lon,
        label: s.name,
        emphasis: s.selection.role === 'candidate' ? 'strong' : 'muted',
        active: s.id === site?.id,
      })),
    }
  }, [body, phase, analogs, analog, sitesForBody, site])

  // Compare by value so re-renders with equal content don't restart the animation.
  const layoutKey = JSON.stringify(layout)
  useEffect(() => {
    engineRef.current?.setLayout(JSON.parse(layoutKey) as Layout)
  }, [layoutKey])

  useEffect(() => {
    engineRef.current?.setMarkers(markers.planet, markers.list)
  }, [markers])

  return (
    <div ref={containerRef} className="absolute inset-0" role="img" aria-label="3D view of the Moon, Earth and Mars">
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
