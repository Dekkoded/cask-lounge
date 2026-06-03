// Whisky-Farbpalette nach SRM/EBC-Standard, von hellgold bis dunkelbraun
const COLORS = [
  { label: 'Hellgold',     hex: '#f5e6a3' },
  { label: 'Gold',         hex: '#e8c84a' },
  { label: 'Dunkelgold',   hex: '#d4a017' },
  { label: 'Bernstein',    hex: '#c47a1e' },
  { label: 'Hellbernstein',hex: '#b85c00' },
  { label: 'Kupfer',       hex: '#a0522d' },
  { label: 'Hellbraun',    hex: '#8b3a1a' },
  { label: 'Braun',        hex: '#6b2d0f' },
  { label: 'Dunkelbraun',  hex: '#4a1a08' },
  { label: 'Mahagoni',     hex: '#2d0f04' },
]

interface Props {
  value: number | null
  onChange: (idx: number) => void
}

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-sm text-stone-300 mb-2">Farbe</p>
      <div className="flex gap-2 flex-wrap">
        {COLORS.map((c, i) => (
          <button
            key={i}
            type="button"
            title={c.label}
            onClick={() => onChange(i)}
            className={`w-8 h-8 rounded-full border-2 transition-transform ${
              value === i ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
      {value !== null && (
        <p className="text-xs text-stone-500 mt-1">{COLORS[value]?.label}</p>
      )}
    </div>
  )
}
