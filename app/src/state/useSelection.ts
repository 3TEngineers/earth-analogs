import { useMemo } from 'react'
import { useData } from '../data/DataProvider'
import type { Analog, Dimension, Site } from '../types/data'
import { useAppState } from './AppState'

export interface Selection {
  /** All sites of the body chosen in the Moon | Mars tab. */
  sitesForBody: Site[]
  site: Site | null
  /** The selected site's analogs, sorted by rank (1..3). */
  analogs: Analog[]
  analog: Analog | null
  /** Dimensions that apply to the selected site's body. */
  dimensions: Dimension[]
}

const empty: Selection = { sitesForBody: [], site: null, analogs: [], analog: null, dimensions: [] }

/** Resolves the ids in the shared state to full objects from the data files. */
export function useSelection(): Selection {
  const data = useData()
  const { body, siteId, analogId } = useAppState()

  return useMemo(() => {
    if (data.status !== 'ready') return empty
    const sitesForBody = data.sites.sites.filter((s) => s.body === body)
    const site = data.sites.sites.find((s) => s.id === siteId) ?? null
    const analogs = site
      ? data.analogs.analogs.filter((a) => a.siteId === site.id).sort((a, b) => a.rank - b.rank)
      : []
    const analog = analogs.find((a) => a.id === analogId) ?? null
    const dimensions = site ? data.analogs.dimensions.filter((d) => d.bodies.includes(site.body)) : []
    return { sitesForBody, site, analogs, analog, dimensions }
  }, [data, body, siteId, analogId])
}
