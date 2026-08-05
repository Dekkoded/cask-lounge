import { useEffect, useRef, useState } from 'react'
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
  // Richtung des letzten Wechsels steuert die Gleit-Animation (1 = vor, -1 = zurück).
  const [dir, setDir] = useState<1 | -1>(1)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    if (!localStorage.getItem(SEEN_KEY)) setOpen(true)
    const reopen = () => { setDir(1); setStep(0); setOpen(true) }
    window.addEventListener('open-intro', reopen)
    return () => window.removeEventListener('open-intro', reopen)
  }, [])

  const finish = () => {
    localStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  const isLast = step === STEPS.length - 1
  const goNext = () => { if (isLast) finish(); else { setDir(1); setStep(s => s + 1) } }
  const goPrev = () => { if (step > 0) { setDir(-1); setStep(s => s - 1) } }
  const goTo = (i: number) => { if (i !== step) { setDir(i > step ? 1 : -1); setStep(i) } }

  // Tastatur: ← → blättern, Enter weiter, Esc überspringen.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
      else if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, isLast])

  if (!open) return null

  const s = STEPS[step]

  // Wischen auf dem Sheet blättert (mobiles Extra).
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (Math.abs(dx) > 45) { if (dx < 0) goNext(); else goPrev() }
    touchX.current = null
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop – Tap schließt (= überspringen). */}
      <button
        aria-label={t('intro.skip')}
        onClick={finish}
        className="anim-overlay absolute inset-0 bg-black/70 backdrop-blur-md"
      />

      <div
        role="dialog"
        aria-modal="true"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="anim-panel relative w-full max-w-sm overflow-hidden rounded-3xl border border-stone-700/70 bg-stone-900 px-7 pt-8 pb-6 text-center shadow-2xl"
      >
        {/* Goldene Haarlinie oben – edler Materialabschluss. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        {/* Medaillon mit kreisendem Gold-Schimmer. */}
        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
          <div className="intro-aurora absolute inset-[-6px] rounded-full" />
          <div
            key={`m-${step}`}
            className="intro-medallion relative flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/25 bg-gradient-to-b from-stone-800 to-stone-950 text-4xl shadow-inner"
          >
            <span aria-hidden>{s.icon}</span>
          </div>
        </div>

        {/* Schritt-Inhalt – gleitet richtungsabhängig herein. */}
        <div key={`s-${step}`} data-dir={dir} className="intro-step">
          <h2 className="font-display text-2xl font-semibold text-stone-100 mb-2 tracking-tight">{s.title}</h2>
          <p className="text-stone-400 text-sm leading-relaxed mb-7 mx-auto max-w-[19rem]">{s.body}</p>
        </div>

        {/* Fortschritt – antippbar, aktive Kapsel wächst in die Breite. */}
        <div className="flex justify-center items-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`${i + 1} / ${STEPS.length}`}
              aria-current={i === step}
              className="py-1.5"
            >
              <span className={`intro-dot-bar block h-1.5 rounded-full ${i === step ? 'w-7 bg-amber-400' : 'w-1.5 bg-stone-700 hover:bg-stone-600'}`} />
            </button>
          ))}
        </div>

        {/* Aktionen. */}
        <div className="flex items-center gap-2">
          {!isLast && (
            <button onClick={finish} className="flex-1 text-stone-500 hover:text-stone-300 text-sm py-3">
              {t('intro.skip')}
            </button>
          )}
          <button
            onClick={goNext}
            className="intro-cta group flex-[1.5] inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-xl px-4 py-3"
          >
            <span>{isLast ? t('intro.start') : t('intro.next')}</span>
            <svg className="intro-arrow h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
