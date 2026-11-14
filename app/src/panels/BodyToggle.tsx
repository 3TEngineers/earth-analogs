import { useNavigate } from 'react-router'
import { useAppState } from '../state/AppState'
import type { Body } from '../types/data'

const bodies: { id: Body; label: string }[] = [
  { id: 'moon', label: 'Moon' },
  { id: 'mars', label: 'Mars' },
]

/** Moon | Mars tab. The body lives in the URL (/explore/<body>); switching navigates, which also clears the selection. */
export function BodyToggle() {
  const { body } = useAppState()
  const navigate = useNavigate()

  return (
    <div role="tablist" aria-label="Body" className="flex rounded-lg border border-line p-1">
      {bodies.map((b) => {
        const active = body === b.id
        return (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => navigate(`/explore/${b.id}`)}
            className={`accent-transition flex-1 rounded-md px-3 py-1.5 font-display text-sm focus-visible:outline-2 focus-visible:outline-accent ${
              active ? 'bg-accent text-space' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {b.label}
          </button>
        )
      })}
    </div>
  )
}
