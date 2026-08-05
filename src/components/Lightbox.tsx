import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

interface Props {
  src: string | null
  alt?: string
  onClose: () => void
}

// Vollbild-Bildanzeige: öffnet sich über ein angeklicktes Foto.
// Schließt per Klick auf den Hintergrund, X-Button oder Escape-Taste.
export default function Lightbox({ src, alt, onClose }: Props) {
  const { t } = useTranslation()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!src) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Hintergrund-Scrollen verhindern, solange das Bild offen ist.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Fokus in den Dialog holen (Schließen-Button) und beim Zumachen zurückgeben.
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
      previouslyFocused?.focus?.()
    }
  }, [src, onClose])

  if (!src) return null

  return createPortal(
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || t('common.close')}
      className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_120ms_ease-out]"
    >
      <button
        ref={closeRef}
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl leading-none flex items-center justify-center transition-colors"
      >
        ×
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        onClick={e => e.stopPropagation()}
        className="anim-panel max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
      />
    </div>,
    document.body,
  )
}
