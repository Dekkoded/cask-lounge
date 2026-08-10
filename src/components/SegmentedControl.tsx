import type { ReactNode } from 'react'
import { haptic } from '../lib/haptics'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
}

/**
 * Segmentierte Umschaltung (iOS-Style): eine gefüllte „Pille" gleitet unter
 * den aktiven Tab, statt dass die Hintergrundfarbe hart springt (Emil/Apple:
 * räumliche Kontinuität). Nur transform wird animiert (GPU), die Textfarbe
 * blendet weich mit.
 *
 * Die Pille ist genau ein Segment breit – calc((100% − p) / n) – und wird per
 * translateX(index · 100 %) verschoben; dadurch passt sie für jede Anzahl an
 * Optionen. `variant='gold'` für Primär-Umschaltungen (goldene Pille), sonst
 * die dezente Stein-Pille.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  variant = 'default',
  className = '',
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  variant?: 'default' | 'gold'
  className?: string
}) {
  const index = Math.max(0, options.findIndex(o => o.value === value))
  const pillBg = variant === 'gold' ? 'bg-amber-500' : 'bg-stone-700'
  const activeText = variant === 'gold' ? 'text-stone-950' : 'text-stone-100'
  const inactiveText = variant === 'gold' ? 'text-stone-300' : 'text-stone-500 hover:text-stone-300'
  const pad = size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'

  return (
    <div className={`relative flex bg-stone-900 rounded-xl p-1 ${className}`}>
      <div
        aria-hidden
        className={`absolute inset-y-1 left-1 rounded-lg ${pillBg} transition-transform duration-300 ease-[var(--ease-out)]`}
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => {
            // Leichter Auswahl-Impuls wie bei nativen Segment-Controls – nur
            // bei echtem Wechsel, nicht beim erneuten Tippen des aktiven Tabs.
            if (o.value !== value) haptic(8)
            onChange(o.value)
          }}
          className={`relative z-10 flex-1 rounded-lg ${pad} font-medium transition-colors ${value === o.value ? activeText : inactiveText}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
