import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listMyGroups } from '../lib/queries/groups'
import { createTasting } from '../lib/queries/tastings'
import { useAuth } from '../context/auth-context'
import Modal from './Modal'

interface GroupOpt { id: string; name: string }

export default function CreateTastingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [groups, setGroups] = useState<GroupOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [groupId, setGroupId] = useState('')
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !user) return
    setLoading(true); setError(null); setTitle('')
    listMyGroups().then(gs => {
      setGroups(gs)
      const last = localStorage.getItem('lastGroupId')
      setGroupId(gs.find(g => g.id === last)?.id ?? gs[0]?.id ?? '')
      setLoading(false)
    })
  }, [open, user])

  const hasGroups = groups.length > 0
  const canCreate = hasGroups && !!groupId && !!title.trim()

  const create = async () => {
    if (!user || !canCreate || creating) return
    setCreating(true); setError(null)
    let newId: string
    try {
      newId = await createTasting({
        group_id: groupId,
        title: title.trim(),
        hosted_by: user.id,
        event_date: null,
      })
    } catch (err) {
      setCreating(false)
      setError((err as Error).message ?? 'Error')
      return
    }
    setCreating(false)
    setTitle('')
    onClose()
    navigate(`/groups/${groupId}/tasting/${newId}`)
  }

  const field = 'w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500'

  return (
    <Modal open={open} onClose={onClose} ariaLabel={t('groups.createTasting')} className="w-full max-w-lg p-6 gap-4">
        <h3 className="text-lg font-bold text-stone-100">{t('groups.createTasting')}</h3>

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
              <label className="text-sm text-stone-400 mb-1 block">{t('groups.tastingGroupLabel')}</label>
              <select value={groupId} onChange={e => setGroupId(e.target.value)} className={field}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-stone-400 mb-1 block">{t('groups.createTasting')}</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('groups.tastingTitlePlaceholder')} className={field} autoFocus />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

            <div className="flex gap-3">
              <button onClick={create} disabled={!canCreate || creating}
                className="press flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3">
                {creating ? t('groups.creatingTasting') : t('groups.createAndAddWhiskies')}
              </button>
              <button onClick={onClose} className="press bg-stone-800 text-stone-300 rounded-xl px-4">{t('common.cancel')}</button>
            </div>
          </>
        )}
    </Modal>
  )
}
