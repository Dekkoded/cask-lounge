import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePageMeta } from '../lib/pageMeta'
import LoadError from '../components/LoadError'

interface BattleListItem {
  id: string
  status: string
  created_at: string
  group_id: string | null
  battle_drinks: { position: number; drinks: { name: string } | null }[]
}

export default function Battles() {
  const { t } = useTranslation()
  usePageMeta({ title: t('battle.publicHeading'), description: t('battle.publicSub') })
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [battles, setBattles] = useState<BattleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [allDrinks, setAllDrinks] = useState<{ id: string; name: string }[]>([])
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([])
  const [showNew, setShowNew] = useState(searchParams.get('create') === '1')
  const [drinkIds, setDrinkIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [groupId, setGroupId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadBattles = () => {
    setLoading(true)
    setLoadError(false)
    supabase
      .from('battles')
      .select('id, status, created_at, group_id, battle_drinks(position, drinks(name))')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setLoadError(true)
        else setBattles((data as unknown as BattleListItem[]) ?? [])
        setLoading(false)
      })
  }

  useEffect(() => {
    loadBattles()
  }, [])

  useEffect(() => {
    if (!user) return
    supabase.from('drinks').select('id, name').eq('category', 'whisky').order('name')
      .then(({ data }) => setAllDrinks(data ?? []))
    supabase.from('group_members').select('groups(id, name)').eq('user_id', user.id)
      .then(({ data }) => {
        const groups = ((data as unknown as { groups: { id: string; name: string } | null }[]) ?? [])
          .map(r => r.groups).filter((g): g is { id: string; name: string } => !!g)
        setMyGroups(groups)
      })
  }, [user])

  const toggleDrink = (id: string) =>
    setDrinkIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 5 ? prev : [...prev, id])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (drinkIds.length < 2 || drinkIds.length > 5) { setError(t('battle.selectTwoToFive')); return }
    setCreating(true)
    setError(null)
    const { data, error: insErr } = await supabase.from('battles').insert({
      created_by: user.id,
      group_id: groupId || null,
      status: 'open',
    }).select('id').single()
    if (insErr || !data) {
      setCreating(false)
      setError(t('battle.createError', { message: insErr?.message ?? '' }))
      return
    }
    const rows = drinkIds.map((drink_id, position) => ({ battle_id: data.id, drink_id, position }))
    await supabase.from('battle_drinks').insert(rows)
    setCreating(false)
    navigate(`/battle/${data.id}`)
  }

  const matchupOf = (b: BattleListItem) =>
    [...b.battle_drinks]
      .sort((a, c) => a.position - c.position)
      .map(d => d.drinks?.name)
      .filter(Boolean)
      .join(` ${t('battle.vs')} `) || t('battle.heading')

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-amber-400 py-4">{t('battle.publicHeading')}</h1>
      <p className="text-stone-400 text-sm mb-6">{t('battle.publicSub')}</p>

      {/* Neues Battle */}
      {user && (
        <div className="bg-stone-900 rounded-2xl p-5 mb-6">
          <button
            onClick={() => setShowNew(v => !v)}
            className="w-full text-left font-semibold text-stone-200 flex justify-between items-center"
          >
            <span>⚔️ {t('battle.newBattle')}</span>
            <span className="text-stone-500">{showNew ? '▲' : '▼'}</span>
          </button>
          {showNew && (
            <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-4">
              <p className="text-sm text-stone-400">
                {t('battle.pickDrinks')}
                {drinkIds.length > 0 && <span className="text-amber-400"> · {t('battle.selected')}: {drinkIds.length}/5</span>}
              </p>
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('battle.searchPlaceholder')}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              />
              <div className="max-h-56 overflow-y-auto flex flex-col gap-1 -mt-1">
                {allDrinks
                  .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
                  .map(d => {
                    const sel = drinkIds.includes(d.id)
                    const disabled = !sel && drinkIds.length >= 5
                    return (
                      <button
                        type="button"
                        key={d.id}
                        onClick={() => toggleDrink(d.id)}
                        disabled={disabled}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          sel ? 'bg-amber-500/15 text-amber-300' : disabled ? 'bg-stone-800/50 text-stone-600' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        }`}
                      >
                        <span className="truncate">{d.name}</span>
                        <span className="flex-shrink-0 ml-2">{sel ? '✓' : '+'}</span>
                      </button>
                    )
                  })}
              </div>
              {myGroups.length > 0 && (
                <div>
                  <label className="text-sm text-stone-400 mb-1 block">{t('battle.postToGroup')}</label>
                  <select
                    value={groupId}
                    onChange={e => setGroupId(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">{t('battle.publicOption')}</option>
                    {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
              {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>}
              <button
                type="submit"
                disabled={creating || drinkIds.length < 2 || drinkIds.length > 5}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
              >
                {creating ? t('battle.creating') : t('battle.create')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-stone-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <LoadError onRetry={loadBattles} />
      ) : battles.length === 0 ? (
        <p className="text-stone-500 text-center py-12">
          {t('battle.noBattles')}
          <br />
          <span className="text-sm">{t('battle.noBattlesSub')}</span>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {battles.map(b => (
            <Link
              key={b.id}
              to={`/battle/${b.id}`}
              className="flex items-center justify-between gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl px-4 py-3 transition-colors"
            >
              <p className="font-semibold text-stone-100 flex items-center gap-2 min-w-0">
                <span className="flex-shrink-0">⚔️</span>
                <span className="truncate">{matchupOf(b)}</span>
              </p>
              <span className={`text-xs rounded-full px-3 py-1 flex-shrink-0 ${b.status === 'closed' ? 'bg-stone-700 text-stone-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {b.status === 'closed' ? t('battle.closed') : t('battle.open')}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
