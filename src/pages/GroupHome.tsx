import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ReactionBar, CommentSection, type SessionReaction, type SessionComment } from '../components/SessionSocial'

interface Group {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
}

interface Member {
  user_id: string
  role: string
  joined_at: string
  profiles: { username: string; display_name: string | null }
}

interface GroupSession {
  id: string
  user_id: string
  drink_id: string | null
  drink_name: string | null
  message: string | null
  started_at: string
  profiles: { display_name: string | null; username: string } | null
  drinks: { name: string } | null
  session_reactions: SessionReaction[]
  session_comments: SessionComment[]
}

interface RatingShare {
  rating_id: string
  shared_at: string
  shared_by: string
  ratings: { overall: number | null; drinks: { id: string; name: string; photo_url: string | null } | null } | null
}

type Activity =
  | { kind: 'session'; ts: string; session: GroupSession }
  | { kind: 'rating'; ts: string; share: RatingShare }

interface ArchiveDrink {
  id: string
  name: string
  producer: string | null
  photo_url: string | null
  scores: number[]   // alle overall-Werte aus group_ratings + tasting_ratings
}

interface Tasting {
  id: string
  title: string
  status: string
  event_date: string | null
  hosted_by: string
}

type Tab = 'aktivitaet' | 'archiv' | 'tastings' | 'mitglieder'

export default function GroupHome() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [archive, setArchive] = useState<ArchiveDrink[]>([])
  const [tastings, setTastings] = useState<Tasting[]>([])
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [ratingShares, setRatingShares] = useState<RatingShare[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('aktivitaet')
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showNewTasting, setShowNewTasting] = useState(false)
  const [tastingTitle, setTastingTitle] = useState('')
  const [tastingDate, setTastingDate] = useState('')
  const [creatingTasting, setCreatingTasting] = useState(false)

  // "Ich trinke gerade" posting
  const [allDrinks, setAllDrinks] = useState<{ id: string; name: string }[]>([])
  const [showPost, setShowPost] = useState(false)
  const [sessionDrinkId, setSessionDrinkId] = useState('')
  const [sessionDrinkName, setSessionDrinkName] = useState('')
  const [sessionMessage, setSessionMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    localStorage.setItem('lastGroupId', id)

    supabase.from('groups').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setGroup(data) })

    supabase.from('group_members')
      .select('user_id, role, joined_at, profiles(username, display_name)')
      .eq('group_id', id)
      .then(({ data }) => { setMembers((data as unknown as Member[]) ?? []) })

    supabase.from('tastings').select('*').eq('group_id', id).order('created_at', { ascending: false })
      .then(({ data }) => { setTastings(data ?? []) })

    supabase.from('drinks').select('id, name').eq('category', 'whisky').order('name')
      .then(({ data }) => setAllDrinks(data ?? []))

    loadArchive(id)
    loadActivity(id)
  }, [id])

  useEffect(() => {
    if (!id) return
    const channel = supabase
      .channel(`group-activity-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drink_sessions', filter: `group_id=eq.${id}` }, () => loadActivity(id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_reactions' }, () => loadActivity(id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'session_comments' }, () => loadActivity(id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_ratings', filter: `group_id=eq.${id}` }, () => loadActivity(id))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  const loadActivity = async (groupId: string) => {
    const [{ data: sData }, { data: rData }] = await Promise.all([
      supabase
        .from('drink_sessions')
        .select('id, user_id, drink_id, drink_name, message, started_at, profiles(display_name, username), drinks(name), session_reactions(emoji, user_id), session_comments(id, body, created_at, user_id, profiles(display_name, username))')
        .eq('group_id', groupId)
        .order('started_at', { ascending: false }),
      supabase
        .from('group_ratings')
        .select('rating_id, shared_at, shared_by, ratings(overall, drinks(id, name, photo_url))')
        .eq('group_id', groupId)
        .order('shared_at', { ascending: false }),
    ])
    setSessions((sData as unknown as GroupSession[]) ?? [])
    setRatingShares((rData as unknown as RatingShare[]) ?? [])
    setActivityLoading(false)
  }

  const handlePost = async () => {
    if (!user || !id) return
    setPosting(true)
    setPostError(null)
    const { error } = await supabase.from('drink_sessions').insert({
      group_id: id,
      user_id: user.id,
      drink_id: sessionDrinkId || null,
      drink_name: sessionDrinkId ? null : sessionDrinkName.trim() || null,
      message: sessionMessage.trim() || null,
    })
    setPosting(false)
    if (error) {
      setPostError('Konnte nicht geteilt werden: ' + error.message)
      return
    }
    setShowPost(false)
    setSessionDrinkId(''); setSessionDrinkName(''); setSessionMessage('')
    loadActivity(id)
  }

  const toggleReaction = async (sessionId: string, emoji: string, active: boolean) => {
    if (!user || !id) return
    if (active) {
      await supabase.from('session_reactions').delete()
        .eq('session_id', sessionId).eq('user_id', user.id).eq('emoji', emoji)
    } else {
      await supabase.from('session_reactions').insert({ session_id: sessionId, user_id: user.id, emoji })
    }
    loadActivity(id)
  }

  const postComment = async (sessionId: string, body: string) => {
    if (!user || !id) return
    await supabase.from('session_comments').insert({ session_id: sessionId, user_id: user.id, body })
    loadActivity(id)
  }

  const deleteComment = async (commentId: string) => {
    if (!id) return
    await supabase.from('session_comments').delete().eq('id', commentId)
    loadActivity(id)
  }

  const loadArchive = async (groupId: string) => {
    // Quelle 1: via group_ratings geteilte Bewertungen
    const { data: grData } = await supabase
      .from('group_ratings')
      .select('ratings(overall, drinks(id, name, producer, photo_url))')
      .eq('group_id', groupId)

    // Quelle 2: Tasting-IDs dieser Gruppe holen, dann tasting_drinks + tasting_ratings
    const { data: tastingRows } = await supabase
      .from('tastings')
      .select('id')
      .eq('group_id', groupId)

    const tastingIds = (tastingRows ?? []).map(t => t.id)

    let tdData: { drink_id: string; drinks: { id: string; name: string; producer: string | null; photo_url: string | null } }[] = []
    let trData: { drink_id: string; overall: number | null }[] = []

    if (tastingIds.length > 0) {
      const { data: td } = await supabase
        .from('tasting_drinks')
        .select('drink_id, drinks(id, name, producer, photo_url)')
        .in('tasting_id', tastingIds)
      tdData = (td as unknown as typeof tdData) ?? []

      const { data: tr } = await supabase
        .from('tasting_ratings')
        .select('drink_id, overall')
        .in('tasting_id', tastingIds)
      trData = tr ?? []
    }

    // Alle Drinks zusammenführen — Map by drink_id
    const map = new Map<string, ArchiveDrink>()

    const addDrink = (d: { id: string; name: string; producer: string | null; photo_url: string | null }) => {
      if (!map.has(d.id)) map.set(d.id, { id: d.id, name: d.name, producer: d.producer, photo_url: d.photo_url, scores: [] })
    }

    // group_ratings
    for (const gr of grData ?? []) {
      const r = gr.ratings as unknown as { overall: number | null; drinks: { id: string; name: string; producer: string | null; photo_url: string | null } }
      if (!r?.drinks) continue
      addDrink(r.drinks)
      if (r.overall != null) map.get(r.drinks.id)!.scores.push(r.overall)
    }

    // tasting_drinks (stellt sicher dass auch unbewertete Whiskys erscheinen)
    for (const td of tdData) {
      if (td.drinks) addDrink(td.drinks)
    }

    // tasting_ratings scores hinzufügen
    for (const tr of trData) {
      if (tr.overall != null && map.has(tr.drink_id)) {
        map.get(tr.drink_id)!.scores.push(tr.overall)
      }
    }

    // Nach Durchschnitt sortieren
    const sorted = Array.from(map.values()).sort((a, b) => {
      const avgA = a.scores.length ? a.scores.reduce((s, v) => s + v, 0) / a.scores.length : -1
      const avgB = b.scores.length ? b.scores.reduce((s, v) => s + v, 0) / b.scores.length : -1
      return avgB - avgA
    })

    setArchive(sorted)
  }

  const handleCreateTasting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !id) return
    setCreatingTasting(true)
    const { data, error } = await supabase.from('tastings').insert({
      group_id: id,
      title: tastingTitle.trim(),
      hosted_by: user.id,
      event_date: tastingDate || null,
      status: 'open',
    }).select('id').single()
    setCreatingTasting(false)
    if (!error && data) navigate(`/groups/${id}/tasting/${data.id}`)
  }

  const handleRemoveMember = async (userId: string) => {
    if (!id) return
    await supabase.from('group_members').delete().eq('group_id', id).eq('user_id', userId)
    setMembers(prev => prev.filter(m => m.user_id !== userId))
  }

  const copyInviteCode = () => {
    if (!group) return
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareInvite = async () => {
    if (!group) return
    const url = `${window.location.origin}/join/${group.invite_code}`
    const shareData = {
      title: `Cask Lounge – ${group.name}`,
      text: `Tritt meiner Whisky-Gruppe „${group.name}" auf Cask Lounge bei:`,
      url,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* Abbruch durch Nutzer */ }
    } else {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
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
      <div className="flex items-center gap-3 py-4 mb-4">
        <button onClick={() => navigate('/groups')} className="text-stone-400 hover:text-stone-200 text-sm">← Gruppen</button>
        <div className="flex-1" />
        <button
          onClick={copyInviteCode}
          className="text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg px-3 py-1.5 font-mono"
        >
          {copied ? '✓ Kopiert!' : `Code: ${group.invite_code}`}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-stone-100 mb-1">{group.name}</h1>
      {group.description && <p className="text-stone-400 text-sm mb-4">{group.description}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6">
        {(['aktivitaet', 'archiv', 'tastings', 'mitglieder'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              tab === t ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'
            }`}>
            {t === 'aktivitaet' ? 'Aktivität' : t === 'archiv' ? 'Archiv' : t === 'tastings' ? 'Tastings' : 'Mitglieder'}
          </button>
        ))}
      </div>

      {/* Aktivität */}
      {tab === 'aktivitaet' && (
        <div className="flex flex-col gap-4">
          <button onClick={() => { setPostError(null); setShowPost(true) }}
            className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl py-3 text-lg">
            🥃 Ich trinke gerade…
          </button>

          {activityLoading ? (
            <p className="text-stone-500 text-center py-8 animate-pulse">Lädt…</p>
          ) : activity.length === 0 ? (
            <p className="text-stone-500 text-center py-8">
              Noch keine Aktivität.
              <br />
              <span className="text-sm">Teile, was du gerade trinkst, oder eine Bewertung.</span>
            </p>
          ) : (
            activity.map(a => a.kind === 'session' ? (
              <div key={`s-${a.session.id}`} className="bg-stone-900 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🥃</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-100">
                      <Link to={`/user/${a.session.user_id}`} className="hover:text-amber-400 transition-colors">
                        {a.session.profiles?.display_name ?? a.session.profiles?.username ?? '?'}
                      </Link> trinkt gerade
                    </p>
                    <p className="text-amber-400 font-medium">
                      {a.session.drinks?.name ?? a.session.drink_name ?? '—'}
                    </p>
                    {a.session.message && <p className="text-stone-400 text-sm mt-1">„{a.session.message}"</p>}
                    <p className="text-stone-600 text-xs mt-1">
                      {new Date(a.session.started_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <ReactionBar reactions={a.session.session_reactions} myId={user?.id} onToggle={(emoji, active) => toggleReaction(a.session.id, emoji, active)} />
                    <CommentSection
                      comments={a.session.session_comments}
                      myId={user?.id}
                      onPost={body => postComment(a.session.id, body)}
                      onDelete={deleteComment}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={`r-${a.share.rating_id}`}
                to={a.share.ratings?.drinks ? `/whisky/${a.share.ratings.drinks.id}` : '#'}
                className="flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
              >
                <span className="text-2xl">⭐</span>
                {a.share.ratings?.drinks?.photo_url ? (
                  <img src={a.share.ratings.drinks.photo_url} alt={a.share.ratings.drinks.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🥃</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-stone-100 text-sm">
                    <span className="font-semibold">{memberName(a.share.shared_by)}</span> teilte eine Bewertung
                  </p>
                  <p className="text-amber-400 font-medium truncate">{a.share.ratings?.drinks?.name ?? '—'}</p>
                  <p className="text-stone-600 text-xs mt-0.5">
                    {new Date(a.share.shared_at).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {a.share.ratings?.overall != null && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-amber-400">{a.share.ratings.overall}</p>
                    <p className="text-xs text-stone-500">/10</p>
                  </div>
                )}
              </Link>
            ))
          )}

          {/* Post-Dialog */}
          {showPost && (
            <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50 p-4">
              <div className="bg-stone-900 rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4">
                <h3 className="text-lg font-bold text-stone-100">Was trinkst du gerade?</h3>

                <div>
                  <label className="text-sm text-stone-400 mb-1 block">Whisky aus Katalog wählen</label>
                  <select value={sessionDrinkId} onChange={e => { setSessionDrinkId(e.target.value); setSessionDrinkName('') }}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500">
                    <option value="">— oder frei eingeben ↓</option>
                    {allDrinks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                {!sessionDrinkId && (
                  <div>
                    <label className="text-sm text-stone-400 mb-1 block">Oder Name frei eingeben</label>
                    <input value={sessionDrinkName} onChange={e => setSessionDrinkName(e.target.value)}
                      placeholder="z. B. Lagavulin 16"
                      className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
                  </div>
                )}

                <div>
                  <label className="text-sm text-stone-400 mb-1 block">Nachricht (optional)</label>
                  <input value={sessionMessage} onChange={e => setSessionMessage(e.target.value)}
                    placeholder="z. B. Endlich geöffnet! 🎉"
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
                </div>

                {postError && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{postError}</p>}

                <div className="flex gap-3">
                  <button onClick={handlePost} disabled={posting || (!sessionDrinkId && !sessionDrinkName.trim())}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3">
                    {posting ? 'Wird gesendet…' : 'Teilen 🥃'}
                  </button>
                  <button onClick={() => { setShowPost(false); setPostError(null) }}
                    className="bg-stone-800 text-stone-300 rounded-xl px-4">
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Archiv */}
      {tab === 'archiv' && (
        <div className="flex flex-col gap-3">
          {archive.length === 0 ? (
            <p className="text-stone-500 text-center py-8">
              Noch keine Whiskys im Archiv.
              <br />
              <span className="text-sm">Bewertungen teilen oder ein Tasting durchführen.</span>
            </p>
          ) : (
            archive.map((drink, i) => {
              const avg = drink.scores.length
                ? Math.round(drink.scores.reduce((s, v) => s + v, 0) / drink.scores.length * 10) / 10
                : null
              return (
                <Link
                  key={drink.id}
                  to={`/whisky/${drink.id}`}
                  className="flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
                >
                  <span className="text-stone-600 font-mono text-sm w-5 text-center">{i + 1}</span>
                  {drink.photo_url ? (
                    <img src={drink.photo_url} alt={drink.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-100 truncate">{drink.name}</p>
                    {drink.producer && <p className="text-sm text-stone-400 truncate">{drink.producer}</p>}
                    <p className="text-xs text-stone-600 mt-0.5">
                      {drink.scores.length} Bewertung{drink.scores.length !== 1 ? 'en' : ''}
                    </p>
                  </div>
                  {avg != null ? (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-amber-400">{avg}</p>
                      <p className="text-xs text-stone-500">/10</p>
                    </div>
                  ) : (
                    <span className="text-stone-600 text-sm">—</span>
                  )}
                </Link>
              )
            })
          )}
        </div>
      )}

      {/* Tastings */}
      {tab === 'tastings' && (
        <div className="flex flex-col gap-3">
          {tastings.map(t => (
            <Link
              key={t.id}
              to={`/groups/${id}/tasting/${t.id}`}
              className="flex items-center justify-between bg-stone-900 hover:bg-stone-800 rounded-xl px-4 py-3 transition-colors"
            >
              <div>
                <p className="font-semibold text-stone-100">{t.title}</p>
                {t.event_date && <p className="text-xs text-stone-500 mt-0.5">{t.event_date}</p>}
              </div>
              <span className={`text-xs rounded-full px-3 py-1 ${t.status === 'closed' ? 'bg-stone-700 text-stone-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {t.status === 'closed' ? 'Abgeschlossen' : 'Offen'}
              </span>
            </Link>
          ))}

          {/* Neues Tasting erstellen */}
          <div className="bg-stone-900 rounded-2xl p-5 mt-2">
            <button
              onClick={() => setShowNewTasting(v => !v)}
              className="w-full text-left font-semibold text-stone-200 flex justify-between items-center"
            >
              <span>+ Neues Tasting</span>
              <span className="text-stone-500">{showNewTasting ? '▲' : '▼'}</span>
            </button>
            {showNewTasting && (
              <form onSubmit={handleCreateTasting} className="flex flex-col gap-3 mt-4">
                <input
                  required
                  value={tastingTitle}
                  onChange={e => setTastingTitle(e.target.value)}
                  placeholder="Titel (z. B. Islay Night)"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="date"
                  value={tastingDate}
                  onChange={e => setTastingDate(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={creatingTasting}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5"
                >
                  {creatingTasting ? 'Wird erstellt…' : 'Tasting erstellen'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Mitglieder */}
      {tab === 'mitglieder' && (
        <div className="flex flex-col gap-2">
          {members.map(m => (
            <div key={m.user_id} className="flex items-center justify-between bg-stone-900 rounded-xl px-4 py-3">
              <Link to={`/user/${m.user_id}`} className="min-w-0">
                <p className="font-medium text-stone-200 hover:text-amber-400 transition-colors truncate">
                  {m.profiles?.display_name ?? m.profiles?.username}
                </p>
                <p className="text-xs text-stone-500 truncate">@{m.profiles?.username}</p>
              </Link>
              <div className="flex items-center gap-2">
                {m.user_id === group.owner_id && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 rounded px-2 py-0.5">Owner</span>
                )}
                {m.role === 'admin' && m.user_id !== group.owner_id && (
                  <span className="text-xs bg-stone-700 text-stone-300 rounded px-2 py-0.5">Admin</span>
                )}
                {user?.id === group.owner_id && m.user_id !== group.owner_id && (
                  <button
                    onClick={() => handleRemoveMember(m.user_id)}
                    className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 rounded px-2 py-0.5 transition-colors"
                  >
                    Entfernen
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Einladen */}
          <div className="mt-4 bg-stone-900 rounded-xl p-4 text-center">
            <p className="text-stone-400 text-sm mb-3">Neue Mitglieder einladen</p>
            <button
              onClick={shareInvite}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors mb-2"
            >
              {linkCopied ? '✓ Link kopiert!' : 'Einladungslink teilen'}
            </button>
            <button
              onClick={copyInviteCode}
              className="text-stone-500 hover:text-stone-300 text-xs font-mono"
            >
              {copied ? '✓ Code kopiert!' : `Oder Code kopieren: ${group.invite_code}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
