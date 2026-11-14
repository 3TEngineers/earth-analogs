/** Resolves a path from the data files (e.g. "images/sites/x.png") against the app's base URL. */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
