import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface MemberInfo {
  username: string
  display_name: string | null
  avatar_url: string | null
}

interface FavDrink {
  id: string
  name: string
  region: string | null
  photo_url: string | null
}

export default function MemberProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [member, setMember] = useState<MemberInfo | null>(null)
  const [count, setCount] = useState(0)
  const [topRegion, setTopRegion] = useState<string | null>(null)
  const [favorite, setFavorite] = useState<(FavDrink & { overall: number | null }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)

    supabase.from('profiles').select('username, display_name, avatar_url').eq('id', id).maybeSingle()
      .then(({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return }
        setMember(data)

        supabase.from('ratings')
          .select('overall, drinks(id, name, region, photo_url)')
          .eq('user_id', id).eq('is_public', true)
          .order('overall', { ascending: false, nullsFirst: false })
          .then(({ data: rows }) => {
            const list = (rows as unknown as { overall: number | null; drinks: FavDrink | null }[]) ?? []
            setCount(list.length)

            const regionCounts = new Map<string, number>()
            for (const r of list) {
              const region = r.drinks?.region
              if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1)
            }
            setTopRegion([...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null)

            const fav = list.find(r => r.drinks)
            setFavorite(fav?.drinks ? { ...fav.drinks, overall: fav.overall } : null)
            setLoading(false)
          })
      })
  }, [id])

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="h-4 w-20 bg-stone-800 rounded mb-8 animate-pulse" />
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-24 h-24 bg-stone-800 rounded-full" />
          <div className="h-5 bg-stone-800 rounded w-40" />
        </div>
      </div>
    )
  }

  if (notFound || !member) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">← Zurück</button>
        <p className="text-stone-400">Dieses Profil wurde nicht gefunden.</p>
      </div>
    )
  }

  const name = member.display_name ?? member.username

  return (
    <div className="max-w-lg mx-auto p-6 pb-24">
      <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">← Zurück</button>

      <div className="flex flex-col items-center mb-8">
        {member.avatar_url ? (
          <img src={member.avatar_url} alt={name} className="w-24 h-24 rounded-full object-cover ring-2 ring-stone-700" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-stone-800 flex items-center justify-center text-3xl ring-2 ring-stone-700">👤</div>
        )}
        <h1 className="text-2xl font-bold text-stone-100 mt-4">{name}</h1>
        {member.display_name && <p className="text-stone-500 text-sm font-mono">@{member.username}</p>}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{count}</p>
          <p className="text-stone-500 text-xs mt-1">Bewertet</p>
        </div>
        <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
          <p className="text-base font-bold text-amber-400 truncate">{topRegion ?? '—'}</p>
          <p className="text-stone-500 text-xs mt-1">Top-Region</p>
        </div>
      </div>

      <p className="text-sm font-medium text-stone-300 mb-2">Lieblings-Whisky</p>
      {favorite ? (
        <Link to={`/whisky/${favorite.id}`} className="flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors">
          {favorite.photo_url ? (
            <img src={favorite.photo_url} alt={favorite.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-100 truncate">{favorite.name}</p>
            {favorite.region && <p className="text-sm text-stone-400 truncate">{favorite.region}</p>}
          </div>
          {favorite.overall != null && (
            <div className="text-right flex-shrink-0">
              <p className="text-2xl font-bold text-amber-400">{favorite.overall}</p>
              <p className="text-xs text-stone-500">/10</p>
            </div>
          )}
        </Link>
      ) : (
        <div className="bg-stone-900 rounded-xl p-4 text-stone-500 text-sm">Noch keine öffentliche Bewertung.</div>
      )}
    </div>
  )
}
