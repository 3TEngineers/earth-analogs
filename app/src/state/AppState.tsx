import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Body } from '../types/data'

/**
 * Shared UI state between the globe (Deniz, src/globe/) and the panels (Kmar, src/panels/).
 * Both sides read the same state and change it only through the actions below,
 * so a click in the site list and a click on the globe do exactly the same thing.
 *
 * Flow:  browse ──selectSite──▶ site ──showAnalogs──▶ earth
 *          ▲                     │  ◀──backToSite─────┘
 *          └────────reset────────┘
 */

/** What the user is looking at. */
export type Phase =
  | 'browse' // rotating Moon or Mars, no site selected
  | 'site' // a landing site is selected, globe zoomed to it
  | 'earth' // Earth globe with the selected site's analogs

/** The body currently drawn on the globe. */
export type DisplayBody = Body | 'earth'

export interface AppState {
  phase: Phase
  /** Moon or Mars tab chosen by the user (kept while on Earth, for "back"). */
  body: Body
  siteId: string | null
  analogId: string | null
}

type Action =
  | { type: 'setBody'; body: Body }
  | { type: 'selectSite'; siteId: string; body: Body }
  | { type: 'showAnalogs'; analogId: string | null }
  | { type: 'selectAnalog'; analogId: string }
  | { type: 'backToSite' }
  | { type: 'reset' }

const initialState: AppState = { phase: 'browse', body: 'moon', siteId: null, analogId: null }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'setBody':
      return { ...initialState, body: action.body }
    case 'selectSite':
      return { phase: 'site', body: action.body, siteId: action.siteId, analogId: null }
    case 'showAnalogs':
      return state.siteId ? { ...state, phase: 'earth', analogId: action.analogId } : state
    case 'selectAnalog':
      return state.phase === 'earth' ? { ...state, analogId: action.analogId } : state
    case 'backToSite':
      return state.siteId ? { ...state, phase: 'site', analogId: null } : state
    case 'reset':
      return { ...initialState, body: state.body }
  }
}

export interface AppActions {
  /** Switch the Moon | Mars tab. Clears any selection. */
  setBody: (body: Body) => void
  /** Select a landing site; the globe flies to it. */
  selectSite: (siteId: string, body: Body) => void
  /** Go to the Earth globe for the selected site. Pass the rank-1 analog id to focus it. */
  showAnalogs: (analogId: string | null) => void
  /** Focus another analog while on Earth. */
  selectAnalog: (analogId: string) => void
  /** Return from Earth to the selected landing site. */
  backToSite: () => void
  /** Clear the selection and go back to the rotating body. */
  reset: () => void
}

interface AppStateValue extends AppState, AppActions {
  displayBody: DisplayBody
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const displayBody: DisplayBody = state.phase === 'earth' ? 'earth' : state.body

  // Drives the accent color tokens in index.css.
  useEffect(() => {
    document.documentElement.dataset.body = displayBody
  }, [displayBody])

  const value = useMemo<AppStateValue>(
    () => ({
      ...state,
      displayBody,
      setBody: (body) => dispatch({ type: 'setBody', body }),
      selectSite: (siteId, body) => dispatch({ type: 'selectSite', siteId, body }),
      showAnalogs: (analogId) => dispatch({ type: 'showAnalogs', analogId }),
      selectAnalog: (analogId) => dispatch({ type: 'selectAnalog', analogId }),
      backToSite: () => dispatch({ type: 'backToSite' }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [state, displayBody],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>')
  return value
}
