import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
    supabase.from('group_members').select('groups(id, name)').eq('user_id', user.id)
      .then(({ data }) => {
        const gs = ((data ?? []) as unknown as { groups: GroupOpt | null }[])
          .map(r => r.groups).filter((g): g is GroupOpt => !!g)
        setGroups(gs)
        setLoading(false)
      })
    supabase.from('drinks').select('id, name').eq('category', 'whisky').order('name')
      .then(({ data }) => setDrinks(data ?? []))
  }, [open, user])

  if (!open) return null

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
    const { error: insErr } = await supabase.from('drink_sessions').insert(rows)
    setPosting(false)
    if (insErr) { setError(t('groups.shareError', { message: insErr.message })); return }
    setSent(true)
    setDrinkId(''); setDrinkName(''); setMessage('')
    setTimeout(() => { setSent(false); onClose() }, 900)
  }

  const field = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500'

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-stone-900 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4 mb-[env(safe-area-inset-bottom)]"
        onClick={e => e.stopPropagation()}
      >
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
                <input value={drinkName} onChange={e => setDrinkName(e.target.value)} placeholder={t('groups.drinkNamePlaceholder')} className={field} />
              </div>
            )}

            <div>
              <label className="text-sm text-stone-400 mb-1 block">{t('groups.messageLabel')}</label>
              <input value={message} onChange={e => setMessage(e.target.value)} placeholder={t('groups.messagePlaceholder')} className={field} />
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
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3">
                {posting ? t('groups.sending') : sent ? '✓' : t('groups.share')}
              </button>
              <button onClick={onClose} className="bg-stone-800 text-stone-300 rounded-xl px-4">{t('common.cancel')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
