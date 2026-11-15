import { useNavigate } from 'react-router'
import { useAppState } from '../state/AppState'
import type { Body } from '../types/data'

const bodies: { id: Body; label: string }[] = [
  { id: 'mars', label: 'Mars' },
  { id: 'moon', label: 'Moon' },
]

export function BodyToggle() {
  const { body } = useAppState()
  const navigate = useNavigate()

  return (
    <div role="tablist" aria-label="World" className="flex rounded-full border border-line p-0.5">
      {bodies.map((b) => {
        const active = body === b.id
        return (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => navigate(`/explore/${b.id}`)}
            className={`accent-transition rounded-full px-3.5 py-1 font-display text-sm font-medium ${active ? 'bg-accent text-space' : 'text-ink-muted hover:text-ink'}`}
          >
            {b.label}
          </button>
        )
      })}
    </div>
  )
}
