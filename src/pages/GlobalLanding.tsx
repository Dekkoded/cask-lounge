import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { GlobalDrinkScore, Drink } from '../lib/types'

type View = 'ranking' | 'vitrine'

interface VitrineEntry {
  id: string
  overall: number | null
  updated_at: string
  drinks: Drink | null
}

export default function GlobalLanding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('ranking')
  const [scores, setScores] = useState<GlobalDrinkScore[]>([])
  const [vitrine, setVitrine] = useState<VitrineEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [vitrineLoading, setVitrineLoading] = useState(true)
  const [searchReadonly, setSearchReadonly] = useState(true)

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

  useEffect(() => {
    if (!user) { setVitrineLoading(false); return }
    supabase
      .from('ratings')
      .select('id, overall, updated_at, drinks(*)')
      .eq('user_id', user.id)
      .order('overall', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setVitrine((data as unknown as VitrineEntry[]) ?? [])
        setVitrineLoading(false)
      })
  }, [user])

  const q = search.toLowerCase()
  const filtered = scores.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.producer ?? '').toLowerCase().includes(q) ||
    (s.region ?? '').toLowerCase().includes(q)
  )
  const filteredVitrine = vitrine.filter(v =>
    (v.drinks?.name ?? '').toLowerCase().includes(q) ||
    (v.drinks?.producer ?? '').toLowerCase().includes(q) ||
    (v.drinks?.region ?? '').toLowerCase().includes(q)
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

      {/* Umschalter Ranking / Vitrine */}
      {user && (
        <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6">
          <button onClick={() => setView('ranking')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'ranking' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            Ranking
          </button>
          <button onClick={() => setView('vitrine')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'vitrine' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            Meine Vitrine
          </button>
        </div>
      )}

      {/* Suche */}
      <input
        type="search"
        name="whisky-suche"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Suchen nach Name, Brennerei, Region…"
        autoComplete="off"
        readOnly={searchReadonly}
        onFocus={() => setSearchReadonly(false)}
        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 focus:outline-none focus:border-amber-500 mb-6 [&::-webkit-search-cancel-button]:hidden"
      />

      {/* Ranking */}
      {view === 'ranking' && (
        loading ? (
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
                <span className="text-stone-500 text-sm w-6 text-center font-mono">
                  {rank + 1}
                </span>
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-100 truncate">{s.name}</p>
                  <p className="text-sm text-stone-400 truncate">
                    {[s.producer, s.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {s.num_ratings} {s.num_ratings === 1 ? 'Bewertung' : 'Bewertungen'}
                  </p>
                </div>
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
        )
      )}

      {/* Vitrine */}
      {view === 'vitrine' && (
        vitrineLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 animate-pulse">
                <div className="w-14 h-14 bg-stone-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-stone-800 rounded w-3/4" />
                  <div className="h-3 bg-stone-800 rounded w-1/2" />
                </div>
                <div className="w-10 h-8 bg-stone-800 rounded" />
              </div>
            ))}
          </div>
        ) : filteredVitrine.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              {vitrine.length === 0
                ? 'Du hast noch keine Whiskys bewertet.'
                : 'Keine Treffer in deiner Vitrine.'}
            </p>
            {vitrine.length === 0 && (
              <button
                onClick={() => setView('ranking')}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
              >
                Whiskys entdecken
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredVitrine.filter(v => v.drinks).map(v => (
              <Link
                key={v.id}
                to={`/whisky/${v.drinks!.id}`}
                className="flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
              >
                {v.drinks!.photo_url ? (
                  <img src={v.drinks!.photo_url} alt={v.drinks!.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-100 truncate">{v.drinks!.name}</p>
                  <p className="text-sm text-stone-400 truncate">
                    {[v.drinks!.producer, v.drinks!.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Bewertet am {new Date(v.updated_at).toLocaleDateString('de-DE')}
                  </p>
                </div>
                {v.overall != null ? (
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-amber-400">{v.overall}</p>
                    <p className="text-xs text-stone-500">/10</p>
                  </div>
                ) : (
                  <span className="text-stone-600 text-sm">—</span>
                )}
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
