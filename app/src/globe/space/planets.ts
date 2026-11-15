import { assetUrl } from '../../data/assetUrl'

/** The three bodies in the shared 3D scene. */
export type PlanetId = 'moon' | 'earth' | 'mars'

export interface PlanetConfig {
  id: PlanetId
  label: string
  texture: string
  /** 8192 × 4096 version, swapped in once the scene is running (desktop only, see SpaceEngine.loadSharpTextures). */
  sharpTexture: string
  bump: string
  bumpScale: number
  atmosphere: { color: string; altitude: number } | null
  /** Accent used for markers on this planet (matches the CSS body colors in index.css). */
  accent: string
  /** Turn rate while it floats in the story (radians per second). */
  spin: number
  /** Where it waits while another body is in focus (world units, globe radius = 100): far away, never behind a panel. */
  focusAway: { position: [number, number, number]; scale: number }
  /** Direction the camera looks from when the body first comes into focus (the Moon is seen from below: its sites are at the south pole). */
  focusFrom: [number, number, number]
  /** Where a click on the planet leads from the landing page. */
  href: string
}

/**
 * Texture sources (all public domain):
 * - Moon: NASA SVS CGI Moon Kit (LRO LROC color, LOLA elevation) — https://svs.gsfc.nasa.gov/4720
 * - Mars: USGS Viking MDIM 2.1 color mosaic (4096 px, slightly warmed) and MOLA elevation, from the USGS
 *   Astrogeology map server (planetarymaps.usgs.gov, layers MDIM21_color and MOLA_bw)
 * - Earth: NASA Blue Marble and topography, as shipped with three-globe's examples
 * 8K versions (textures/*-8k.jpg, built by pipeline/fetch_textures.py):
 * - Moon: the same kit's lroc_color_poles_8k.tif, tone matched to moon.jpg
 * - Mars: USGS MDIM21_color at 8192 × 4096, tone matched to mars.jpg
 * - Earth: NASA GIBS BlueMarble_ShadedRelief_Bathymetry at 8192 × 4096
 */
export const PLANETS: Record<PlanetId, PlanetConfig> = {
  moon: {
    id: 'moon',
    label: 'Moon',
    texture: assetUrl('textures/moon.jpg'),
    sharpTexture: assetUrl('textures/moon-8k.jpg'),
    bump: assetUrl('textures/moon-bump.jpg'),
    bumpScale: 6,
    atmosphere: null,
    accent: '#cfd4dc',
    spin: 0.05,
    focusAway: { position: [-1700, 900, -2200], scale: 0.3 },
    focusFrom: [0, -0.9, 0.45],
    href: '/explore/moon',
  },
  earth: {
    id: 'earth',
    label: 'Earth',
    texture: assetUrl('textures/earth.jpg'),
    sharpTexture: assetUrl('textures/earth-8k.jpg'),
    bump: assetUrl('textures/earth-bump.jpg'),
    bumpScale: 4,
    atmosphere: { color: '#56c7ee', altitude: 0.16 },
    accent: '#56c7ee',
    spin: 0.04,
    focusAway: { position: [-1600, -1000, -2600], scale: 0.35 },
    focusFrom: [0, 0.25, 1],
    href: '/earth',
  },
  mars: {
    id: 'mars',
    label: 'Mars',
    texture: assetUrl('textures/mars.jpg'),
    sharpTexture: assetUrl('textures/mars-8k.jpg'),
    bump: assetUrl('textures/mars-bump.jpg'),
    bumpScale: 5,
    atmosphere: { color: '#e56f3e', altitude: 0.08 },
    accent: '#e56f3e',
    spin: 0.06,
    focusAway: { position: [-500, 1250, -2600], scale: 0.3 },
    focusFrom: [0, 0.25, 1],
    href: '/explore/mars',
  },
}

export const PLANET_IDS: PlanetId[] = ['moon', 'earth', 'mars']
