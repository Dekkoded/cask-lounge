import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Drink } from '../lib/types'

interface BattleRow {
  id: string
  group_id: string
  title: string
  status: string
  created_by: string | null
}

interface BattleVote {
  drink_id: string
  user_id: string
}

interface Contender {
  drink: Drink
  position: number
}

export default function Battle() {
  const { t } = useTranslation()
  const { id, bid } = useParams<{ id: string; bid: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [battle, setBattle] = useState<BattleRow | null>(null)
  const [contenders, setContenders] = useState<Contender[]>([])
  const [votes, setVotes] = useState<BattleVote[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadVotes = async (battleId: string) => {
    const { data } = await supabase
      .from('battle_votes')
      .select('drink_id, user_id')
      .eq('battle_id', battleId)
    setVotes((data as BattleVote[]) ?? [])
  }

  useEffect(() => {
    if (!bid) return
    let active = true
    ;(async () => {
      const { data: b } = await supabase
        .from('battles')
        .select('id, group_id, title, status, created_by')
        .eq('id', bid)
        .maybeSingle()
      if (!active) return
      setBattle((b as BattleRow) ?? null)

      const { data: bd } = await supabase
        .from('battle_drinks')
        .select('position, drinks(*)')
        .eq('battle_id', bid)
        .order('position')
      if (!active) return
      const list = ((bd as unknown as { position: number; drinks: Drink | null }[]) ?? [])
        .filter(r => r.drinks)
        .map(r => ({ drink: r.drinks as Drink, position: r.position }))
      setContenders(list)

      await loadVotes(bid)
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [bid])

  useEffect(() => {
    if (!bid) return
    const channel = supabase
      .channel(`battle-votes-${bid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_votes', filter: `battle_id=eq.${bid}` }, () => loadVotes(bid))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [bid])

  const myVote = votes.find(v => v.user_id === user?.id)?.drink_id ?? null
  const total = votes.length
  const countFor = (drinkId: string) => votes.filter(v => v.drink_id === drinkId).length
  const maxVotes = Math.max(0, ...contenders.map(c => countFor(c.drink.id)))
  const isOpen = battle?.status === 'open'
  const isCreator = !!user && battle?.created_by === user.id

  const castVote = async (drinkId: string) => {
    if (!user || !bid || !isOpen || busy) return
    setBusy(true)
    // Optimistisch aktualisieren
    setVotes(prev => [...prev.filter(v => v.user_id !== user.id), { drink_id: drinkId, user_id: user.id }])
    await supabase.from('battle_votes').upsert(
      { battle_id: bid, drink_id: drinkId, user_id: user.id },
      { onConflict: 'battle_id,user_id' },
    )
    await loadVotes(bid)
    setBusy(false)
  }

  const toggleStatus = async () => {
    if (!battle || !isCreator) return
    const next = isOpen ? 'closed' : 'open'
    setBattle({ ...battle, status: next })
    await supabase.from('battles').update({ status: next }).eq('id', battle.id)
  }

  const remove = async () => {
    if (!battle || !isCreator) return
    if (!confirm(t('battle.confirmDelete'))) return
    await supabase.from('battles').delete().eq('id', battle.id)
    navigate(`/groups/${id}`)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="h-4 w-24 bg-stone-800 rounded mb-6 animate-pulse" />
        <div className="h-7 w-56 bg-stone-800 rounded mb-6 animate-pulse" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-24 bg-stone-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!battle) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <button onClick={() => navigate(`/groups/${id}`)} className="text-stone-400 hover:text-stone-200 text-sm">← {t('battle.back')}</button>
        <p className="text-stone-500 text-center py-12">{t('battle.notFound')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-3 py-4 mb-2">
        <button onClick={() => navigate(`/groups/${id}`)} className="text-stone-400 hover:text-stone-200 text-sm">← {t('battle.back')}</button>
        <div className="flex-1" />
        <span className={`text-xs rounded-full px-3 py-1 ${isOpen ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-700 text-stone-400'}`}>
          {isOpen ? t('battle.open') : t('battle.closed')}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-stone-100 mb-1">{battle.title}</h1>
      <p className="text-stone-500 text-sm mb-6">
        {total === 0 ? t('battle.noVotes') : t('battle.totalVotes', { count: total })}
      </p>

      {!isOpen && <p className="text-stone-500 text-sm mb-4">{t('battle.closedHint')}</p>}

      <div className="flex flex-col gap-3">
        {contenders.map(({ drink }) => {
          const c = countFor(drink.id)
          const pct = total > 0 ? Math.round((c / total) * 100) : 0
          const mine = myVote === drink.id
          const leading = c > 0 && c === maxVotes
          return (
            <button
              key={drink.id}
              onClick={() => castVote(drink.id)}
              disabled={!isOpen || busy}
              className={`relative overflow-hidden text-left rounded-2xl border p-4 transition-colors ${
                mine ? 'border-amber-500 bg-stone-900' : 'border-stone-800 bg-stone-900'
              } ${isOpen ? 'hover:border-stone-600 cursor-pointer' : 'cursor-default'}`}
            >
              {/* Ergebnis-Balken im Hintergrund */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-500 ${mine ? 'bg-amber-500/15' : 'bg-stone-800/60'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center gap-4">
                {drink.photo_url ? (
                  <img src={drink.photo_url} alt={drink.name} loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/whisky/${drink.id}`}
                      onClick={e => e.stopPropagation()}
                      className="font-semibold text-stone-100 truncate hover:text-amber-400 transition-colors"
                    >
                      {drink.name}
                    </Link>
                    {!isOpen && leading && (
                      <span className="text-xs bg-amber-500 text-stone-950 font-semibold rounded-full px-2 py-0.5 flex-shrink-0">
                        {maxVotes > 0 && contenders.filter(x => countFor(x.drink.id) === maxVotes).length > 1 ? t('battle.tie') : t('battle.winner')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-400 truncate">
                    {[drink.producer, drink.region].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-xs mt-0.5">
                    {mine ? (
                      <span className="text-amber-400 font-medium">{t('battle.yourVote')}{isOpen && ` · ${t('battle.changeVote')}`}</span>
                    ) : (
                      <span className="text-stone-600">{t('battle.votes', { count: c })}</span>
                    )}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-2xl font-bold ${mine ? 'text-amber-400' : 'text-stone-300'}`}>{pct}%</p>
                  <p className="text-xs text-stone-500">{t('battle.votes', { count: c })}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {isCreator && (
        <div className="flex gap-3 mt-8">
          <button
            onClick={toggleStatus}
            className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium rounded-xl py-3 transition-colors"
          >
            {isOpen ? t('battle.close') : t('battle.reopen')}
          </button>
          <button
            onClick={remove}
            className="bg-red-900/30 hover:bg-red-900/50 text-red-400 font-medium rounded-xl px-4 transition-colors"
          >
            {t('battle.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
