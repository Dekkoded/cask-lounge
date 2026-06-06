import { useTranslation } from 'react-i18next'

// Whisky-Farbpalette nach SRM/EBC-Standard, von hellgold bis dunkelbraun
const COLORS = [
  { key: 'lightGold',  hex: '#f5e6a3' },
  { key: 'gold',       hex: '#e8c84a' },
  { key: 'darkGold',   hex: '#d4a017' },
  { key: 'amber',      hex: '#c47a1e' },
  { key: 'lightAmber', hex: '#b85c00' },
  { key: 'copper',     hex: '#a0522d' },
  { key: 'lightBrown', hex: '#8b3a1a' },
  { key: 'brown',      hex: '#6b2d0f' },
  { key: 'darkBrown',  hex: '#4a1a08' },
  { key: 'mahogany',   hex: '#2d0f04' },
]

interface Props {
  value: number | null
  onChange: (idx: number) => void
}

export default function ColorPicker({ value, onChange }: Props) {
  const { t } = useTranslation()
  return (
    <div>
      <p className="text-sm text-stone-300 mb-2">{t('whisky.colorHeading')}</p>
      <div className="flex gap-2 flex-wrap">
        {COLORS.map((c, i) => (
          <button
            key={i}
            type="button"
            title={t(`whisky.colors.${c.key}`)}
            onClick={() => onChange(i)}
            className={`w-8 h-8 rounded-full border-2 transition-transform ${
              value === i ? 'border-white scale-110' : 'border-transparent'
            }`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
      {value !== null && (
        <p className="text-xs text-stone-500 mt-1">{COLORS[value] ? t(`whisky.colors.${COLORS[value].key}`) : ''}</p>
      )}
    </div>
  )
}
