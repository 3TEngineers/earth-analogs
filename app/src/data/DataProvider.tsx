import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AnalogsFile, SitesFile } from '../types/data'
import { assetUrl } from './assetUrl'

/**
 * Loads the pipeline output (app/public/data/*.json) once and shares it.
 * Components read it with useData(); nobody fetches the JSON directly.
 */

type DataState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sites: SitesFile; analogs: AnalogsFile }

const DataContext = createContext<DataState>({ status: 'loading' })

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(assetUrl(path))
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status})`)
  return (await response.json()) as T
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DataState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchJson<SitesFile>('data/sites.json'), fetchJson<AnalogsFile>('data/analogs.json')])
      .then(([sites, analogs]) => {
        if (!cancelled) setState({ status: 'ready', sites, analogs })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <DataContext.Provider value={state}>{children}</DataContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useData(): DataState {
  return useContext(DataContext)
}
