import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { Insets, Pair } from './space/SpaceEngine'

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

export function useSceneInset<T extends HTMLElement>(name: string, edge: keyof Insets, options: { hold?: boolean; active?: boolean } = {}) {
  const { hold = false, active = true } = options
  const ref = useRef<T>(null)
  const key = `${name}:${useId()}`
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
  useEffect(() => () => sceneStore.setInset(key, null), [key])
  return ref
}
