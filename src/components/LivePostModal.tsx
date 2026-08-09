import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { listWhiskies } from '../lib/queries/drinks'
import { listMyGroups } from '../lib/queries/groups'
import { postSessions } from '../lib/queries/sessions'
import { useAuth } from '../context/auth-context'
import Modal from './Modal'

interface GroupOpt { id: string; name: string }

export default function LivePostModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [groups, setGroups] = useState<GroupOpt[]>([])
  const [drinks, setDrinks] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState('all') // 'all' | groupId
  const [drinkId, setDrinkId] = useState('')
  const [drinkName, setDrinkName] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true); setError(null); setSent(false); setTarget('all')
    listMyGroups().then(gs => {
      setGroups(gs)
      setLoading(false)
    })
    listWhiskies().then(setDrinks)
  }, [open, user])

  const hasGroups = groups.length > 0
  const canSubmit = hasGroups && (!!drinkId || !!drinkName.trim())

  const submit = async () => {
    if (!user || !canSubmit) return
    const targetIds = target === 'all' ? groups.map(g => g.id) : [target]
    if (targetIds.length === 0) return
    setPosting(true); setError(null)
    const rows = targetIds.map(gid => ({
      group_id: gid,
      user_id: user.id,
      drink_id: drinkId || null,
      drink_name: drinkId ? null : drinkName.trim() || null,
      message: message.trim() || null,
    }))
    try {
      await postSessions(rows)
    } catch (err) {
      setPosting(false)
      setError(t('groups.shareError', { message: (err as Error).message }))
      return
    }
    setPosting(false)
    setSent(true)
    setDrinkId(''); setDrinkName(''); setMessage('')
    setTimeout(() => { setSent(false); onClose() }, 900)
  }

  const field = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500'

  return (
    <Modal open={open} onClose={onClose} ariaLabel={t('groups.postTitle')} className="w-full max-w-lg p-6 gap-4">
        <h3 className="text-lg font-bold text-stone-100">{t('groups.postTitle')}</h3>

        {loading ? (
          <p className="text-stone-500 text-sm">…</p>
        ) : !hasGroups ? (
          <>
            <p className="text-stone-400 text-sm">{t('groups.noGroupsHint')}</p>
            <button onClick={onClose} className="bg-stone-800 text-stone-300 rounded-xl py-3">{t('common.cancel')}</button>
          </>
        ) : (
          <>
            <div>
              <label className="text-sm text-stone-400 mb-1 block">{t('groups.selectFromCatalog')}</label>
              <select value={drinkId} onChange={e => { setDrinkId(e.target.value); setDrinkName('') }} className={field}>
                <option value="">{t('groups.orFreeInput')}</option>
                {drinks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {!drinkId && (
              <div>
                <label className="text-sm text-stone-400 mb-1 block">{t('groups.enterNameLabel')}</label>
                <input maxLength={120} value={drinkName} onChange={e => setDrinkName(e.target.value)} placeholder={t('groups.drinkNamePlaceholder')} className={field} />
              </div>
            )}

            <div>
              <label className="text-sm text-stone-400 mb-1 block">{t('groups.messageLabel')}</label>
              <input maxLength={280} value={message} onChange={e => setMessage(e.target.value)} placeholder={t('groups.messagePlaceholder')} className={field} />
            </div>

            <div>
              <label className="text-sm text-stone-400 mb-1 block">{t('groups.postTarget')}</label>
              <select value={target} onChange={e => setTarget(e.target.value)} className={field}>
                <option value="all">{t('groups.postTargetAll')}</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

            <div className="flex gap-3">
              <button onClick={submit} disabled={posting || !canSubmit}
                className="press flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3">
                {posting ? t('groups.sending') : sent ? '✓' : t('groups.share')}
              </button>
              <button onClick={onClose} className="press bg-stone-800 text-stone-300 rounded-xl px-4">{t('common.cancel')}</button>
            </div>
          </>
        )}
    </Modal>
  )
}
