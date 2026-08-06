import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Tasting } from '../../lib/queries/tastings'

interface Props {
  groupId: string
  tastings: Tasting[]
  onCreate: (title: string, eventDate: string | null) => Promise<void>
}

/** Tab: Liste der Tastings einer Gruppe plus Formular zum Anlegen. */
export default function TastingsTab({ groupId, tastings, onCreate }: Props) {
  const { t } = useTranslation()
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [creating, setCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await onCreate(title.trim(), date || null)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {tastings.map(ta => (
        <Link
          key={ta.id}
          to={`/groups/${groupId}/tasting/${ta.id}`}
          className="press flex items-center justify-between bg-stone-900 hover:bg-stone-800 rounded-xl px-4 py-3 transition-colors"
        >
          <div>
            <p className="font-semibold text-stone-100">{ta.title}</p>
            {ta.event_date && <p className="text-xs text-stone-500 mt-0.5">{ta.event_date}</p>}
          </div>
          <span className={`text-xs rounded-full px-3 py-1 ${ta.status === 'closed' ? 'bg-stone-700 text-stone-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {ta.status === 'closed' ? t('groups.tastingClosed') : t('groups.tastingOpen')}
          </span>
        </Link>
      ))}

      {/* Neues Tasting erstellen */}
      <div className="bg-stone-900 rounded-2xl p-5 mt-2">
        <button
          onClick={() => setShowNew(v => !v)}
          className="w-full text-left font-semibold text-stone-200 flex justify-between items-center"
        >
          <span>{t('groups.newTasting')}</span>
          <span className="text-stone-500">{showNew ? '▲' : '▼'}</span>
        </button>
        {showNew && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-4">
            <input
              required
              maxLength={100}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('groups.tastingTitlePlaceholder')}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
            >
              {creating ? t('groups.creatingTasting') : t('groups.createTasting')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
