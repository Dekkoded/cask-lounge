const LABELS = [
  'Fruchtig', 'Floral', 'Würzig', 'Getreidig', 'Torfig', 'Schwefelig',
  'Hefig', 'Nussig', 'Holzig', 'Weinig', 'Schoko', 'Rauchig',
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
  const vals = values.length === 12 ? values : Array(12).fill(0)

  const polygon = vals.map((v, i) => {
    const { x, y } = point(i, Math.max(v, 0.12))
    return `${x},${y}`
  }).join(' ')

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onChange) return
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    // Koordinaten in ViewBox-Raum umrechnen
    const mx = (e.clientX - rect.left) / rect.width * VW - CX
    const my = (e.clientY - rect.top) / rect.height * VH - CY
    const dist = Math.sqrt(mx * mx + my * my)
    if (dist < 6) return // Klick zu nah am Zentrum ignorieren

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
    onChange(best, v)
  }

  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!onChange) return
    e.preventDefault()
    const touch = e.touches[0]
    const svg = e.currentTarget
    const rect = svg.getBoundingClientRect()
    const mx = (touch.clientX - rect.left) / rect.width * VW - CX
    const my = (touch.clientY - rect.top) / rect.height * VH - CY
    const dist = Math.sqrt(mx * mx + my * my)
    if (dist < 6) return

    const clickAng = Math.atan2(my, mx)
    let best = 0
    let bestDiff = Infinity
    for (let i = 0; i < 12; i++) {
      const a = axisAngle(i)
      let diff = ((clickAng - a) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI
      diff = Math.abs(diff)
      if (diff < bestDiff) { bestDiff = diff; best = i }
    }
    const v = Math.min(5, Math.max(0, Math.round((dist / R) * 5)))
    onChange(best, v)
  }

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <p className="text-sm font-medium text-stone-300">{label}</p>
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        className={`w-full ${onChange ? 'cursor-crosshair touch-none' : ''}`}
        onClick={handleClick}
        onTouchStart={handleTouch}
      >
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
        <p className="text-xs text-stone-600">Auf das Rad tippen zum Bearbeiten</p>
      )}
    </div>
  )
}
