import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import type { OrbitalImage } from './orbitalImage'

/**
 * The close-up under a site or training area: the image arrives with a slow push-in (like the camera flying closer),
 * a crosshair marks the exact spot, a scale bar shows 10 km, and the credit sits underneath.
 * If the map server can't be reached the box says so instead of showing a broken image.
 */
export function OrbitalView({ image, alt }: { image: OrbitalImage | null; alt: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  if (!image) return null

  const tenKmShare = (10 / image.widthKm) * 100

  return (
    <figure>
      <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-white/[0.03]">
        {state !== 'failed' && (
          <img
            src={image.src}
            alt={alt}
            onLoad={() => setState('ready')}
            onError={() => setState('failed')}
            className={`size-full object-cover transition-[opacity,transform] duration-[1600ms] ease-[var(--ease-out)] motion-reduce:transition-none ${
              state === 'ready' ? 'scale-100 opacity-100' : 'scale-110 opacity-0'
            }`}
          />
        )}

        {state === 'loading' && (
          <p className="absolute inset-0 flex items-center justify-center font-mono text-xs text-ink-muted">
            Loading the view from orbit…
          </p>
        )}
        {state === 'failed' && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-ink-muted">
            <ImageOff className="size-4" aria-hidden="true" /> The view from orbit is unavailable right now
          </p>
        )}

        {state === 'ready' && (
          <>
            {/* Crosshair on the exact spot. */}
            <span className="pointer-events-none absolute top-1/2 left-1/2 size-10 -translate-1/2 rounded-full border border-white/80 shadow-[0_0_0_1px_rgb(0_0_0/0.4)]" aria-hidden="true" />
            <span className="pointer-events-none absolute top-1/2 left-1/2 h-px w-16 -translate-1/2 bg-white/50" aria-hidden="true" />
            <span className="pointer-events-none absolute top-1/2 left-1/2 h-16 w-px -translate-1/2 bg-white/50" aria-hidden="true" />
            {/* 10 km scale bar (its width is a share of the image width). */}
            <span className="absolute bottom-5 left-3 font-mono text-[10px] text-white [text-shadow:0_1px_4px_#000]">10 km</span>
            <span
              className="absolute bottom-3 left-3 h-1.5 border-x border-b border-white shadow-[0_1px_3px_rgb(0_0_0/0.6)]"
              style={{ width: `${tenKmShare}%` }}
              aria-hidden="true"
            />
          </>
        )}
      </div>
      {image.credit && <figcaption className="mt-2 text-[11px] leading-snug text-ink-muted">{image.credit}</figcaption>}
    </figure>
  )
}
