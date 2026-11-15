
const SUPERSCRIPTS: [RegExp, string][] = [
  [/s-1\/2/g, 's⁻½'],
  [/m-2/g, 'm⁻²'],
  [/K-1/g, 'K⁻¹'],
  [/km2\b/g, 'km²'],
  [/\bdeg\b/g, '°'],
  [/>=/g, '≥'],
  [/<=/g, '≤'],
]

export function pretty(text: string) {
  let out = text
  for (const [re, to] of SUPERSCRIPTS) out = out.replace(re, to)
  return out.replace(/(\d) °/g, '$1°')
}

export function formatLatLon(lat: number, lon: number) {
  const ns = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`
  const ew = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`
  return `${ns} · ${ew}`
}

export function placeOf(name: string) {
  return name.split(' — ').at(-1) ?? name
}

export function groundOf(name: string) {
  const parts = name.split(' — ')
  return parts.length > 1 ? parts[0] : ''
}

export function candidateLetter(siteId: string) {
  return /-candidate-([a-z])$/.exec(siteId)?.[1].toUpperCase() ?? ''
}
