import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

type Tab = 'archiv' | 'tastings' | 'mitglieder'

export default function GroupHome() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [archive, setArchive] = useState<ArchiveDrink[]>([])
  const [tastings, setTastings] = useState<Tasting[]>([])
  const [tab, setTab] = useState<Tab>('archiv')
  const [copied, setCopied] = useState(false)
  const [showNewTasting, setShowNewTasting] = useState(false)
  const [tastingTitle, setTastingTitle] = useState('')
  const [tastingDate, setTastingDate] = useState('')
  const [creatingTasting, setCreatingTasting] = useState(false)

  useEffect(() => {
    if (!id) return

    supabase.from('groups').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setGroup(data) })

    supabase.from('group_members')
      .select('user_id, role, joined_at, profiles(username, display_name)')
      .eq('group_id', id)
      .then(({ data }) => { setMembers((data as unknown as Member[]) ?? []) })

    supabase.from('tastings').select('*').eq('group_id', id).order('created_at', { ascending: false })
      .then(({ data }) => { setTastings(data ?? []) })

    loadArchive(id)
  }, [id])

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
        {(['archiv', 'tastings', 'mitglieder'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
              tab === t ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'
            }`}>
            {t === 'archiv' ? 'Archiv' : t === 'tastings' ? 'Tastings' : 'Mitglieder'}
          </button>
        ))}
      </div>

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
              <div>
                <p className="font-medium text-stone-200">
                  {m.profiles?.display_name ?? m.profiles?.username}
                </p>
                <p className="text-xs text-stone-500">@{m.profiles?.username}</p>
              </div>
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

          {/* Einladen-Hinweis */}
          <div className="mt-4 bg-stone-900 rounded-xl p-4 text-center">
            <p className="text-stone-400 text-sm mb-2">Neue Mitglieder einladen</p>
            <button
              onClick={copyInviteCode}
              className="bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg px-4 py-2 text-sm font-mono"
            >
              {copied ? '✓ Kopiert!' : `Code kopieren: ${group.invite_code}`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
