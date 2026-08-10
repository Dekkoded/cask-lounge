import type { ReactNode } from 'react'

/**
 * Leerer Zustand mit Charakter statt kahlem Grau-Text: ein großes Emoji-
 * Symbol, eine klare Überschrift, ein optionaler Hinweis und ein optionaler
 * Call-to-Action. So fühlen sich leere Listen bewusst gestaltet an (high-end
 * Apps führen hier hin, statt nur „nichts da" zu melden). Blendet ruhig ein
 * (nur opacity/transform, reduced-motion-sicher über die globale Regel).
 */
export default function EmptyState({
  icon,
  title,
  hint,
  action,
  className = '',
}: {
  icon?: ReactNode
  title: ReactNode
  hint?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`empty-state flex flex-col items-center text-center px-6 py-12 ${className}`}>
      {icon != null && (
        <div className="text-5xl mb-4 opacity-90 select-none" aria-hidden>
          {icon}
        </div>
      )}
      <p className="text-stone-300 font-medium">{title}</p>
      {hint != null && <p className="text-stone-500 text-sm mt-1.5 max-w-[16rem]">{hint}</p>}
      {action != null && <div className="mt-5">{action}</div>}
    </div>
  )
}
