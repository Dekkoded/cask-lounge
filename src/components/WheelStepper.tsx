import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import FlavorWheel from './FlavorWheel'

interface Wheels {
  nose: number[]
  taste: number[]
}

interface Props {
  wheels: Wheels
  onUpdate: (type: 'nose' | 'taste') => (i: number, v: number) => void
}

const STEPS: { key: 'nose' | 'taste'; labelKey: string; color: string }[] = [
  { key: 'nose',  labelKey: 'whisky.wheel.nose',  color: '#f59e0b' },
  { key: 'taste', labelKey: 'whisky.wheel.taste', color: '#60a5fa' },
]

export default function WheelStepper({ wheels, onUpdate }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  return (
    <div className="flex flex-col gap-3">
      {/* Schritt-Indikator */}
      <div className="flex gap-2 justify-center">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStep(i)}
            className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              i === step ? 'w-8 bg-amber-500' : 'w-4 bg-stone-700'
            }`}
          />
        ))}
      </div>

      {/* Aktives Rad */}
      <FlavorWheel
        key={current.key}
        values={wheels[current.key]}
        onChange={onUpdate(current.key)}
        color={current.color}
        label={t(current.labelKey)}
      />

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-sm disabled:opacity-30"
        >
          ← {t('common.back')}
        </button>
        <span className="text-stone-500 text-sm">{step + 1} / {STEPS.length}</span>
        <button
          type="button"
          onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
          className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-sm disabled:opacity-30"
        >
          {t('common.next')} →
        </button>
      </div>
    </div>
  )
}
