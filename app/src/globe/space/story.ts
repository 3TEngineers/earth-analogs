import type { PlanetId } from './planets'

export interface Pose {
  x: number
  y: number
  z: number
  scale: number
}

export interface Face {
  lat: number
  lon: number
}

export interface StageDef {
  id: 'hero' | 'backdrop' | 'mars' | 'moon' | 'earth'
  wide: Record<PlanetId, Pose>
  narrow: Record<PlanetId, Pose>
  face?: Partial<Record<PlanetId, Face>>
}

const FEATURED = { wide: { z: 250, scale: 1.9 }, narrow: { x: 0, y: 0.5, z: 250, scale: 1.15 } }
const OFF = {
  moon: { x: -1.7, y: 1.5, z: -900, scale: 0.55 },
  mars: { x: 1.7, y: 1.5, z: -900, scale: 1.06 },
  earth: { x: 1.5, y: -1.7, z: -900, scale: 2 },
} satisfies Record<PlanetId, Pose>

const hero: StageDef = {
  id: 'hero',
  wide: {
    earth: { x: 0.62, y: -0.52, z: 0, scale: 2.5 },
    mars: { x: 0.3, y: 0.5, z: 0, scale: 1.33 },
    moon: { x: 0.86, y: 0.56, z: 0, scale: 0.68 },
  },
  narrow: {
    earth: { x: 0.5, y: 0.36, z: 0, scale: 1.2 },
    mars: { x: -0.52, y: 0.58, z: 0, scale: 0.64 },
    moon: { x: -0.02, y: 0.76, z: 0, scale: 0.33 },
  },
}

const backdrop: StageDef = {
  id: 'backdrop',
  wide: {
    earth: { x: 0.8, y: -0.85, z: -600, scale: 2 },
    mars: { x: 0.82, y: 0.72, z: -600, scale: 1.06 },
    moon: { x: -0.85, y: 0.74, z: -600, scale: 0.55 },
  },
  narrow: {
    earth: { x: 0.95, y: -0.92, z: -600, scale: 2 },
    mars: { x: 0.85, y: 0.86, z: -600, scale: 1.06 },
    moon: { x: -0.8, y: 0.88, z: -600, scale: 0.55 },
  },
}

const feature = (planet: PlanetId, side: 1 | -1, face?: Face): StageDef => ({
  id: planet,
  wide: { ...OFF, [planet]: { x: side * 0.46, y: 0, ...FEATURED.wide } },
  narrow: { ...OFF, [planet]: FEATURED.narrow },
  face: face ? { [planet]: face } : undefined,
})

export const STAGES: StageDef[] = [
  hero,
  backdrop,
  feature('mars', 1),
  feature('moon', -1, { lat: -84, lon: -60 }),
  backdrop,
  feature('earth', 1),
  backdrop,
]

export const BACKDROP_STAGE = 1
