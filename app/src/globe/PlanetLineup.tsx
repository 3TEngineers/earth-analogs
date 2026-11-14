import { useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import type { Body } from '../types/data'

/**
 * The small Moon, Earth and Mars on the landing page (Deniz).
 * Clicking the Moon or Mars flies that planet to the center and grows it to roughly the size
 * of the 3D globe, fades the others, then opens /explore/<body>. Earth is decoration here:
 * it has no landing sites of its own; users reach Earth through a site's analogs.
 *
 * Placeholder look: shaded flat colors. NASA textures replace them in D2.
 */

type PlanetId = Body | 'earth'

const PLANETS: { id: PlanetId; label: string; size: number; color: string; shade: string; clickable: boolean }[] = [
  { id: 'moon', label: 'Moon', size: 88, color: '#b9bec6', shade: '#3a3e45', clickable: true },
  { id: 'earth', label: 'Earth', size: 120, color: '#2f7fb0', shade: '#0b2235', clickable: false },
  { id: 'mars', label: 'Mars', size: 104, color: '#d0643a', shade: '#4a1a0c', clickable: true },
]

/** How long the fly-to-center animation runs before the explore page opens. */
export const LAUNCH_MS = 900

export function PlanetLineup() {
  const navigate = useNavigate()
  const refs = useRef<Partial<Record<PlanetId, HTMLButtonElement | null>>>({})
  const [launch, setLaunch] = useState<{ id: Body; style: CSSProperties } | null>(null)

  function open(id: Body) {
    if (launch) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const element = refs.current[id]
    if (!element || reduceMotion) {
      navigate(`/explore/${id}`)
      return
    }
    const rect = element.getBoundingClientRect()
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2)
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2)
    // Close to the on-screen size of the 3D globe at its starting zoom; tuned in D4.
    const scale = (Math.min(window.innerWidth, window.innerHeight) * 0.55) / rect.width
    setLaunch({ id, style: { transform: `translate(${dx}px, ${dy}px) scale(${scale})` } })
    window.setTimeout(() => navigate(`/explore/${id}`), LAUNCH_MS)
  }

  return (
    <div className="flex items-center justify-center gap-10 sm:gap-16">
      {PLANETS.map((p) => {
        const isLaunching = launch?.id === p.id
        const isHidden = launch !== null && !isLaunching
        const sphere: CSSProperties = {
          width: p.size,
          height: p.size,
          background: `radial-gradient(circle at 35% 30%, ${p.color} 0%, ${p.color} 35%, ${p.shade} 100%)`,
          boxShadow: `0 0 ${p.size / 4}px ${p.color}33`,
        }
        const content = (
          <>
            <span className="block rounded-full" style={sphere} />
            <span
              className={`mt-3 block font-mono text-xs tracking-widest uppercase transition-opacity duration-300 ${launch ? 'opacity-0' : 'text-ink-muted'}`}
            >
              {p.label}
            </span>
          </>
        )
        const motion = `transition-all ease-in-out ${isHidden ? 'opacity-0 scale-75' : 'opacity-100'}`

        if (!p.clickable) {
          return (
            <div key={p.id} className={motion} style={{ transitionDuration: `${LAUNCH_MS}ms` }} aria-hidden="true">
              {content}
            </div>
          )
        }
        return (
          <button
            key={p.id}
            ref={(el) => {
              refs.current[p.id] = el
            }}
            type="button"
            onClick={() => open(p.id as Body)}
            aria-label={`Explore ${p.label} landing sites`}
            className={`group rounded-full focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-accent ${motion} ${launch ? '' : 'hover:scale-110'}`}
            style={{ transitionDuration: `${LAUNCH_MS}ms`, ...(isLaunching ? launch.style : {}) }}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
