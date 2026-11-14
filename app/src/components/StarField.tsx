import { useMemo } from 'react'

/** Faint, static star background shared by all pages. Deterministic so it never jumps between renders. */
export function StarField({ count = 220 }: { count?: number }) {
  const stars = useMemo(() => {
    let seed = 42
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    return Array.from({ length: count }, () => ({
      x: random() * 100,
      y: random() * 100,
      size: random() < 0.9 ? 1 : 2,
      opacity: 0.2 + random() * 0.5,
    }))
  }, [count])

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.size / 2} fill="#ffffff" opacity={s.opacity} />
      ))}
    </svg>
  )
}
