import { assetUrl } from '../../data/assetUrl'

/** The three bodies in the shared 3D scene. */
export type PlanetId = 'moon' | 'earth' | 'mars'

export interface PlanetConfig {
  id: PlanetId
  label: string
  texture: string
  bump: string
  bumpScale: number
  atmosphere: { color: string; altitude: number } | null
  /** Accent used for markers on this planet (matches the CSS body accent). */
  accent: string
  /** Where the planet floats on the landing page, behind the text (world units, globe radius = 100). */
  landing: { position: [number, number, number]; scale: number; spin: number }
  /** Where it waits while another planet is in focus: far away and small. */
  away: { position: [number, number, number]; scale: number }
  /** Clickable on the landing page (Earth is reached through a site's training areas). */
  clickable: boolean
}

/**
 * Texture sources (all public domain):
 * - Moon: NASA SVS CGI Moon Kit (LRO LROC color, LOLA elevation) — https://svs.gsfc.nasa.gov/4720
 * - Mars: USGS Viking MDIM 2.1 color mosaic (4096 px, slightly warmed) and MOLA elevation, from the USGS
 *   Astrogeology map server (planetarymaps.usgs.gov, layers MDIM21_color and MOLA_bw)
 * - Earth: NASA Blue Marble and topography, as shipped with three-globe's examples
 */
export const PLANETS: Record<PlanetId, PlanetConfig> = {
  moon: {
    id: 'moon',
    label: 'Moon',
    texture: assetUrl('textures/moon.jpg'),
    bump: assetUrl('textures/moon-bump.jpg'),
    bumpScale: 6,
    atmosphere: null,
    accent: '#c9d1dc',
    landing: { position: [270, 250, -200], scale: 0.42, spin: 0.05 },
    away: { position: [-1700, 900, -2200], scale: 0.3 },
    clickable: true,
  },
  earth: {
    id: 'earth',
    label: 'Earth',
    texture: assetUrl('textures/earth.jpg'),
    bump: assetUrl('textures/earth-bump.jpg'),
    bumpScale: 4,
    atmosphere: { color: '#3fd0e8', altitude: 0.16 },
    accent: '#3fd0e8',
    landing: { position: [380, -310, -520], scale: 0.85, spin: 0.04 },
    away: { position: [1500, -1100, -2600], scale: 0.35 },
    clickable: false,
  },
  mars: {
    id: 'mars',
    label: 'Mars',
    texture: assetUrl('textures/mars.jpg'),
    bump: assetUrl('textures/mars-bump.jpg'),
    bumpScale: 5,
    atmosphere: { color: '#e0663a', altitude: 0.08 },
    accent: '#e0663a',
    landing: { position: [470, 40, -60], scale: 0.95, spin: 0.06 },
    away: { position: [1800, 1000, -2000], scale: 0.3 },
    clickable: true,
  },
}

export const PLANET_IDS: PlanetId[] = ['moon', 'earth', 'mars']
