import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { GlobalDrinkScore } from '../lib/types'

export default function GlobalLanding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [scores, setScores] = useState<GlobalDrinkScore[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('global_drink_scores')
      .select('*')
      .order('avg_overall', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setScores(data ?? [])
        setLoading(false)
      })
  }, [])

  const filtered = scores.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.producer ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.region ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center py-4 mb-6 gap-3">
        <button
          onClick={() => navigate(user ? '/add-whisky' : '/login')}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-3 py-1.5 text-sm"
        >
          + Whisky
        </button>
        <button
          onClick={() => navigate(user ? '/groups' : '/login')}
          className="bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg px-3 py-1.5 text-sm"
        >
          Gruppen
        </button>
      </div>

      {/* Suche */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Suchen nach Name, Brennerei, Region…"
        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 focus:outline-none focus:border-amber-500 mb-6"
      />

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 animate-pulse">
              <div className="w-6 h-4 bg-stone-800 rounded" />
              <div className="w-14 h-14 bg-stone-800 rounded-lg flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 bg-stone-800 rounded w-3/4" />
                <div className="h-3 bg-stone-800 rounded w-1/2" />
              </div>
              <div className="w-10 h-8 bg-stone-800 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-500 mb-4">Noch keine Whiskys in der Datenbank.</p>
          {user && (
            <button
              onClick={() => navigate('/add-whisky')}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
            >
              Ersten Whisky hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s, rank) => (
            <Link
              key={s.id}
              to={`/whisky/${s.id}`}
              className="flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
            >
              {/* Rang */}
              <span className="text-stone-500 text-sm w-6 text-center font-mono">
                {rank + 1}
              </span>

              {/* Foto */}
              {s.photo_url ? (
                <img src={s.photo_url} alt={s.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-100 truncate">{s.name}</p>
                <p className="text-sm text-stone-400 truncate">
                  {[s.producer, s.region].filter(Boolean).join(' · ')}
                </p>
                <p className="text-xs text-stone-600 mt-0.5">
                  {s.num_ratings} {s.num_ratings === 1 ? 'Bewertung' : 'Bewertungen'}
                </p>
              </div>

              {/* Score */}
              {s.avg_overall != null ? (
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-bold text-amber-400">{s.avg_overall}</p>
                  <p className="text-xs text-stone-500">/10</p>
                </div>
              ) : (
                <span className="text-stone-600 text-sm">—</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
