import { useEffect, useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams, useViewTransitionState } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import {
  listGlobalScores,
  listMyRatedDrinks,
  listWishlist,
  removeWishlistEntry,
  type VitrineEntry,
  type WishlistEntry,
} from '../lib/queries/ratings'
import { lookupDistillery } from '../lib/distilleries'
import type { MapPin } from '../components/DistilleryMap'
import type { GlobalDrinkScore } from '../lib/types'
import { usePageMeta } from '../lib/pageMeta'
import { formatDate, formatNumber } from '../lib/format'
import { thumbUrl } from '../lib/image'
import Img from '../components/Img'
import SegmentedControl from '../components/SegmentedControl'
import EmptyState from '../components/EmptyState'

const DistilleryMap = lazy(() => import('../components/DistilleryMap'))

type View = 'ranking' | 'vitrine' | 'wishlist'

/**
 * Thumbnail einer Whisky-Zeile mit geteiltem View-Transition-Element:
 * Beim Navigieren zum Detail „morpht" genau das angetippte Foto in den
 * Detail-Header (App-Store-Manier). Der `view-transition-name` wird nur
 * am aktiven Ziel gesetzt (useViewTransitionState), damit nie zwei
 * Elemente gleichzeitig denselben Namen tragen. */
function TransitionThumb({ to, photoUrl, name }: { to: string; photoUrl: string | null; name: string }) {
  const active = useViewTransitionState(to)
  const vt = active ? ({ viewTransitionName: 'whisky-photo' } as const) : undefined
  return photoUrl ? (
    <Img src={thumbUrl(photoUrl, 112)} alt={name} loading="lazy" decoding="async" style={vt} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
  ) : (
    <div style={vt} className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
  )
}

export default function GlobalLanding() {
  const { t, i18n } = useTranslation()
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
    listGlobalScores()
      .then(setScores)
      .catch(() => setScores([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) { setVitrineLoading(false); return }
    listMyRatedDrinks(user.id).then(data => {
      setVitrine(data)
      setVitrineLoading(false)
    })
  }, [user])

  useEffect(() => {
    if (!user) { setWishlistLoading(false); return }
    listWishlist(user.id).then(data => {
      setWishlist(data)
      setWishlistLoading(false)
    })
  }, [user])

  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const removeFromWishlist = (entryId: string) => {
    // Erst kollabieren lassen (Höhe + gap), dann endgültig entfernen – kein
    // hartes Wegpoppen mehr. Serverseitiges Löschen läuft optimistisch parallel.
    setRemovingIds(prev => new Set(prev).add(entryId))
    removeWishlistEntry(entryId).catch(() => {})
    window.setTimeout(() => {
      setWishlist(prev => prev.filter(w => w.id !== entryId))
      setRemovingIds(prev => {
        const next = new Set(prev)
        next.delete(entryId)
        return next
      })
    }, 280)
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
      <h1 className="font-display text-2xl font-semibold text-amber-400 py-4 mb-2">{headings[view]}</h1>

      {/* Sticky: Suche + Kategorien */}
      <div className="sticky top-12 z-30 bg-app -mx-4 px-4 pt-1 pb-3 mb-3 flex flex-col gap-3">
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
          className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-100 focus:outline-none focus:border-amber-500 [&::-webkit-search-cancel-button]:hidden"
        />

        {/* Region-Filter */}
        {regions.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
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

        {/* Untertabs Sammlung / Wunschliste – die goldene Pille gleitet unter
            den aktiven Tab (Emil/Apple: räumliche Kontinuität statt hartem
            Farbsprung). Nur transform (GPU); Text-Farbe blendet weich mit. */}
        {user && (view === 'vitrine' || view === 'wishlist') && (
          <SegmentedControl
            variant="gold"
            value={view}
            onChange={setView}
            options={[
              { value: 'vitrine', label: t('landing.tabCollection') },
              { value: 'wishlist', label: t('landing.tabWishlist') },
            ]}
          />
        )}
      </div>


      {/* Ranking */}
      {view === 'ranking' && (
        loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 skeleton">
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
          <EmptyState
            icon="🥃"
            title={t('landing.noWhiskies')}
            action={user ? (
              <button
                onClick={() => navigate('/add-whisky')}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
              >
                {t('landing.addFirstWhisky')}
              </button>
            ) : undefined}
          />
        ) : (
          <div className="stagger flex flex-col gap-3">
            {filtered.map((s, rank) => (
              <Link
                key={s.id}
                to={`/whisky/${s.id}`}
                viewTransition
                className="press flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
              >
                <span className="text-stone-500 text-sm w-6 text-center font-mono">
                  {rank + 1}
                </span>
                <TransitionThumb to={`/whisky/${s.id}`} photoUrl={s.photo_url} name={s.name} />
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
                    <p className="font-display text-2xl font-semibold text-amber-400 tabular-nums">{s.avg_overall}</p>
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
              <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 skeleton">
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
          vitrine.length === 0 ? (
            <EmptyState
              icon="🥃"
              title={t('landing.noRatedWhiskies')}
              action={
                <button
                  onClick={() => setView('ranking')}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
                >
                  {t('landing.discoverWhiskies')}
                </button>
              }
            />
          ) : (
            <EmptyState icon="🔍" title={t('landing.noVitrineMatches')} />
          )
        ) : (
          <div className="stagger flex flex-col gap-3">
            {collectionValue > 0 && (
              <div className="bg-stone-900 rounded-xl px-4 py-3 flex items-baseline justify-between">
                <span className="text-stone-400 text-sm">{t('landing.collectionValue')}</span>
                <span className="text-amber-400 font-bold">
                  {formatNumber(collectionValue, i18n.language, { maximumFractionDigits: 0 })} €
                  <span className="text-stone-500 text-xs font-normal ml-1">({pricedCount})</span>
                </span>
              </div>
            )}
            {vitrinePins.length > 0 && (
              <div>
                <p className="text-sm font-medium text-stone-300 mb-2">{t('landing.distilleries')}</p>
                <Suspense fallback={<div className="h-72 bg-stone-900 rounded-xl skeleton" />}>
                  <DistilleryMap pins={vitrinePins} heightClass="h-72" />
                </Suspense>
              </div>
            )}
            {filteredVitrine.filter(v => v.drinks).map(v => (
              <Link
                key={v.id}
                to={`/whisky/${v.drinks!.id}`}
                viewTransition
                className="press flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
              >
                <TransitionThumb to={`/whisky/${v.drinks!.id}`} photoUrl={v.drinks!.photo_url} name={v.drinks!.name} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-100 truncate">{v.drinks!.name}</p>
                  <p className="text-sm text-stone-400 truncate">
                    {[v.drinks!.producer, v.drinks!.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    {t('landing.ratedOn', { date: formatDate(v.updated_at, i18n.language) })}
                  </p>
                </div>
                {v.overall != null ? (
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-2xl font-semibold text-amber-400 tabular-nums">{v.overall}</p>
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
              <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 skeleton">
                <div className="w-14 h-14 bg-stone-800 rounded-lg flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <div className="h-4 bg-stone-800 rounded w-3/4" />
                  <div className="h-3 bg-stone-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredWishlist.length === 0 ? (
          wishlist.length === 0 ? (
            <EmptyState
              icon="⭐"
              title={t('landing.noWishlist')}
              action={
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setView('ranking')}
                    className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2"
                  >
                    {t('landing.discoverWhiskies')}
                  </button>
                  <button
                    onClick={() => navigate('/add-whisky?to=wishlist')}
                    className="text-amber-400 hover:text-amber-300 text-sm font-medium py-1"
                  >
                    {t('landing.addNewToWishlist')}
                  </button>
                </div>
              }
            />
          ) : (
            <EmptyState icon="🔍" title={t('landing.noWishlistMatches')} />
          )
        ) : (
          <div className="stagger flex flex-col gap-3">
            <button
              onClick={() => navigate('/add-whisky?to=wishlist')}
              className="press flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 border border-dashed border-stone-700 rounded-xl p-3 text-amber-400 font-medium transition-colors"
            >
              <span className="text-lg leading-none">＋</span> {t('landing.addNewToWishlist')}
            </button>
            {filteredWishlist.filter(w => w.drinks).map(w => (
              <div
                key={w.id}
                data-removing={removingIds.has(w.id) ? '' : undefined}
                className="wl-collapse"
              >
                <div className="wl-collapse-inner flex items-center gap-4 bg-stone-900 rounded-xl p-4">
                  <Link to={`/whisky/${w.drinks!.id}`} viewTransition className="flex items-center gap-4 flex-1 min-w-0">
                    <TransitionThumb to={`/whisky/${w.drinks!.id}`} photoUrl={w.drinks!.photo_url} name={w.drinks!.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-100 truncate">{w.drinks!.name}</p>
                      <p className="text-sm text-stone-400 truncate">
                        {[w.drinks!.producer, w.drinks!.region].filter(Boolean).join(' · ')}
                      </p>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {t('landing.savedOn', { date: formatDate(w.created_at, i18n.language) })}
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
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
