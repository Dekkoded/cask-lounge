import { useEffect, useState, lazy, Suspense } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getMemberInfo, listPublicRatedDrinks, type MemberInfo, type PublicRatedDrink } from '../lib/queries/profile'
import { lookupDistillery } from '../lib/distilleries'
import Lightbox from '../components/Lightbox'
import { usePageMeta } from '../lib/pageMeta'
import { thumbUrl } from '../lib/image'
import Img from '../components/Img'
import type { MapPin } from '../components/DistilleryMap'

const DistilleryMap = lazy(() => import('../components/DistilleryMap'))

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [member, setMember] = useState<MemberInfo | null>(null)
  const [topRegion, setTopRegion] = useState<string | null>(null)
  const [whiskies, setWhiskies] = useState<PublicRatedDrink[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    getMemberInfo(id).then(async info => {
      if (!info) { setNotFound(true); setLoading(false); return }
      setMember(info)

      const list = await listPublicRatedDrinks(id)
      const regionCounts = new Map<string, number>()
      for (const w of list) {
        if (w.region) regionCounts.set(w.region, (regionCounts.get(w.region) ?? 0) + 1)
      }
      setTopRegion([...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)

      setWhiskies(list)
      setLoading(false)
    })
  }, [id])

  usePageMeta({ title: member ? (member.display_name ?? member.username) : undefined })

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="h-4 w-20 bg-stone-800 rounded mb-8 skeleton" />
        <div className="flex flex-col items-center gap-4 skeleton">
          <div className="w-24 h-24 bg-stone-800 rounded-full" />
          <div className="h-5 bg-stone-800 rounded w-40" />
        </div>
      </div>
    )
  }

  if (notFound || !member) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">← {t('common.back')}</button>
        <p className="text-stone-400">{t('member.notFound')}</p>
      </div>
    )
  }

  const name = member.display_name ?? member.username

  const pins = (() => {
    const byProducer = new Map<string, MapPin>()
    for (const w of whiskies) {
      const geo = lookupDistillery(w.producer)
      if (!geo || !w.producer) continue
      if (!byProducer.has(w.producer)) byProducer.set(w.producer, { name: w.producer, geo, whiskies: [] })
      byProducer.get(w.producer)!.whiskies.push({ id: w.id, name: w.name })
    }
    return [...byProducer.values()]
  })()

  return (
    <div className="max-w-lg mx-auto p-6 pb-24">
      <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">← {t('common.back')}</button>

      <div className="flex flex-col items-center mb-8">
        {member.avatar_url ? (
          <Img
            src={thumbUrl(member.avatar_url, 256)}
            alt={name}
            onClick={() => setLightboxSrc(member.avatar_url)}
            className="w-24 h-24 rounded-full object-cover ring-2 ring-stone-700 cursor-zoom-in"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-stone-800 flex items-center justify-center text-3xl ring-2 ring-stone-700">👤</div>
        )}
        <h1 className="font-display text-2xl font-semibold text-stone-100 mt-4">{name}</h1>
        {member.display_name && <p className="text-stone-500 text-sm font-mono">@{member.username}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
          <p className="font-display text-2xl font-semibold text-amber-400 tabular-nums">{whiskies.length}</p>
          <p className="text-stone-500 text-xs mt-1">{t('profile.stats.rated')}</p>
        </div>
        <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
          <p className="text-base font-bold text-amber-400 truncate">{topRegion ?? '—'}</p>
          <p className="text-stone-500 text-xs mt-1">{t('profile.stats.topRegion')}</p>
        </div>
      </div>

      {pins.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-stone-300 mb-2">{t('member.distilleries')}</p>
          <Suspense fallback={<div className="h-72 bg-stone-900 rounded-xl skeleton" />}>
            <DistilleryMap pins={pins} heightClass="h-72" />
          </Suspense>
        </div>
      )}

      <p className="text-sm font-medium text-stone-300 mb-2">{t('member.ratedWhiskies')}</p>
      {whiskies.length === 0 ? (
        <div className="bg-stone-900 rounded-xl p-4 text-stone-500 text-sm">{t('member.noPublicRating')}</div>
      ) : (
        <div className="stagger flex flex-col gap-2">
          {whiskies.map((w, i) => (
            <Link key={w.id} to={`/whisky/${w.id}`} className="press flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-3 transition-colors">
              {w.photo_url ? (
                <Img src={thumbUrl(w.photo_url, 96)} alt={w.name} loading="lazy" decoding="async" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🥃</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-100 truncate">{w.name}</p>
                <div className="flex items-center gap-2 text-sm text-stone-400">
                  {w.region && <span className="truncate">{w.region}</span>}
                  {i === 0 && w.overall != null && (
                    <span className="text-amber-400 text-xs font-medium whitespace-nowrap">{t('member.favourite')}</span>
                  )}
                </div>
              </div>
              {w.overall != null && (
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-amber-400">{w.overall}</p>
                  <p className="text-xs text-stone-500">/10</p>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      <Lightbox src={lightboxSrc} alt={name} onClose={() => setLightboxSrc(null)} />
    </div>
  )
}
