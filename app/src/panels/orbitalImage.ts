import { assetUrl } from '../data/assetUrl'
import type { Body } from '../types/data'

export interface OrbitalImage {
  src: string
  widthKm: number
  credit: string
}

const WIDTH_KM = 60
const PX = { w: 900, h: 600 }
const HEIGHT_KM = (WIDTH_KM * PX.h) / PX.w
const KM_PER_DEG = { mars: 59.27, moon: 30.32, earth: 111.32 }
const MOON_RADIUS_M = 1_737_400

function wms(base: string, layer: string, srs: string, bbox: number[]) {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.1.1',
    REQUEST: 'GetMap',
    LAYERS: layer,
    STYLES: '',
    SRS: srs,
    BBOX: bbox.map((v) => v.toFixed(5)).join(','),
    WIDTH: String(PX.w),
    HEIGHT: String(PX.h),
    FORMAT: 'image/jpeg',
  })
  return `${base}${base.includes('?') ? '&' : '?'}${params}`
}

function lonLatBox(lat: number, lon: number, kmPerDeg: number) {
  const dLat = HEIGHT_KM / 2 / kmPerDeg
  const dLon = WIDTH_KM / 2 / (kmPerDeg * Math.max(Math.cos((lat * Math.PI) / 180), 0.05))
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat]
}

export function orbitalImage(body: Body | 'earth', lat: number, lon: number, image: string | null): OrbitalImage | null {
  if (image) return { src: assetUrl(image), widthKm: WIDTH_KM, credit: '' }

  if (body === 'mars') {
    return {
      src: wms('https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map', 'THEMIS', 'EPSG:4326', lonLatBox(lat, lon, KM_PER_DEG.mars)),
      widthKm: WIDTH_KM,
      credit: 'THEMIS day IR mosaic · NASA / ASU · via USGS Astrogeology',
    }
  }

  if (body === 'moon' && lat < -80) {
    const rho = 2 * MOON_RADIUS_M * Math.tan((((90 - Math.abs(lat)) / 2) * Math.PI) / 180)
    const x = rho * Math.sin((lon * Math.PI) / 180)
    const y = rho * Math.cos((lon * Math.PI) / 180)
    const hw = (WIDTH_KM * 1000) / 2
    const hh = (HEIGHT_KM * 1000) / 2
    return {
      src: wms('https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_spole.map', 'LRO_WAC_south', 'EPSG:32761', [x - hw, y - hh, x + hw, y + hh]),
      widthKm: WIDTH_KM,
      credit: 'LRO WAC south-pole mosaic · NASA / ASU · via USGS Astrogeology',
    }
  }

  if (body === 'moon') {
    return {
      src: wms('https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/earth/moon_simp_cyl.map', 'LROC_WAC', 'EPSG:4326', lonLatBox(lat, lon, KM_PER_DEG.moon)),
      widthKm: WIDTH_KM,
      credit: 'LRO WAC global mosaic · NASA / ASU · via USGS Astrogeology',
    }
  }

  return {
    src: wms('https://tiles.maps.eox.at/wms', 's2cloudless-2020', 'EPSG:4326', lonLatBox(lat, lon, KM_PER_DEG.earth)),
    widthKm: WIDTH_KM,
    credit: 'Sentinel-2 cloudless 2020 · s2maps.eu by EOX IT Services GmbH (contains modified Copernicus Sentinel data 2020)',
  }
}
