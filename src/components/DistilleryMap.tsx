import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DistilleryGeo } from '../lib/distilleries'

export interface MapPin {
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

function FitBounds({ points, singleZoom }: { points: [number, number][]; singleZoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) { map.setView(points[0], singleZoom); return }
    map.fitBounds(points, { padding: [40, 40] })
  }, [points, singleZoom, map])
  return null
}

export default function DistilleryMap({
  pins,
  heightClass = 'h-[70vh]',
  singleZoom = 7,
}: {
  pins: MapPin[]
  heightClass?: string
  singleZoom?: number
}) {
  const points = pins.map(p => [p.geo.lat, p.geo.lng] as [number, number])

  return (
    <div className={`${heightClass} rounded-xl overflow-hidden border border-stone-800 relative isolate`}>
      <MapContainer center={[56.5, -4]} zoom={5} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} singleZoom={singleZoom} />
        {pins.map(p => (
          <Marker key={p.name} position={[p.geo.lat, p.geo.lng]} icon={pinIcon}>
            <Popup>
              <p className="font-bold text-stone-950">{p.name}</p>
              <p className="text-stone-950/60 text-xs mb-1">{p.geo.country}</p>
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
  )
}
