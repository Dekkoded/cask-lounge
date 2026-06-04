import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'
import { lookupDistillery, type DistilleryGeo } from '../lib/distilleries'

interface CatalogDrink {
  id: string
  name: string
  producer: string | null
}

interface Pin {
  name: string
  geo: DistilleryGeo
  whiskies: { id: string; name: string }[]
}

const pinIcon = L.divIcon({
  html: '<div style="background:#f59e0b;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #1c1917;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:14px">🥃</span></div>',
  className: '',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -28],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) { map.setView(points[0], 7); return }
    map.fitBounds(points, { padding: [40, 40] })
  }, [points, map])
  return null
}

export default function WhiskyMap() {
  const navigate = useNavigate()
  const [pins, setPins] = useState<Pin[]>([])
  const [loading, setLoading] = useState(true)
  const [unmappedCount, setUnmappedCount] = useState(0)

  useEffect(() => {
    supabase.from('drinks').select('id, name, producer').eq('category', 'whisky')
      .then(({ data }) => {
        const byProducer = new Map<string, Pin>()
        let unmapped = 0
        for (const d of (data as CatalogDrink[]) ?? []) {
          const geo = lookupDistillery(d.producer)
          if (!geo || !d.producer) { unmapped++; continue }
          if (!byProducer.has(d.producer)) {
            byProducer.set(d.producer, { name: d.producer, geo, whiskies: [] })
          }
          byProducer.get(d.producer)!.whiskies.push({ id: d.id, name: d.name })
        }
        setPins([...byProducer.values()])
        setUnmappedCount(unmapped)
        setLoading(false)
      })
  }, [])

  const points = pins.map(p => [p.geo.lat, p.geo.lng] as [number, number])

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-3 py-4 mb-2">
        <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm">← Zurück</button>
        <h1 className="text-2xl font-bold text-amber-400">Brennerei-Karte</h1>
      </div>

      {loading ? (
        <div className="h-[70vh] rounded-xl bg-stone-900 animate-pulse" />
      ) : pins.length === 0 ? (
        <p className="text-stone-500 text-center py-12">Noch keine Brennereien mit bekanntem Standort im Katalog.</p>
      ) : (
        <>
          <div className="h-[70vh] rounded-xl overflow-hidden border border-stone-800">
            <MapContainer center={[56.5, -4]} zoom={5} scrollWheelZoom className="h-full w-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds points={points} />
              {pins.map(p => (
                <Marker key={p.name} position={[p.geo.lat, p.geo.lng]} icon={pinIcon}>
                  <Popup>
                    <p className="font-bold text-stone-900">{p.name}</p>
                    <p className="text-stone-500 text-xs mb-1">{p.geo.country}</p>
                    <div className="flex flex-col gap-0.5">
                      {p.whiskies.map(w => (
                        <Link key={w.id} to={`/whisky/${w.id}`} className="text-amber-700 hover:underline text-sm">
                          {w.name}
                        </Link>
                      ))}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          {unmappedCount > 0 && (
            <p className="text-stone-600 text-xs mt-3 text-center">
              {unmappedCount} {unmappedCount === 1 ? 'Whisky' : 'Whiskys'} ohne bekannten Brennerei-Standort.
            </p>
          )}
        </>
      )}
    </div>
  )
}
