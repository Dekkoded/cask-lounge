import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Drink, Rating } from '../lib/types'
import WheelStepper from '../components/WheelStepper'
import ColorPicker from '../components/ColorPicker'
import { amazonSearchUrl } from '../lib/affiliate'

const EMPTY_WHEELS = { nose: Array(12).fill(0), taste: Array(12).fill(0) }

interface Group { id: string; name: string }
interface PublicRating extends Rating {
  profiles: { display_name: string | null; username: string }
}

type Tab = 'uebersicht' | 'bewertung'

export default function WhiskyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  const [drink, setDrink] = useState<Drink | null>(null)
  const [myRating, setMyRating] = useState<Rating | null>(null)
  const [publicRatings, setPublicRatings] = useState<PublicRating[]>([])
  const [tab, setTab] = useState<Tab>('uebersicht')

  // Formular-State
  const [nose, setNose] = useState<number>(5)
  const [taste, setTaste] = useState<number>(5)
  const [finish, setFinish] = useState<number>(5)
  const [colorIdx, setColorIdx] = useState<number | null>(null)
  const [wheels, setWheels] = useState(EMPTY_WHEELS)
  const [note, setNote] = useState('')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingRating, setDeletingRating] = useState(false)
  const [deletingDrink, setDeletingDrink] = useState(false)
  const [confirmDeleteDrink, setConfirmDeleteDrink] = useState(false)
  const [othersRated, setOthersRated] = useState(false)

  // Teilen-State
  const [groups, setGroups] = useState<Group[]>([])
  const [sharedGroups, setSharedGroups] = useState<Set<string>>(new Set())
  const [shareMsg, setShareMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    supabase.from('drinks').select('*').eq('id', id).single()
      .then(({ data }) => { if (data) setDrink(data) })

    supabase.from('ratings')
      .select('*, profiles(display_name, username)')
      .eq('drink_id', id)
      .eq('is_public', true)
      .order('overall', { ascending: false })
      .then(({ data }) => { setPublicRatings((data as unknown as PublicRating[]) ?? []) })

    if (user) {
      supabase.from('ratings').select('*')
        .eq('drink_id', id).eq('user_id', user.id).maybeSingle()
        .then(({ data }) => {
          if (data) {
            setMyRating(data)
            setNose(data.nose ?? 5)
            setTaste(data.taste ?? 5)
            setFinish(data.finish ?? 5)
            setColorIdx(data.color_idx)
            setWheels(data.wheels ?? EMPTY_WHEELS)
            setNote(data.note ?? '')
            setPurchasePrice(data.purchase_price != null ? String(data.purchase_price) : '')
            setIsPublic(data.is_public)
          }
        })

      supabase.from('groups').select('id, name')
        .then(({ data }) => setGroups(data ?? []))

      supabase.from('ratings').select('id', { count: 'exact', head: true })
        .eq('drink_id', id).neq('user_id', user.id)
        .then(({ count }) => setOthersRated((count ?? 0) > 0))
    }
  }, [id, user])

  useEffect(() => {
    if (!myRating) return
    supabase.from('group_ratings').select('group_id').eq('rating_id', myRating.id)
      .then(({ data }) => {
        setSharedGroups(new Set((data ?? []).map(r => r.group_id)))
      })
  }, [myRating])

  const toggleShare = async (groupId: string) => {
    if (!myRating || !user) return
    if (sharedGroups.has(groupId)) {
      await supabase.from('group_ratings')
        .delete().eq('group_id', groupId).eq('rating_id', myRating.id)
      setSharedGroups(s => { const n = new Set(s); n.delete(groupId); return n })
      setShareMsg('Aus Gruppe entfernt.')
    } else {
      const { error } = await supabase.from('group_ratings').insert({
        group_id: groupId,
        rating_id: myRating.id,
        shared_by: user.id,
      })
      if (error) { setShareMsg('Fehler: ' + error.message); return }
      setSharedGroups(s => new Set(s).add(groupId))
      setShareMsg('In Gruppe geteilt!')
    }
    setTimeout(() => setShareMsg(null), 2000)
  }

  const updateWheel = (type: 'nose' | 'taste') => (i: number, v: number) => {
    setWheels(w => ({
      ...w,
      [type]: w[type].map((old, idx) => idx === i ? v : old),
    }))
  }

  const handleSave = async () => {
    if (!user || !id) return
    setSaving(true)
    setError(null)

    const overall = Math.round(((nose + taste + finish) / 3) * 10) / 10

    const payload = {
      drink_id: id,
      user_id: user.id,
      nose, taste, finish, overall,
      color_idx: colorIdx,
      wheels,
      note: note.trim() || null,
      purchase_price: purchasePrice ? parseFloat(purchasePrice) : null,
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from('ratings').upsert(payload, {
      onConflict: 'drink_id,user_id',
    }).select('*').single()

    setSaving(false)
    if (error) { setError(error.message); return }

    if (data) setMyRating(data)
    setSaved(true)

    // Öffentliche Ratings neu laden
    supabase.from('ratings')
      .select('*, profiles(display_name, username)')
      .eq('drink_id', id)
      .eq('is_public', true)
      .order('overall', { ascending: false })
      .then(({ data }) => { setPublicRatings((data as unknown as PublicRating[]) ?? []) })

    setTimeout(() => {
      setSaved(false)
      setTab('uebersicht')
    }, 1200)
  }

  const handleDeleteRating = async () => {
    if (!myRating) return
    setDeletingRating(true)
    setError(null)
    await supabase.from('group_ratings').delete().eq('rating_id', myRating.id)
    const { error } = await supabase.from('ratings').delete().eq('id', myRating.id)
    setDeletingRating(false)
    if (error) { setError('Löschen fehlgeschlagen: ' + error.message); return }
    setMyRating(null)
    setNose(5); setTaste(5); setFinish(5); setColorIdx(null)
    setWheels(EMPTY_WHEELS); setNote(''); setIsPublic(true)
    setSharedGroups(new Set())
    setPublicRatings(prev => prev.filter(r => r.id !== myRating.id))
    setTab('uebersicht')
  }

  const handleDeleteDrink = async () => {
    if (!drink) return
    if (othersRated && !isAdmin) return
    setDeletingDrink(true)
    setError(null)
    const { data: rids } = await supabase.from('ratings').select('id').eq('drink_id', drink.id)
    const ids = (rids ?? []).map(r => r.id)
    if (ids.length) {
      await supabase.from('group_ratings').delete().in('rating_id', ids)
      await supabase.from('ratings').delete().in('id', ids)
    }
    const { error } = await supabase.from('drinks').delete().eq('id', drink.id)
    setDeletingDrink(false)
    if (error) { setError('Whisky konnte nicht gelöscht werden: ' + error.message); return }
    navigate('/')
  }

  if (!drink) {
    return (
      <div className="max-w-2xl mx-auto p-6 pb-24">
        <div className="h-4 w-20 bg-stone-800 rounded mb-6 animate-pulse" />
        <div className="flex gap-4 mb-8 animate-pulse">
          <div className="w-24 h-24 bg-stone-800 rounded-xl flex-shrink-0" />
          <div className="flex-1">
            <div className="h-7 bg-stone-800 rounded w-48 mb-2" />
            <div className="h-4 bg-stone-800 rounded w-32 mb-2" />
            <div className="h-3 bg-stone-800 rounded w-40" />
          </div>
        </div>
        <div className="bg-stone-900 rounded-2xl p-6 flex flex-col gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-stone-800 rounded w-24 mb-2" />
              <div className="h-2 bg-stone-800 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const avgOverall = publicRatings.length
    ? Math.round(publicRatings.reduce((s, r) => s + (r.overall ?? 0), 0) / publicRatings.length * 10) / 10
    : null

  return (
    <div className="max-w-2xl mx-auto p-6 pb-24">
      <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">
        ← Zurück
      </button>

      {/* Whisky-Header */}
      <div className="flex gap-4 mb-6">
        {drink.photo_url ? (
          <img src={drink.photo_url} alt={drink.name} className="w-24 h-24 object-cover rounded-xl flex-shrink-0" />
        ) : (
          <div className="w-24 h-24 bg-stone-800 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">🥃</div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-stone-100">{drink.name}</h1>
          {drink.producer && <p className="text-stone-400">{drink.producer}</p>}
          <div className="flex gap-3 mt-1 text-sm text-stone-500 flex-wrap">
            {drink.region && <span>{drink.region}</span>}
            {drink.age_years && <span>{drink.age_years} Jahre</span>}
            {drink.abv && <span>{drink.abv}%</span>}
          </div>
          {avgOverall != null && (
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-400">{avgOverall}</span>
              <span className="text-stone-500 text-sm">/10 · {publicRatings.length} Bewertung{publicRatings.length !== 1 ? 'en' : ''}</span>
            </div>
          )}
        </div>
      </div>

      {/* Auf Amazon suchen */}
      <a
        href={amazonSearchUrl(`${drink.name} ${drink.producer ?? ''} Whisky`)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="flex items-center justify-center gap-2 w-full bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 rounded-xl py-2.5 text-sm font-medium transition-colors mb-6"
      >
        🛒 Auf Amazon suchen
      </a>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6">
        <button onClick={() => setTab('uebersicht')}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'uebersicht' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
          Übersicht
        </button>
        {user && (
          <button onClick={() => setTab('bewertung')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${tab === 'bewertung' ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            {myRating ? 'Meine Bewertung' : '+ Bewerten'}
          </button>
        )}
      </div>

      {/* Übersicht */}
      {tab === 'uebersicht' && (
        <div className="flex flex-col gap-3">
          {publicRatings.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-stone-500 mb-3">Noch keine öffentlichen Bewertungen.</p>
              {user ? (
                <button onClick={() => setTab('bewertung')}
                  className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2 text-sm">
                  Als Erster bewerten
                </button>
              ) : (
                <a href="/login" className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2 text-sm inline-block">
                  Anmelden zum Bewerten
                </a>
              )}
            </div>
          ) : (
            publicRatings.map(r => (
              <div key={r.id} className="bg-stone-900 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Link to={`/user/${r.user_id}`} className="font-semibold text-stone-200 hover:text-amber-400 transition-colors">
                      {r.profiles?.display_name ?? r.profiles?.username ?? 'Anonym'}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {new Date(r.updated_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-amber-400">{r.overall}</span>
                </div>
                <div className="flex gap-4 text-sm text-stone-400 mb-2">
                  {r.nose != null && <span>Nase <strong className="text-stone-300">{r.nose}</strong></span>}
                  {r.taste != null && <span>Geschmack <strong className="text-stone-300">{r.taste}</strong></span>}
                  {r.finish != null && <span>Abgang <strong className="text-stone-300">{r.finish}</strong></span>}
                </div>
                {r.note && (
                  <p className="text-stone-400 text-sm italic border-l-2 border-amber-500/40 pl-3">
                    „{r.note}"
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Meine Bewertung */}
      {tab === 'bewertung' && (
        <div className="bg-stone-900 rounded-2xl p-6 flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-stone-200">
            {myRating ? 'Bewertung bearbeiten' : 'Bewertung abgeben'}
          </h2>

          {/* Noten */}
          <div className="flex flex-col gap-4">
            {(['nose', 'taste', 'finish'] as const).map(key => {
              const val = key === 'nose' ? nose : key === 'taste' ? taste : finish
              const setter = key === 'nose' ? setNose : key === 'taste' ? setTaste : setFinish
              const label = key === 'nose' ? 'Nase' : key === 'taste' ? 'Geschmack' : 'Abgang'
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-300">{label}</span>
                    <span className="text-amber-400 font-bold">{val}/10</span>
                  </div>
                  <input
                    type="range" min="1" max="10" value={val}
                    onChange={e => setter(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              )
            })}
            <div className="text-center text-stone-400 text-sm">
              Gesamtnote: <span className="text-amber-400 font-bold text-lg">{((nose + taste + finish) / 3).toFixed(1)}</span>
            </div>
          </div>

          <ColorPicker value={colorIdx} onChange={setColorIdx} />
          <WheelStepper wheels={wheels} onUpdate={updateWheel} />

          <div>
            <label className="block text-sm text-stone-300 mb-1">Notiz (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
              placeholder="Torfig, leicht salzig, langer Abgang…"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Kaufpreis (€, optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="z. B. 65"
            />
            <p className="text-stone-600 text-xs mt-1">Nur für dich sichtbar – fließt in deinen Sammlungswert ein.</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setIsPublic(p => !p)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-amber-500' : 'bg-stone-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPublic ? 'left-7' : 'left-1'}`} />
            </div>
            <span className="text-sm text-stone-300">Öffentlich zeigen</span>
          </label>

          {error && (
            <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-3 transition-colors"
          >
            {saving ? 'Wird gespeichert…' : saved ? '✓ Gespeichert!' : 'Bewertung speichern'}
          </button>

          {/* In Gruppe teilen */}
          {myRating && groups.length > 0 && (
            <div className="border-t border-stone-800 pt-4">
              <p className="text-sm font-medium text-stone-300 mb-3">Bewertung in Gruppe teilen</p>
              <div className="flex flex-col gap-2">
                {groups.map(g => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleShare(g.id)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-colors ${
                      sharedGroups.has(g.id)
                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                    }`}
                  >
                    <span>{g.name}</span>
                    <span>{sharedGroups.has(g.id) ? '✓ Geteilt' : 'Teilen'}</span>
                  </button>
                ))}
              </div>
              {shareMsg && <p className="text-amber-400 text-sm mt-2">{shareMsg}</p>}
            </div>
          )}

          {myRating && (
            <button
              onClick={handleDeleteRating}
              disabled={deletingRating}
              className="text-red-500 hover:text-red-400 disabled:opacity-50 text-sm text-center py-2 transition-colors"
            >
              {deletingRating ? 'Wird gelöscht…' : 'Meine Bewertung löschen'}
            </button>
          )}
        </div>
      )}

      {/* Whisky verwalten (Ersteller solange ungeteilt, Admin immer) */}
      {user && (isAdmin || drink.created_by === user.id) && (
        <div className="mt-6 flex flex-col gap-3">
          {isAdmin && <p className="text-amber-500/70 text-xs">Admin-Modus</p>}

          {(isAdmin || !othersRated) && (
            <button onClick={() => navigate(`/whisky/${drink.id}/edit`)}
              className="text-stone-400 hover:text-stone-200 text-sm text-left transition-colors">
              Whisky bearbeiten
            </button>
          )}

          {othersRated && !isAdmin ? (
            <p className="text-stone-600 text-xs">
              Dieser Whisky wurde bereits von anderen bewertet und kann daher nicht mehr bearbeitet oder gelöscht werden.
            </p>
          ) : !confirmDeleteDrink ? (
            <button onClick={() => setConfirmDeleteDrink(true)}
              className="text-red-500 hover:text-red-400 text-sm text-left transition-colors">
              Diesen Whisky löschen
            </button>
          ) : (
            <div className="bg-red-950 border border-red-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-red-300 text-sm font-medium">Whisky samt aller Bewertungen löschen? Das kann nicht rückgängig gemacht werden.</p>
              <div className="flex gap-2">
                <button onClick={handleDeleteDrink} disabled={deletingDrink}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm">
                  {deletingDrink ? 'Wird gelöscht…' : 'Ja, löschen'}
                </button>
                <button onClick={() => setConfirmDeleteDrink(false)} disabled={deletingDrink}
                  className="flex-1 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-200 rounded-lg px-4 py-2 text-sm">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
