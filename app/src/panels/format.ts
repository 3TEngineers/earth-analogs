/** Display helpers for panel text: units and rules arrive as plain ASCII from the pipeline. */

const SUPERSCRIPTS: [RegExp, string][] = [
  [/s-1\/2/g, 's⁻½'],
  [/m-2/g, 'm⁻²'],
  [/K-1/g, 'K⁻¹'],
  [/km2\b/g, 'km²'],
  [/\bdeg\b/g, '°'],
  [/>=/g, '≥'],
  [/<=/g, '≤'],
]

/** "J m-2 K-1 s-1/2" → "J m⁻² K⁻¹ s⁻½", "34.8 deg" → "34.8 °" (then tightened), ">=" → "≥". */
export function pretty(text: string) {
  let out = text
  for (const [re, to] of SUPERSCRIPTS) out = out.replace(re, to)
  return out.replace(/(\d) °/g, '$1°')
}

/** 0.031, 167.719 → "0.03° N · 167.72° E" */
export function formatLatLon(lat: number, lon: number) {
  const ns = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`
  const ew = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`
  return `${ns} · ${ew}`
}

/**
 * Training areas are named "<ground> — <place>" by the pipeline ("Basalt plains — Sahara").
 * The place alone is the short name for tags and lists; the ground is shown as a caption.
 */
export function placeOf(name: string) {
  return name.split(' — ').at(-1) ?? name
}

export function groundOf(name: string) {
  const parts = name.split(' — ')
  return parts.length > 1 ? parts[0] : ''
}

/** "mars-candidate-a" → "A": the letter our docs use for a candidate. Empty for past landings. */
export function candidateLetter(siteId: string) {
  return /-candidate-([a-z])$/.exec(siteId)?.[1].toUpperCase() ?? ''
}
