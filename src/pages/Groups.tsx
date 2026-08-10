import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { listMyGroups, createGroup, joinGroup, type GroupSummary } from '../lib/queries/groups'
import { useAuth } from '../context/auth-context'

export default function Groups() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)

  const [searchParams] = useSearchParams()
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === '1')
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [joinCode, setJoinCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listMyGroups().then(gs => {
      if (cancelled) return
      // Mitglied in ≥1 Gruppe → direkt ins Aktivitäts-Log der zuletzt verwendeten Gruppe,
      // außer man will bewusst erstellen/beitreten (?create=1).
      if (!showCreate && gs.length > 0) {
        const last = localStorage.getItem('lastGroupId')
        const target = gs.find(g => g.id === last)?.id ?? gs[0].id
        navigate(`/groups/${target}`, { replace: true })
        return
      }
      setGroups(gs)
      setLoading(false)
    })
    return () => { cancelled = true }
    // Nur beim Mount: Die Redirect-Entscheidung hängt am initialen ?create=1;
    // ein Re-Run bei showCreate-Toggle würde den Nutzer ungewollt wegleiten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setCreating(true)
    setCreateError(null)

    try {
      const groupId = await createGroup(newName.trim(), newDesc.trim() || null)
      navigate(`/groups/${groupId}`)
    } catch (err) {
      setCreateError((err as Error).message)
      setCreating(false)
    }
  }

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setJoining(true)
    setJoinError(null)

    try {
      const groupId = await joinGroup(joinCode.trim())
      if (!groupId) { setJoinError(t('groups.joinError')); setJoining(false); return }
      navigate(`/groups/${groupId}`)
    } catch (err) {
      const msg = (err as Error).message
      setJoinError(msg === 'Gruppe nicht gefunden' ? t('groups.noGroupForCode') : (msg ?? t('groups.joinError')))
      setJoining(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between py-4 mb-6">
        <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm">← {t('common.back')}</button>
        <h1 className="text-xl font-bold text-amber-400">{t('groups.myGroups')}</h1>
        <div />
      </div>

      {/* Gruppen-Liste */}
      {loading ? (
        <div className="flex flex-col gap-3 mb-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-stone-900 rounded-xl p-4 skeleton">
              <div className="h-4 bg-stone-800 rounded w-1/2 mb-2" />
              <div className="h-3 bg-stone-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="text-stone-500 text-center py-8">{t('groups.noGroups')}</p>
      ) : (
        <div className="stagger flex flex-col gap-3 mb-6">
          {groups.map(g => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="press bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
            >
              <p className="font-semibold text-stone-100">{g.name}</p>
              {g.description && <p className="text-sm text-stone-400 mt-0.5">{g.description}</p>}
            </Link>
          ))}
        </div>
      )}

      {/* Gruppe erstellen */}
      <div className="bg-stone-900 rounded-2xl p-5 mb-4">
        <button
          onClick={() => setShowCreate(v => !v)}
          className="w-full text-left font-semibold text-stone-200 flex justify-between items-center"
        >
          <span>{t('groups.createNew')}</span>
          <span className="text-stone-500">{showCreate ? '▲' : '▼'}</span>
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-4">
            <input
              required
              maxLength={60}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={t('groups.groupNamePlaceholder')}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <input
              maxLength={200}
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder={t('groups.descriptionPlaceholder')}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
            {createError && <p className="text-red-400 text-sm">{createError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
            >
              {creating ? t('groups.creating') : t('groups.createGroup')}
            </button>
          </form>
        )}
      </div>

      {/* Per Code beitreten */}
      <div className="bg-stone-900 rounded-2xl p-5">
        <p className="font-semibold text-stone-200 mb-3">{t('groups.joinByCode')}</p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            required
            maxLength={20}
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder={t('groups.inviteCodePlaceholder')}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
          />
          <button
            type="submit"
            disabled={joining}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
          >
            {joining ? '…' : t('groups.join')}
          </button>
        </form>
        {joinError && <p className="text-red-400 text-sm mt-2">{joinError}</p>}
      </div>
    </div>
  )
}
