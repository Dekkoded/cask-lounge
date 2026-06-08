import { useEffect, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { lookupDistillery } from '../lib/distilleries'
import type { MapPin } from '../components/DistilleryMap'
import type { GlobalDrinkScore, Drink } from '../lib/types'
import { usePageMeta } from '../lib/pageMeta'

const DistilleryMap = lazy(() => import('../components/DistilleryMap'))

type View = 'ranking' | 'vitrine' | 'wishlist'

interface VitrineEntry {
  id: string
  overall: number | null
  updated_at: string
  purchase_price: number | null
  drinks: Drink | null
}

interface WishlistEntry {
  id: string
  created_at: string
  drinks: Drink | null
}

export default function GlobalLanding() {
  const { t } = useTranslation()
  usePageMeta()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = (searchParams.get('view') as View) || 'ranking'
  const setView = (v: View) =>
    setSearchParams(v === 'ranking' ? {} : { view: v }, { replace: true })
  const [scores, setScores] = useState<GlobalDrinkScore[]>([])
  const [vitrine, setVitrine] = useState<VitrineEntry[]>([])
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState<string | null>(null)
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
      .select('id, overall, updated_at, purchase_price, drinks(*)')
      .eq('user_id', user.id)
      .order('overall', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setVitrine((data as unknown as VitrineEntry[]) ?? [])
        setVitrineLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (!user) { setWishlistLoading(false); return }
    supabase
      .from('wishlist')
      .select('id, created_at, drinks(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setWishlist((data as unknown as WishlistEntry[]) ?? [])
        setWishlistLoading(false)
      })
  }, [user])

  const removeFromWishlist = async (entryId: string) => {
    setWishlist(prev => prev.filter(w => w.id !== entryId))
    await supabase.from('wishlist').delete().eq('id', entryId)
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
    (!regionFilter || v.drinks?.region === regionFilter) &&
    ((v.drinks?.name ?? '').toLowerCase().includes(q) ||
      (v.drinks?.producer ?? '').toLowerCase().includes(q) ||
      (v.drinks?.region ?? '').toLowerCase().includes(q))
  )

  const filteredWishlist = wishlist.filter(w =>
    (!regionFilter || w.drinks?.region === regionFilter) &&
    ((w.drinks?.name ?? '').toLowerCase().includes(q) ||
      (w.drinks?.producer ?? '').toLowerCase().includes(q) ||
      (w.drinks?.region ?? '').toLowerCase().includes(q))
  )

  const collectionValue = filteredVitrine.reduce((s, v) => s + (v.purchase_price ?? 0), 0)
  const pricedCount = filteredVitrine.filter(v => v.purchase_price != null).length

  const vitrinePins = (() => {
    const byProducer = new Map<string, MapPin>()
    for (const v of filteredVitrine) {
      const producer = v.drinks?.producer
      const geo = lookupDistillery(producer ?? null)
      if (!geo || !producer || !v.drinks) continue
      if (!byProducer.has(producer)) byProducer.set(producer, { name: producer, geo, whiskies: [] })
      byProducer.get(producer)!.whiskies.push({ id: v.drinks.id, name: v.drinks.name })
    }
    return [...byProducer.values()]
  })()

  const headings: Record<View, string> = {
    ranking: t('landing.headingRanking'),
    vitrine: t('landing.headingVitrine'),
    wishlist: t('landing.headingWishlist'),
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-amber-400 py-4 mb-2">{headings[view]}</h1>

      {/* Suche */}
      <input
        type="search"
        name="whisky-suche"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('landing.searchPlaceholder')}
        autoComplete="off"
        readOnly={searchReadonly}
        onFocus={() => setSearchReadonly(false)}
        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 focus:outline-none focus:border-amber-500 mb-6 [&::-webkit-search-cancel-button]:hidden"
      />

      {/* Region-Filter */}
      {regions.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mt-2 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setRegionFilter(null)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${regionFilter === null ? 'bg-amber-500 text-stone-950 font-medium' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>
            {t('landing.allRegions')}
          </button>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-sm transition-colors ${regionFilter === r ? 'bg-amber-500 text-stone-950 font-medium' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'}`}>
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Untertabs Sammlung / Wunschliste */}
      {user && (view === 'vitrine' || view === 'wishlist') && (
        <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-4">
          <button
            onClick={() => setView('vitrine')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${view === 'vitrine' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            {t('landing.tabCollection')}
          </button>
          <button
            onClick={() => setView('wishlist')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${view === 'wishlist' ? 'bg-amber-500 text-stone-950' : 'text-stone-300 hover:bg-stone-800'}`}
          >
            {t('landing.tabWishlist')}
          </button>
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
            <p className="text-stone-500 mb-4">{t('landing.noWhiskies')}</p>
            {user && (
              <button
                onClick={() => navigate('/add-whisky')}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
              >
                {t('landing.addFirstWhisky')}
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
                  <img src={s.photo_url} alt={s.name} loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-100 truncate">{s.name}</p>
                  <p className="text-sm text-stone-400 truncate">
                    {[s.producer, s.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {t('landing.ratings', { count: s.num_ratings })}
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
                ? t('landing.noRatedWhiskies')
                : t('landing.noVitrineMatches')}
            </p>
            {vitrine.length === 0 && (
              <button
                onClick={() => setView('ranking')}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
              >
                {t('landing.discoverWhiskies')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {collectionValue > 0 && (
              <div className="bg-stone-900 rounded-xl px-4 py-3 flex items-baseline justify-between">
                <span className="text-stone-400 text-sm">{t('landing.collectionValue')}</span>
                <span className="text-amber-400 font-bold">
                  {collectionValue.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €
                  <span className="text-stone-500 text-xs font-normal ml-1">({pricedCount})</span>
                </span>
              </div>
            )}
            {vitrinePins.length > 0 && (
              <div>
                <p className="text-sm font-medium text-stone-300 mb-2">{t('landing.distilleries')}</p>
                <Suspense fallback={<div className="h-72 bg-stone-900 rounded-xl animate-pulse" />}>
                  <DistilleryMap pins={vitrinePins} heightClass="h-72" />
                </Suspense>
              </div>
            )}
            {filteredVitrine.filter(v => v.drinks).map(v => (
              <Link
                key={v.id}
                to={`/whisky/${v.drinks!.id}`}
                className="flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
              >
                {v.drinks!.photo_url ? (
                  <img src={v.drinks!.photo_url} alt={v.drinks!.name} loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-100 truncate">{v.drinks!.name}</p>
                  <p className="text-sm text-stone-400 truncate">
                    {[v.drinks!.producer, v.drinks!.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {t('landing.ratedOn', { date: new Date(v.updated_at).toLocaleDateString('de-DE') })}
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

      {/* Wunschliste */}
      {view === 'wishlist' && (
        wishlistLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 animate-pulse">
                <div className="w-14 h-14 bg-stone-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-stone-800 rounded w-3/4" />
                  <div className="h-3 bg-stone-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredWishlist.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-stone-500 mb-4">
              {wishlist.length === 0
                ? t('landing.noWishlist')
                : t('landing.noWishlistMatches')}
            </p>
            {wishlist.length === 0 && (
              <button
                onClick={() => setView('ranking')}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
              >
                {t('landing.discoverWhiskies')}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredWishlist.filter(w => w.drinks).map(w => (
              <div
                key={w.id}
                className="flex items-center gap-4 bg-stone-900 rounded-xl p-4"
              >
                <Link to={`/whisky/${w.drinks!.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  {w.drinks!.photo_url ? (
                    <img src={w.drinks!.photo_url} alt={w.drinks!.name} loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-100 truncate">{w.drinks!.name}</p>
                    <p className="text-sm text-stone-400 truncate">
                      {[w.drinks!.producer, w.drinks!.region].filter(Boolean).join(' · ')}
                    </p>
                    <p className="text-xs text-stone-600 mt-0.5">
                      {t('landing.savedOn', { date: new Date(w.created_at).toLocaleDateString('de-DE') })}
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => removeFromWishlist(w.id)}
                  aria-label={t('landing.removeFromWishlist')}
                  className="text-stone-500 hover:text-red-400 transition-colors flex-shrink-0 p-2 -m-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
