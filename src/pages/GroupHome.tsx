import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { listWhiskies } from '../lib/queries/drinks'
import { getGroup, listMyGroups, listMembers, removeMember, type Group, type Member } from '../lib/queries/groups'
import { listTastings, createTasting, type Tasting } from '../lib/queries/tastings'
import { listBattles, createBattle, type BattleListItem } from '../lib/queries/battles'
import {
  loadGroupActivity,
  postSession,
  toggleSessionReaction,
  postSessionComment,
  deleteSessionComment,
  type GroupSession,
  type RatingShare,
} from '../lib/queries/sessions'
import { loadGroupArchive, type ArchiveDrink } from '../lib/queries/archive'
import { useAuth } from '../context/AuthContext'
import LoadError from '../components/LoadError'
import GroupSwitcher from '../components/groups/GroupSwitcher'
import ActivityTab, { type Activity } from '../components/groups/ActivityTab'
import ArchiveTab from '../components/groups/ArchiveTab'
import TastingsTab from '../components/groups/TastingsTab'
import BattlesTab from '../components/groups/BattlesTab'
import MembersTab from '../components/groups/MembersTab'

type Tab = 'aktivitaet' | 'archiv' | 'tastings' | 'battles' | 'mitglieder'

export default function GroupHome() {
  const { t, i18n } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [archive, setArchive] = useState<ArchiveDrink[]>([])
  const [tastings, setTastings] = useState<Tasting[]>([])
  const [battles, setBattles] = useState<BattleListItem[]>([])
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [ratingShares, setRatingShares] = useState<RatingShare[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [tab, setTab] = useState<Tab>('aktivitaet')
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [myGroups, setMyGroups] = useState<{ id: string; name: string; description: string | null }[]>([])
  const [allDrinks, setAllDrinks] = useState<{ id: string; name: string }[]>([])

  const load = async (groupId: string) => {
    setLoadError(false)

    try {
      const g = await getGroup(groupId)
      if (g) setGroup(g)
    } catch {
      setLoadError(true)
      return
    }

    listMyGroups().then(setMyGroups)
    listMembers(groupId).then(setMembers)
    listTastings(groupId).then(setTastings)
    listBattles(groupId).then(setBattles)
    listWhiskies().then(setAllDrinks)

    loadArchive(groupId)
    loadActivity(groupId)
  }

  useEffect(() => {
    if (!id) return
    localStorage.setItem('lastGroupId', id)
    setGroup(null)
    setTab('aktivitaet')
    load(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!id) return
    // Realtime-Events kommen in Schüben (z. B. Sessions + ihre Reaktionen/
    // Kommentare gleichzeitig). Statt pro Event ein volles loadActivity() zu
    // feuern, bündeln wir die Aufrufe per Debounce zu einem Reload.
    let timer: ReturnType<typeof setTimeout> | null = null
    const scheduleReload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => loadActivity(id), 400)
    }
    const channel = supabase
      .channel(`group-activity-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drink_sessions', filter: `group_id=eq.${id}` }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_reactions' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_comments' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_ratings', filter: `group_id=eq.${id}` }, scheduleReload)
      .subscribe()
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel) }
  }, [id])

  const loadActivity = async (groupId: string) => {
    const { sessions, ratingShares } = await loadGroupActivity(groupId)
    setSessions(sessions)
    setRatingShares(ratingShares)
    setActivityLoading(false)
  }

  const handlePost = async (drinkId: string, drinkName: string, message: string) => {
    if (!user || !id) return
    await postSession({
      group_id: id,
      user_id: user.id,
      drink_id: drinkId || null,
      drink_name: drinkId ? null : drinkName.trim() || null,
      message: message.trim() || null,
    })
    loadActivity(id)
  }

  const toggleReaction = async (sessionId: string, emoji: string, active: boolean) => {
    if (!user || !id) return
    await toggleSessionReaction(sessionId, user.id, emoji, active)
    loadActivity(id)
  }

  const postComment = async (sessionId: string, body: string) => {
    if (!user || !id) return
    await postSessionComment(sessionId, user.id, body)
    loadActivity(id)
  }

  const deleteComment = async (commentId: string) => {
    if (!id) return
    await deleteSessionComment(commentId)
    loadActivity(id)
  }

  const loadArchive = async (groupId: string) => {
    setArchive(await loadGroupArchive(groupId))
  }

  const handleCreateTasting = async (title: string, eventDate: string | null) => {
    if (!user || !id) return
    const newId = await createTasting({
      group_id: id,
      title,
      hosted_by: user.id,
      event_date: eventDate,
    })
    navigate(`/groups/${id}/tasting/${newId}`)
  }

  const handleCreateBattle = async (drinkIds: string[]) => {
    if (!user || !id) return
    const newId = await createBattle(id, user.id, drinkIds)
    navigate(`/battle/${newId}`)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!id) return
    try {
      await removeMember(id, userId)
    } catch {
      return
    }
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <button onClick={() => navigate('/groups')} className="text-stone-400 hover:text-stone-200 text-sm">← {t('common.back')}</button>
        <LoadError onRetry={() => id && load(id)} />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 py-4 mb-4 animate-pulse">
          <div className="h-4 w-20 bg-stone-800 rounded" />
          <div className="flex-1" />
          <div className="h-8 w-28 bg-stone-800 rounded-lg" />
        </div>
        <div className="h-7 bg-stone-800 rounded w-48 mb-1 animate-pulse" />
        <div className="h-4 bg-stone-800 rounded w-32 mb-4 animate-pulse" />
        <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex-1 h-8 bg-stone-800 rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 animate-pulse">
              <div className="w-6 h-4 bg-stone-800 rounded" />
              <div className="w-14 h-14 bg-stone-800 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-stone-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-stone-800 rounded w-1/2" />
              </div>
              <div className="w-10 h-8 bg-stone-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const memberName = (userId: string) => {
    const m = members.find(x => x.user_id === userId)
    return m?.profiles?.display_name ?? m?.profiles?.username ?? '?'
  }

  const activity: Activity[] = [
    ...sessions.map(s => ({ kind: 'session' as const, ts: s.started_at, session: s })),
    ...ratingShares.map(r => ({ kind: 'rating' as const, ts: r.shared_at, share: r })),
  ].sort((a, b) => b.ts.localeCompare(a.ts))

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* Header */}
      <div className="py-4 mb-1 flex flex-col items-center text-center">
        <button onClick={() => setSwitcherOpen(true)} className="group flex items-center gap-2 max-w-full">
          <h1 className="font-display text-2xl font-semibold text-stone-100 truncate">{group.name}</h1>
          <svg className="w-5 h-5 text-stone-500 group-hover:text-amber-400 flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 9l5-5 5 5M7 15l5 5 5-5" />
          </svg>
        </button>
        {group.description && <p className="text-stone-400 text-sm mt-1">{group.description}</p>}
      </div>

      {/* Gruppen-Wechsler */}
      <GroupSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        groups={myGroups}
        currentId={id}
        onSelect={groupId => { setSwitcherOpen(false); if (groupId !== id) navigate(`/groups/${groupId}`) }}
        onCreateNew={() => { setSwitcherOpen(false); navigate('/groups?create=1') }}
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6">
        {(['aktivitaet', 'archiv', 'tastings', 'battles', 'mitglieder'] as Tab[]).map(tabKey => (
          <button key={tabKey} onClick={() => setTab(tabKey)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              tab === tabKey ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'
            }`}>
            {tabKey === 'aktivitaet' ? t('groups.tabs.activity') : tabKey === 'archiv' ? t('groups.tabs.archive') : tabKey === 'tastings' ? t('groups.tabs.tastings') : tabKey === 'battles' ? t('battle.tab') : t('groups.tabs.members')}
          </button>
        ))}
      </div>

      {tab === 'aktivitaet' && (
        <ActivityTab
          activity={activity}
          loading={activityLoading}
          allDrinks={allDrinks}
          myId={user?.id}
          lang={i18n.language}
          memberName={memberName}
          onPost={handlePost}
          onToggleReaction={toggleReaction}
          onPostComment={postComment}
          onDeleteComment={deleteComment}
        />
      )}

      {tab === 'archiv' && <ArchiveTab archive={archive} />}

      {tab === 'tastings' && id && (
        <TastingsTab groupId={id} tastings={tastings} onCreate={handleCreateTasting} />
      )}

      {tab === 'battles' && (
        <BattlesTab battles={battles} allDrinks={allDrinks} onCreate={handleCreateBattle} />
      )}

      {tab === 'mitglieder' && (
        <MembersTab members={members} group={group} currentUserId={user?.id} onRemoveMember={handleRemoveMember} />
      )}
    </div>
  )
}
