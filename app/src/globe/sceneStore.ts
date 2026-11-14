import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Insets, Pair } from './space/SpaceEngine'

/**
 * What pages tell the 3D scene besides the route and the shared selection (state/AppState):
 *   stage   landing page: how far the scroll story has come (LandingPage)
 *   pair    landing page: the site ↔ Earth pair the first screen is showing
 *   insets  explore and Earth pages: screen space covered by panels, so the planet sits in the free area
 * A tiny store instead of React state: the scroll position changes every frame and should not re-render anything.
 */
interface SceneState {
  stage: number
  pair: Pair | null
  insets: Insets
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 }
let state: SceneState = { stage: 0, pair: null, insets: NO_INSETS }
const insetParts = new Map<string, Partial<Insets>>()
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

export const sceneStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  setStage(stage: number) {
    if (stage === state.stage) return
    state = { ...state, stage }
    emit()
  },
  setPair(pair: Pair | null) {
    state = { ...state, pair }
    emit()
  },
  /** Each panel reports its own edge under a key; the scene gets the largest value per side. null removes the part. */
  setInset(key: string, part: Partial<Insets> | null) {
    if (part) insetParts.set(key, part)
    else insetParts.delete(key)
    const insets = { ...NO_INSETS }
    for (const p of insetParts.values()) {
      for (const side of Object.keys(p) as (keyof Insets)[]) insets[side] = Math.max(insets[side], p[side] ?? 0)
    }
    state = { ...state, insets }
    emit()
  },
}

/** True from Tailwind's md breakpoint up (768 px): panels dock to the side there, and sit in a bottom sheet below it. */
export function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)')
    const update = () => setDesktop(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return desktop
}

/**
 * Reports how much of the screen the returned ref's element covers, measured from one edge, to the 3D scene.
 * Put the ref on an element that is not itself animated with transforms.
 * `hold` keeps the last value (a bottom sheet pulled up to full height should not shrink the planet to nothing);
 * `active: false` withdraws the report (the element is not rendered at this screen size).
 */
export function useSceneInset<T extends HTMLElement>(key: string, edge: keyof Insets, options: { hold?: boolean; active?: boolean } = {}) {
  const { hold = false, active = true } = options
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!active) return sceneStore.setInset(key, null)
    if (!el || hold) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      const value =
        edge === 'right' ? window.innerWidth - r.left : edge === 'bottom' ? window.innerHeight - r.top : edge === 'left' ? r.right : r.bottom
      sceneStore.setInset(key, { [edge]: Math.max(0, Math.round(value)) })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [key, edge, hold, active])
  // The part is removed only when the panel goes away, not on every re-measure.
  useEffect(() => () => sceneStore.setInset(key, null), [key])
  return ref
}
