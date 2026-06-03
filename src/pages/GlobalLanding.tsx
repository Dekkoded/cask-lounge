import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { GlobalDrinkScore, Drink } from '../lib/types'

type View = 'ranking' | 'vitrine' | 'live'

interface VitrineEntry {
  id: string
  overall: number | null
  updated_at: string
  drinks: Drink | null
}

interface LiveSession {
  id: string
  user_id: string
  drink_name: string | null
  message: string | null
  started_at: string
  profiles: { display_name: string | null; username: string } | null
  drinks: { name: string } | null
}

export default function GlobalLanding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('ranking')
  const [scores, setScores] = useState<GlobalDrinkScore[]>([])
  const [vitrine, setVitrine] = useState<VitrineEntry[]>([])
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [vitrineLoading, setVitrineLoading] = useState(true)
  const [searchReadonly, setSearchReadonly] = useState(true)

  // Live
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [liveLoading, setLiveLoading] = useState(true)
  const [allDrinks, setAllDrinks] = useState<{ id: string; name: string }[]>([])
  const [showDialog, setShowDialog] = useState(false)
  const [sessionDrinkId, setSessionDrinkId] = useState('')
  const [sessionDrinkName, setSessionDrinkName] = useState('')
  const [sessionMessage, setSessionMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

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
    if (!user) { setVitrineLoading(false); setLiveLoading(false); return }
    supabase
      .from('ratings')
      .select('id, overall, updated_at, drinks(*)')
      .eq('user_id', user.id)
      .order('overall', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setVitrine((data as unknown as VitrineEntry[]) ?? [])
        setVitrineLoading(false)
      })

    supabase.from('drinks').select('id, name').eq('category', 'whisky').order('name')
      .then(({ data }) => setAllDrinks(data ?? []))

    loadFeed()
  }, [user])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('live-sessions')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'drink_sessions' }, () => loadFeed())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  const loadFeed = () => {
    supabase
      .from('drink_sessions')
      .select('id, user_id, drink_name, message, started_at, profiles(display_name, username), drinks(name)')
      .order('started_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setSessions((data as unknown as LiveSession[]) ?? [])
        setLiveLoading(false)
      })
  }

  const handlePost = async () => {
    if (!user) return
    setPosting(true)
    setPostError(null)
    const { error } = await supabase.from('drink_sessions').insert({
      user_id: user.id,
      drink_id: sessionDrinkId || null,
      drink_name: sessionDrinkId ? null : sessionDrinkName.trim() || null,
      message: sessionMessage.trim() || null,
    })
    setPosting(false)
    if (error) {
      setPostError('Konnte nicht geteilt werden: ' + error.message)
      return
    }
    setShowDialog(false)
    setSessionDrinkId(''); setSessionDrinkName(''); setSessionMessage('')
    loadFeed()
  }

  const q = search.toLowerCase()
  const regions = [...new Set(scores.map(s => s.region).filter((r): r is string => !!r))].sort()
  const filtered = scores.filter(s =>
    (!regionFilter || s.region === regionFilter) &&
    (s.name.toLowerCase().includes(q) ||
      (s.producer ?? '').toLowerCase().includes(q) ||
      (s.region ?? '').toLowerCase().includes(q))
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

      {/* Umschalter */}
      {user && (
        <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6">
          <button onClick={() => setView('ranking')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'ranking' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            Global
          </button>
          <button onClick={() => setView('vitrine')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'vitrine' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            Meine Vitrine
          </button>
          <button onClick={() => setView('live')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${view === 'live' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            🥃 Live
          </button>
        </div>
      )}

      {/* Suche (nur Global & Vitrine) */}
      {view !== 'live' && (
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
      )}

      {/* Region-Filter (nur Global) */}
      {view === 'ranking' && regions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mt-2 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setRegionFilter(null)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${regionFilter === null ? 'bg-amber-500 text-stone-950 font-medium' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>
            Alle
          </button>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${regionFilter === r ? 'bg-amber-500 text-stone-950 font-medium' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>
              {r}
            </button>
          ))}
        </div>
      )}

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

      {/* Live */}
      {view === 'live' && (
        <div className="flex flex-col gap-4">
          <button onClick={() => { setPostError(null); setShowDialog(true) }}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl py-3 text-lg">
            🥃 Ich trinke gerade…
          </button>
          <p className="text-stone-500 text-xs text-center -mt-2">
            Benachrichtigt alle, mit denen du eine Gruppe teilst.
          </p>

          {liveLoading ? (
            <p className="text-stone-500 text-center py-8 animate-pulse">Lädt…</p>
          ) : sessions.length === 0 ? (
            <p className="text-stone-500 text-center py-8">Noch keine Trink-Sessions.</p>
          ) : (
            sessions.map(s => (
              <div key={s.id} className="bg-stone-900 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🥃</span>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-100">
                      <Link to={`/user/${s.user_id}`} className="hover:text-amber-400 transition-colors">
                        {s.profiles?.display_name ?? s.profiles?.username ?? '?'}
                      </Link> trinkt gerade
                    </p>
                    <p className="text-amber-400 font-medium">
                      {s.drinks?.name ?? s.drink_name ?? '—'}
                    </p>
                    {s.message && <p className="text-stone-400 text-sm mt-1">„{s.message}"</p>}
                    <p className="text-stone-600 text-xs mt-1">
                      {new Date(s.started_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Dialog */}
          {showDialog && (
            <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
              <div className="bg-stone-900 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4">
                <h3 className="text-lg font-bold text-stone-100">Was trinkst du gerade?</h3>

                <div>
                  <label className="text-sm text-stone-400 mb-1 block">Whisky aus Katalog wählen</label>
                  <select value={sessionDrinkId} onChange={e => { setSessionDrinkId(e.target.value); setSessionDrinkName('') }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500">
                    <option value="">— oder frei eingeben ↓</option>
                    {allDrinks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {!sessionDrinkId && (
                  <div>
                    <label className="text-sm text-stone-400 mb-1 block">Oder Name frei eingeben</label>
                    <input value={sessionDrinkName} onChange={e => setSessionDrinkName(e.target.value)}
                      placeholder="z. B. Lagavulin 16"
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
                  </div>
                )}

                <div>
                  <label className="text-sm text-stone-400 mb-1 block">Nachricht (optional)</label>
                  <input value={sessionMessage} onChange={e => setSessionMessage(e.target.value)}
                    placeholder="z. B. Endlich geöffnet! 🎉"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
                </div>

                {postError && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{postError}</p>}

                <div className="flex gap-3">
                  <button onClick={handlePost} disabled={posting || (!sessionDrinkId && !sessionDrinkName.trim())}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3">
                    {posting ? 'Wird gesendet…' : 'Benachrichtigen 🥃'}
                  </button>
                  <button onClick={() => { setShowDialog(false); setPostError(null) }}
                    className="bg-stone-800 text-stone-300 rounded-xl px-4">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
