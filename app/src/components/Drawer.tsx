import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

export function Drawer({ open, onClose, eyebrow, title, children }: { open: boolean; onClose: () => void; eyebrow: string; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const root = document.documentElement
    const previous = { overflow: root.style.overflow, gutter: root.style.scrollbarGutter }
    root.style.scrollbarGutter = 'stable'
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous.overflow
      root.style.scrollbarGutter = previous.gutter
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <p className="eyebrow text-ink-muted">{eyebrow}</p>
            <h2 id={titleId} className="headline mt-2 text-2xl">
              {title}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close details" className="press flex size-9 shrink-0 items-center justify-center rounded-full border border-line hover:border-white/40">
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-6 text-[0.95rem] leading-relaxed text-ink/85">{children}</div>
      </div>
    </dialog>
  )
}
