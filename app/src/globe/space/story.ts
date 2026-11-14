import type { PlanetId } from './planets'

/**
 * The landing page's scroll story, as poses for the three bodies.
 * LandingPage marks its sections with data-stage="0…"; the scroll position between two sections blends their poses.
 *
 * A pose is given in screen terms so it survives any window size: x and y are fractions of the half-width and
 * half-height of the view at depth z (0 = centre, ±1 = the edges; the camera sits at z = 1000), scale multiplies
 * the globe radius of 100. Sizes keep the real ratio Earth : Mars : Moon = 1 : 0.53 : 0.27 wherever all three are
 * on screen together.
 */
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
  /** Portrait screens: the planets sit in the upper part, the text below. */
  narrow: Record<PlanetId, Pose>
  /** A spot the planet turns toward the viewer on this stage; planets without one keep spinning. */
  face?: Partial<Record<PlanetId, Face>>
}

const FEATURED = { wide: { z: 250, scale: 1.9 }, narrow: { x: 0, y: 0.5, z: 250, scale: 1.15 } }
const OFF = {
  moon: { x: -1.7, y: 1.5, z: -900, scale: 0.55 },
  mars: { x: 1.7, y: 1.5, z: -900, scale: 1.06 },
  earth: { x: 1.5, y: -1.7, z: -900, scale: 2 },
} satisfies Record<PlanetId, Pose>

/** Hero: Earth large and cropped at the lower right, Mars and the Moon above it; the pairing arc runs between them. */
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

/** Quiet corners behind text-heavy sections and pages (the calculations and about pages use this pose too). */
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

/** Order must match the data-stage numbers in LandingPage. */
export const STAGES: StageDef[] = [
  hero,
  backdrop,
  feature('mars', 1),
  // The Moon tips its south pole toward the viewer: all three base sites lie within 5° of it.
  feature('moon', -1, { lat: -84, lon: -60 }),
  backdrop,
  feature('earth', 1),
  backdrop,
]

/** Stage used by pages that only want the planets as a quiet background. */
export const BACKDROP_STAGE = 1
