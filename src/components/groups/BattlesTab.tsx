import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { BattleListItem } from '../../lib/queries/battles'
import type { DrinkListItem } from '../../lib/queries/drinks'

interface Props {
  battles: BattleListItem[]
  allDrinks: DrinkListItem[]
  onCreate: (drinkIds: string[]) => Promise<void>
}

/** Tab: Liste der Battles einer Gruppe plus Formular zum Anlegen. */
export default function BattlesTab({ battles, allDrinks, onCreate }: Props) {
  const { t } = useTranslation()
  const [showNew, setShowNew] = useState(false)
  const [drinkIds, setDrinkIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleDrink = (drinkId: string) =>
    setDrinkIds(prev => prev.includes(drinkId) ? prev.filter(x => x !== drinkId) : prev.length >= 5 ? prev : [...prev, drinkId])

  const matchup = (b: BattleListItem) =>
    [...b.battle_drinks]
      .sort((a, c) => a.position - c.position)
      .map(d => d.drinks?.name)
      .filter(Boolean)
      .join(` ${t('battle.vs')} `) || t('battle.heading')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (drinkIds.length < 2 || drinkIds.length > 5) { setError(t('battle.selectTwoToFive')); return }
    setCreating(true)
    setError(null)
    try {
      await onCreate(drinkIds)
    } catch (err) {
      setError(t('battle.createError', { message: (err as Error).message ?? '' }))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {battles.length === 0 && (
        <p className="text-stone-500 text-center py-8">
          {t('battle.noBattles')}
          <br />
          <span className="text-sm">{t('battle.noBattlesSub')}</span>
        </p>
      )}
      {battles.map(b => (
        <Link
          key={b.id}
          to={`/battle/${b.id}`}
          className="press flex items-center justify-between bg-stone-900 hover:bg-stone-800 rounded-xl px-4 py-3 transition-colors"
        >
          <p className="font-semibold text-stone-100 flex items-center gap-2 min-w-0"><span className="flex-shrink-0">⚔️</span><span className="truncate">{matchup(b)}</span></p>
          <span className={`text-xs rounded-full px-3 py-1 ${b.status === 'closed' ? 'bg-stone-700 text-stone-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {b.status === 'closed' ? t('battle.closed') : t('battle.open')}
          </span>
        </Link>
      ))}

      {/* Neues Battle erstellen */}
      <div className="bg-stone-900 rounded-2xl p-5 mt-2">
        <button
          onClick={() => setShowNew(v => !v)}
          className="w-full text-left font-semibold text-stone-200 flex justify-between items-center"
        >
          <span>{t('battle.newBattle')}</span>
          <span className="text-stone-500">{showNew ? '▲' : '▼'}</span>
        </button>
        {showNew && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
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
                  return (
                    <button
                      type="button"
                      key={d.id}
                      onClick={() => toggleDrink(d.id)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        sel ? 'bg-amber-500/15 text-amber-300' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="flex-shrink-0 ml-2">{sel ? '✓' : '+'}</span>
                    </button>
                  )
                })}
            </div>
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
    </div>
  )
}
