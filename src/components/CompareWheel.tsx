import { useTranslation } from 'react-i18next'

const LABEL_KEYS = [
  'fruity', 'floral', 'spicy', 'grainy', 'peaty', 'sulphury',
  'yeasty', 'nutty', 'woody', 'winey', 'chocolate', 'smoky',
]

const VW = 380
const VH = 320
const CX = 190
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

export interface WheelSeries {
  values: number[]
  color: string
  name: string
}

interface Props {
  series: WheelSeries[]
  label: string
}

// Schreibgeschütztes Aromarad, das mehrere Whiskys überlagert darstellt.
export default function CompareWheel({ series, label }: Props) {
  const { t } = useTranslation()
  const LABELS = LABEL_KEYS.map(k => t(`whisky.flavors.${k}`))

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <p className="text-sm font-medium text-stone-300">{label}</p>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full">
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
        {/* Flächen je Whisky */}
        {series.map((s, si) => {
          const vals = s.values.length === 12 ? s.values : Array(12).fill(0)
          const polygon = vals.map((v, i) => {
            const { x, y } = point(i, Math.max(v, 0.05))
            return `${x},${y}`
          }).join(' ')
          return (
            <polygon key={si} points={polygon} fill={s.color} fillOpacity="0.18"
              stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
          )
        })}
        {/* Labels */}
        {LABELS.map((lbl, i) => {
          const { x, y, anchor } = labelPos(i)
          return (
            <text key={i} x={x} y={y} textAnchor={anchor}
              dominantBaseline="middle" fontSize="11" fill="#d6d3d1">
              {lbl}
            </text>
          )
        })}
      </svg>
      {/* Legende */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {series.map((s, si) => (
          <span key={si} className="inline-flex items-center gap-1.5 text-xs text-stone-400">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}
