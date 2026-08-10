import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const LABEL_KEYS = [
  'fruity', 'floral', 'spicy', 'grainy', 'peaty', 'sulphury',
  'yeasty', 'nutty', 'woody', 'winey', 'chocolate', 'smoky',
]

// Großzügige ViewBox damit lange Labels (Getreidig, Schwefelig) nicht abgeschnitten werden
const VW = 380
const VH = 320
const CX = 175
const CY = 155
const R = 105
const LABEL_R = R + 24
const RINGS = [1, 2, 3, 4, 5]

function axisAngle(i: number) {
  return -Math.PI / 2 + i * (2 * Math.PI / 12)
}

function point(i: number, v: number) {
  const ang = axisAngle(i)
  return {
    x: CX + (v / 5) * R * Math.cos(ang),
    y: CY + (v / 5) * R * Math.sin(ang),
  }
}

function labelPos(i: number) {
  const ang = axisAngle(i)
  const cos = Math.cos(ang)
  return {
    x: CX + LABEL_R * cos,
    y: CY + LABEL_R * Math.sin(ang),
    anchor: (cos > 0.15 ? 'start' : cos < -0.15 ? 'end' : 'middle') as 'start' | 'end' | 'middle',
  }
}

interface Props {
  values: number[]
  onChange?: (i: number, v: number) => void
  color?: string
  label: string
}

export default function FlavorWheel({ values, onChange, color = '#f59e0b', label }: Props) {
  const { t } = useTranslation()
  const LABELS = LABEL_KEYS.map(k => t(`whisky.flavors.${k}`))
  const vals = values.length === 12 ? values : Array(12).fill(0)

  const polygon = vals.map((v, i) => {
    const { x, y } = point(i, Math.max(v, 0.12))
    return `${x},${y}`
  }).join(' ')

  // onChange in einer Ref halten, damit der native Listener immer die aktuelle
  // Callback-Version nutzt, ohne bei jedem Render neu registriert zu werden.
  const svgRef = useRef<SVGSVGElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // TEMPORÄRE Diagnose: zeigt direkt auf dem Gerät, welches Event feuert.
  const [dbg, setDbg] = useState('bereit')

  // Wir setzen NICHT auf ein einziges Event-Modell, sondern fangen touchstart,
  // pointerdown UND mousedown NATIV am <svg> ab (non-passive). Ein Zeit-Guard
  // entprellt die Mehrfach-Events einer einzigen Berührung, sodass garantiert
  // genau ein Pfad greift – egal ob iOS Safari, Android-Chrome oder Desktop.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !onChange) return

    let lastApply = 0

    const apply = (clientX: number, clientY: number, src: string) => {
      const cb = onChangeRef.current
      if (!cb) return
      const now = Date.now()
      // Entprellen: eine Berührung löst oft touch+pointer+mouse+click aus.
      if (now - lastApply < 500) { setDbg(`${src} (entprellt)`); return }
      lastApply = now

      const rect = svg.getBoundingClientRect()
      // Koordinaten in ViewBox-Raum umrechnen
      const mx = (clientX - rect.left) / rect.width * VW - CX
      const my = (clientY - rect.top) / rect.height * VH - CY
      const dist = Math.sqrt(mx * mx + my * my)
      if (dist < 6) { setDbg(`${src}: Zentrum`); return } // zu nah am Zentrum

      // Nächste Achse finden — mit korrektem Winkel-Wrap
      const clickAng = Math.atan2(my, mx)
      let best = 0
      let bestDiff = Infinity
      for (let i = 0; i < 12; i++) {
        const a = axisAngle(i)
        // Normalisiere beide Winkel auf [-π, π]
        let diff = ((clickAng - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
        diff = Math.abs(diff)
        if (diff < bestDiff) { bestDiff = diff; best = i }
      }
      const v = Math.min(5, Math.max(0, Math.round((dist / R) * 5)))
      cb(best, v)
      setDbg(`${src} → Achse ${best} = ${v}`)
    }

    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0] ?? e.changedTouches[0]
      if (!t) { setDbg('touchstart: keine Koordinate'); return }
      e.preventDefault() // verhindert den nachfolgenden Geister-Klick/Scroll
      apply(t.clientX, t.clientY, 'touch')
    }
    const onPointer = (e: PointerEvent) => apply(e.clientX, e.clientY, `pointer:${e.pointerType}`)
    const onMouse = (e: MouseEvent) => apply(e.clientX, e.clientY, 'mouse')

    svg.addEventListener('touchstart', onTouch, { passive: false })
    svg.addEventListener('pointerdown', onPointer)
    svg.addEventListener('mousedown', onMouse)
    return () => {
      svg.removeEventListener('touchstart', onTouch)
      svg.removeEventListener('pointerdown', onPointer)
      svg.removeEventListener('mousedown', onMouse)
    }
    // Nur an-/abmelden wenn sich der editierbare Zustand ändert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!onChange])

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <p className="text-sm font-medium text-stone-300">{label}</p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className={`w-full ${onChange ? 'cursor-crosshair touch-none select-none' : ''}`}
      >
        {/* Transparente Hintergrundfläche: macht auch die Lücken zwischen den
            Formen tippbar, damit wirklich jeder Punkt im Rad ein Treffer ist. */}
        {onChange && (
          <rect x="0" y="0" width={VW} height={VH} fill="transparent" />
        )}

        {/* Ringe */}
        {RINGS.map(r => (
          <circle key={r} cx={CX} cy={CY} r={(r / 5) * R}
            fill="none" stroke="#44403c" strokeWidth="1" />
        ))}

        {/* Achsen */}
        {Array.from({ length: 12 }, (_, i) => {
          const { x, y } = point(i, 5)
          return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#44403c" strokeWidth="1" />
        })}

        {/* Fläche */}
        <polygon points={polygon} fill={color} fillOpacity="0.25"
          stroke={color} strokeWidth="2" strokeLinejoin="round" />

        {/* Punkte */}
        {vals.map((v, i) => {
          const { x, y } = point(i, Math.max(v, 0.12))
          return (
            <circle key={i} cx={x} cy={y} r={v > 0 ? 5 : 3}
              fill={v > 0 ? color : '#78716c'} stroke="#1c1917" strokeWidth="1.5" />
          )
        })}

        {/* Labels */}
        {LABELS.map((lbl, i) => {
          const { x, y, anchor } = labelPos(i)
          return (
            <text key={i} x={x} y={y} textAnchor={anchor}
              dominantBaseline="middle" fontSize="12" fill="#d6d3d1">
              {lbl}
            </text>
          )
        })}

        {/* Werte an den Punkten (nur wenn > 0) */}
        {vals.map((v, i) => {
          if (v === 0) return null
          const { x, y } = point(i, v)
          return (
            <text key={i} x={x} y={y - 9} textAnchor="middle"
              fontSize="9" fill={color} fontWeight="bold">
              {v}
            </text>
          )
        })}
      </svg>

      {/* Tipp-Text wenn editierbar */}
      {onChange && (
        <p className="text-xs text-stone-600">{t('whisky.flavorWheelTip')}</p>
      )}

      {/* TEMPORÄRE Diagnose-Anzeige – zeigt auf dem Gerät, was beim Tippen feuert. */}
      {onChange && (
        <p className="text-xs font-mono text-amber-500/80 bg-stone-800/60 rounded px-2 py-1">
          debug: {dbg}
        </p>
      )}
    </div>
  )
}
