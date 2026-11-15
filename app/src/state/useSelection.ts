import { useMemo } from 'react'
import { useData } from '../data/DataProvider'
import type { Analog, Dimension, Site } from '../types/data'
import { useAppState } from './AppState'

export interface Selection {
  sitesForBody: Site[]
  site: Site | null
  analogs: Analog[]
  analog: Analog | null
  dimensions: Dimension[]
}

const empty: Selection = { sitesForBody: [], site: null, analogs: [], analog: null, dimensions: [] }

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
