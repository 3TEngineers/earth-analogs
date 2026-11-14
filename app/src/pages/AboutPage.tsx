import { SiteHeader } from '../components/SiteHeader'

/**
 * About page ("/about"). Owner: Kmar.
 * TODO(Kmar): team and roles, method in short, NASA data used, references, AI usage statement.
 */
export function AboutPage() {
  return (
    <main className="relative h-full overflow-y-auto px-4 pt-20 pb-12">
      <SiteHeader />
      <article className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">About the project</h1>
        <p className="text-ink-muted">Placeholder — content coming from Kmar (team, method, data, AI usage).</p>
      </article>
    </main>
  )
}
