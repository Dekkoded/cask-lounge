import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** 'sheet' gleitet von unten herein (mobil-first), 'center' skaliert zentriert ein. */
  variant?: 'sheet' | 'center'
  /** Zugänglicher Name des Dialogs für Screenreader. */
  ariaLabel?: string
  /** Zusätzliche Klassen fürs Panel (Breite, Padding, Gap, Rahmen …). */
  className?: string
  /** Hintergrund weichzeichnen (für zentrierte/festliche Dialoge). */
  blur?: boolean
  /** Schließen per Backdrop-Klick / Escape erlauben (Default: ja). */
  dismissible?: boolean
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Gemeinsames Dialog-Primitive für die ganze App.
 *
 * Warum zentral: einheitliche Barrierefreiheit (role/aria-modal, Fokus-Falle,
 * Escape, Body-Scroll-Lock) und – wichtig – ein Portal an <body>. Dadurch
 * hängt der Dialog NIE in einem transformierten Vorfahren fest (z.B. der
 * .page-enter-Animation) und landet immer korrekt am Viewport.
 */
export default function Modal({
  open,
  onClose,
  children,
  variant = 'sheet',
  ariaLabel,
  className = '',
  blur = false,
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null

    // Body-Scroll sperren, solange der Dialog offen ist.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Fokus in den Dialog holen (erstes fokussierbares Element, sonst Panel).
    const panel = panelRef.current
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? panel)?.focus()

    // Escape schließt; Tab bleibt im Dialog gefangen (Fokus-Falle).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (items.length === 0) {
        e.preventDefault()
        panel.focus()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const active = document.activeElement
      if (active instanceof Node && !panel.contains(active)) {
        e.preventDefault()
        firstEl.focus()
      } else if (e.shiftKey && active === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      // Fokus dorthin zurückgeben, wo er beim Öffnen war.
      previouslyFocused?.focus?.()
    }
  }, [open, onClose, dismissible])

  if (!open) return null

  const isSheet = variant === 'sheet'
  return createPortal(
    <div
      onClick={dismissible ? onClose : undefined}
      className={`fixed inset-0 z-[100] flex justify-center p-4 bg-black/70 anim-overlay ${
        blur ? 'backdrop-blur-sm' : ''
      } ${isSheet ? 'items-end' : 'items-center'}`}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={`bg-stone-900 rounded-2xl flex flex-col focus:outline-none ${
          isSheet ? 'anim-sheet mb-[env(safe-area-inset-bottom)]' : 'anim-panel'
        } ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
