import { useEffect, useRef, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Zählt eine Zahl beim Erscheinen kurz auf den Zielwert hoch (Data-App-
 * Gefühl, z.B. die große Wertung im Whisky-Header). Nur ein rAF-Loop mit
 * easeOutCubic – kein Layout-Thrash. Bei „Bewegung reduzieren" erscheint
 * sofort der Endwert. Ändert sich der Zielwert, wird vom aktuellen Stand
 * weitergezählt (kein Sprung auf 0).
 *
 * `decimals` fixiert die Nachkommastellen, damit die Breite nicht springt
 * (zusammen mit tabular-nums am umgebenden Element).
 */
export default function CountUp({ value, decimals = 0, duration = 650 }: { value: number; decimals?: number; duration?: number }) {
  const displayRef = useRef(prefersReducedMotion() ? value : 0)
  const [display, setDisplay] = useState(displayRef.current)
  const rafRef = useRef(0)

  useEffect(() => {
    if (prefersReducedMotion()) {
      displayRef.current = value
      setDisplay(value)
      return
    }
    const from = displayRef.current
    const start = performance.now()
    const ease = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const current = from + (value - from) * ease(t)
      displayRef.current = current
      setDisplay(current)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <>{display.toFixed(decimals)}</>
}
