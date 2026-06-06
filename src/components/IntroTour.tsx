import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const SEEN_KEY = 'cl_intro_seen'

export function openIntro() {
  window.dispatchEvent(new Event('open-intro'))
}

interface IntroStep { icon: string; title: string; body: string }

export default function IntroTour() {
  const { t } = useTranslation()
  const STEPS = t('intro.steps', { returnObjects: true }) as IntroStep[]
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setOpen(true)
    const reopen = () => { setStep(0); setOpen(true) }
    window.addEventListener('open-intro', reopen)
    return () => window.removeEventListener('open-intro', reopen)
  }, [])

  if (!open) return null

  const finish = () => {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  const isLast = step === STEPS.length - 1
  const s = STEPS[step]

  return (
    <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-2xl p-6 text-center">
        <div className="text-5xl mb-4">{s.icon}</div>
        <h2 className="text-xl font-bold text-stone-100 mb-2">{s.title}</h2>
        <p className="text-stone-400 text-sm mb-6">{s.body}</p>

        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-amber-500' : 'w-1.5 bg-stone-700'}`} />
          ))}
        </div>

        <div className="flex gap-2">
          {!isLast && (
            <button onClick={finish} className="flex-1 text-stone-400 hover:text-stone-200 text-sm py-2.5 transition-colors">
              {t('intro.skip')}
            </button>
          )}
          <button
            onClick={() => (isLast ? finish() : setStep(step + 1))}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl px-4 py-2.5 transition-colors"
          >
            {isLast ? t('intro.start') : t('intro.next')}
          </button>
        </div>
      </div>
    </div>
  )
}
