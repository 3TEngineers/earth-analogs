import { assetUrl } from '../../data/assetUrl'

export type PlanetId = 'moon' | 'earth' | 'mars'

export interface PlanetConfig {
  id: PlanetId
  label: string
  texture: string
  sharpTexture: string
  bump: string
  bumpScale: number
  atmosphere: { color: string; altitude: number } | null
  accent: string
  spin: number
  focusAway: { position: [number, number, number]; scale: number }
  focusFrom: [number, number, number]
  href: string
}

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
