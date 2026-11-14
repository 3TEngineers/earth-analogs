import { useEffect, useMemo, useRef, useState } from 'react'
import Globe, { type GlobeMethods } from 'react-globe.gl'
import { useAppState, type DisplayBody } from '../state/AppState'
import { useSelection } from '../state/useSelection'
import type { Analog, Site } from '../types/data'

/**
 * D1 placeholder globe: plain spheres per body, site/analog points and fly-to.
 * D2 adds NASA textures, bump maps and atmosphere; D4 adds the Moon/Mars → Earth transition.
 */

const BODY_STYLE: Record<DisplayBody, { color: string; atmosphere: string; atmosphereAltitude: number }> = {
  moon: { color: '#8b919a', atmosphere: '#c9d1dc', atmosphereAltitude: 0.05 },
  mars: { color: '#a8502c', atmosphere: '#e0663a', atmosphereAltitude: 0.1 },
  earth: { color: '#1d4e6e', atmosphere: '#3fd0e8', atmosphereAltitude: 0.18 },
}

/** Plain-color texture for the placeholder spheres (replaced by NASA textures in D2). */
const textureCache = new Map<string, string>()
function solidTexture(color: string): string {
  const cached = textureCache.get(color)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 2
  const context = canvas.getContext('2d')
  if (context) {
    context.fillStyle = color
    context.fillRect(0, 0, 2, 2)
  }
  const url = canvas.toDataURL()
  textureCache.set(color, url)
  return url
}

type Marker ={ id: string; lat: number; lon: number; label: string; kind: 'site' | 'analog'; active: boolean }

function useContainerSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, ...size }
}

export function GlobeView() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const { ref, width, height } = useContainerSize<HTMLDivElement>()
  const { phase, displayBody, siteId, analogId, selectSite, selectAnalog } = useAppState()
  const { sitesForBody, site, analogs, analog } = useSelection()
  const style = BODY_STYLE[displayBody]

  const markers = useMemo<Marker[]>(() => {
    if (phase === 'earth') {
      return analogs.map((a: Analog) => ({
        id: a.id, lat: a.lat, lon: a.lon, label: a.name, kind: 'analog', active: a.id === analogId,
      }))
    }
    return sitesForBody.map((s: Site) => ({
      id: s.id, lat: s.lat, lon: s.lon, label: s.name, kind: 'site', active: s.id === siteId,
    }))
  }, [phase, analogs, sitesForBody, analogId, siteId])

  // Idle rotation only while browsing.
  useEffect(() => {
    const controls = globeRef.current?.controls()
    if (!controls) return
    controls.autoRotate = phase === 'browse'
    controls.autoRotateSpeed = 0.4
  }, [phase, width])

  // Fly to the focused place.
  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const target = phase === 'earth' ? analog : phase === 'site' ? site : null
    if (target) globe.pointOfView({ lat: target.lat, lng: target.lon, altitude: 1.2 }, 2000)
    else globe.pointOfView({ altitude: 2.5 }, 1500)
  }, [phase, site, analog, displayBody])

  return (
    <div ref={ref} className="absolute inset-0" aria-label={`3D globe of the ${displayBody}`} role="img">
      {width > 0 && (
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          showGlobe
          globeImageUrl={solidTexture(style.color)}
          onGlobeReady={() => globeRef.current?.pointOfView({ altitude: 2.5 })}
          showAtmosphere
          atmosphereColor={style.atmosphere}
          atmosphereAltitude={style.atmosphereAltitude}
          showGraticules
          pointsData={markers}
          pointLat={(m) => (m as Marker).lat}
          pointLng={(m) => (m as Marker).lon}
          pointLabel={(m) => (m as Marker).label}
          pointColor={(m) => ((m as Marker).active ? '#ffffff' : style.atmosphere)}
          pointAltitude={(m) => ((m as Marker).active ? 0.06 : 0.02)}
          pointRadius={0.6}
          onPointClick={(m) => {
            const marker = m as Marker
            if (marker.kind === 'analog') selectAnalog(marker.id)
            else {
              const s = sitesForBody.find((x) => x.id === marker.id)
              if (s) selectSite(s.id, s.body)
            }
          }}
        />
      )}
    </div>
  )
}
