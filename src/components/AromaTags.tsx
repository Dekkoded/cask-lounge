import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AROMA_GROUPS, isKnownAroma } from '../lib/aromas'

interface Props {
  aromas: string[]      // ausgewählte kuratierte Schlüssel
  extra: string[]       // freie Aromen
  onToggle: (key: string) => void
  onAddExtra: (label: string) => void
  onRemoveExtra: (label: string) => void
}

export default function AromaTags({ aromas, extra, onToggle, onAddExtra, onRemoveExtra }: Props) {
  const { t } = useTranslation()
  const [input, setInput] = useState('')

  const selected = new Set(aromas)

  const submitExtra = () => {
    const label = input.trim()
    if (!label) return
    // Duplikate (auch gegen kuratierte Labels) vermeiden.
    const exists =
      extra.some(e => e.toLowerCase() === label.toLowerCase()) ||
      isKnownAroma(label.toLowerCase())
    if (!exists) onAddExtra(label)
    setInput('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-stone-300">{t('whisky.aromas.heading')}</p>
        <p className="text-xs text-stone-600 mt-0.5">{t('whisky.aromas.hint')}</p>
      </div>

      {AROMA_GROUPS.map(group => (
        <div key={group.category}>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
            {t(`whisky.flavors.${group.category}`)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.aromas.map(key => {
              const on = selected.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onToggle(key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    on
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                      : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                  }`}
                >
                  {t(`whisky.aromaList.${key}`)}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Eigene Aromen */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 mb-1.5">
          {t('whisky.aromas.ownHeading')}
        </p>
        {extra.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {extra.map(label => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 border border-amber-500/60 text-amber-300"
              >
                {label}
                <button
                  type="button"
                  onClick={() => onRemoveExtra(label)}
                  aria-label={t('common.delete')}
                  className="text-amber-300/70 hover:text-amber-200 leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitExtra() } }}
            placeholder={t('whisky.aromas.ownPlaceholder')}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={submitExtra}
            disabled={!input.trim()}
            className="px-3 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 disabled:opacity-40 text-stone-200 text-sm"
          >
            {t('whisky.aromas.add')}
          </button>
        </div>
      </div>
    </div>
  )
}
