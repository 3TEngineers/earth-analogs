import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import type { Body } from '../types/data'

export type Phase =
  | 'browse'
  | 'site'
  | 'earth'

export type DisplayBody = Body | 'earth'

export interface AppState {
  phase: Phase
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
  setBody: (body: Body) => void
  selectSite: (siteId: string, body: Body) => void
  showAnalogs: (analogId: string | null) => void
  selectAnalog: (analogId: string) => void
  backToSite: () => void
  reset: () => void
}

interface AppStateValue extends AppState, AppActions {
  displayBody: DisplayBody
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const displayBody: DisplayBody = state.phase === 'earth' ? 'earth' : state.body

  useEffect(() => {
    document.documentElement.dataset.body = displayBody
  }, [displayBody])

  const actions = useMemo<AppActions>(
    () => ({
      setBody: (body) => dispatch({ type: 'setBody', body }),
      selectSite: (siteId, body) => dispatch({ type: 'selectSite', siteId, body }),
      showAnalogs: (analogId) => dispatch({ type: 'showAnalogs', analogId }),
      selectAnalog: (analogId) => dispatch({ type: 'selectAnalog', analogId }),
      backToSite: () => dispatch({ type: 'backToSite' }),
      reset: () => dispatch({ type: 'reset' }),
    }),
    [],
  )

  const value = useMemo<AppStateValue>(() => ({ ...state, displayBody, ...actions }), [state, displayBody, actions])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAppState(): AppStateValue {
  const value = useContext(AppStateContext)
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>')
  return value
}
