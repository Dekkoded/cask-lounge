import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { listWhiskyOptions, createDrink } from '../lib/queries/drinks'
import { useAuth } from '../context/AuthContext'
import WheelStepper from '../components/WheelStepper'
import AromaTags from '../components/AromaTags'
import { thumbUrl } from '../lib/image'
import LoadError from '../components/LoadError'

const EMPTY_WHEELS: { nose: number[]; taste: number[]; aromas: string[]; extra: string[] } = {
  nose: Array(12).fill(0),
  taste: Array(12).fill(0),
  aromas: [],
  extra: [],
}

interface Tasting {
  id: string
  title: string
  status: string
  hosted_by: string
  group_id: string
  event_date: string | null
}

interface TastingDrink {
  drink_id: string
  position: number
  drinks: { id: string; name: string; producer: string | null; photo_url: string | null }
}

interface TastingRating {
  id: string
  drink_id: string
  user_id: string
  nose: number | null
  taste: number | null
  finish: number | null
  overall: number | null
  wheels: { nose: number[]; taste: number[]; aromas?: string[]; extra?: string[] }
  note: string | null
}

interface RankEntry {
  drink_id: string
  name: string
  producer: string | null
  photo_url: string | null
  avg_overall: number
  num_ratings: number
}

export default function Tasting() {
  const { t } = useTranslation()
  const { id, tid } = useParams<{ id: string; tid: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tasting, setTasting] = useState<Tasting | null>(null)
  const [drinks, setDrinks] = useState<TastingDrink[]>([])
  const [allRatings, setAllRatings] = useState<TastingRating[]>([])
  const [activeTab, setActiveTab] = useState<'bewerten' | 'rangliste'>('rangliste')
  const [selectedDrink, setSelectedDrink] = useState<TastingDrink | null>(null)
  const [allDrinks, setAllDrinks] = useState<{ id: string; name: string; producer: string | null }[]>([])
  const [drinkSearch, setDrinkSearch] = useState('')
  const [showAddDrink, setShowAddDrink] = useState(false)
  const [showNewDrinkForm, setShowNewDrinkForm] = useState(false)
  const [newProducer, setNewProducer] = useState('')
  const [newRegion, setNewRegion] = useState('')
  const [newAge, setNewAge] = useState('')
  const [newAbv, setNewAbv] = useState('')
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [creatingDrink, setCreatingDrink] = useState(false)

  // Formular-State
  const [nose, setNose] = useState(5)
  const [taste, setTaste] = useState(5)
  const [finish, setFinish] = useState(5)
  const [wheels, setWheels] = useState(EMPTY_WHEELS)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  const loadRatings = async () => {
    const { data } = await supabase
      .from('tasting_ratings')
      .select('*')
      .eq('tasting_id', tid)
    setAllRatings(data ?? [])
  }

  const load = async () => {
    if (!tid) return
    setLoadError(false)

    const { data: tastingData, error } = await supabase.from('tastings').select('*').eq('id', tid).single()
    if (error) { setLoadError(true); return }
    if (tastingData) setTasting(tastingData)

    supabase.from('tasting_drinks')
      .select('drink_id, position, drinks(id, name, producer, photo_url)')
      .eq('tasting_id', tid)
      .order('position')
      .then(({ data }) => { setDrinks((data as unknown as TastingDrink[]) ?? []) })

    loadRatings()

    listWhiskyOptions().then(setAllDrinks)
  }

  useEffect(() => {
    if (!tid) return

    load()

    // Realtime: Rangliste live aktualisieren
    const channel = supabase
      .channel(`tasting_ratings_${tid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasting_ratings',
        filter: `tasting_id=eq.${tid}`,
      }, () => { loadRatings() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid])

  // Eigene Bewertung laden wenn Whisky gewählt
  useEffect(() => {
    if (!selectedDrink || !user) return
    const mine = allRatings.find(r => r.drink_id === selectedDrink.drink_id && r.user_id === user.id)
    if (mine) {
      setNose(mine.nose ?? 5)
      setTaste(mine.taste ?? 5)
      setFinish(mine.finish ?? 5)
      setWheels({ ...EMPTY_WHEELS, ...(mine.wheels ?? {}) })
      setNote(mine.note ?? '')
    } else {
      setNose(5); setTaste(5); setFinish(5)
      setWheels(EMPTY_WHEELS); setNote('')
    }
  }, [selectedDrink, allRatings, user])

  const updateWheel = (type: 'nose' | 'taste') => (i: number, v: number) => {
    setWheels(w => ({ ...w, [type]: w[type].map((old, idx) => idx === i ? v : old) }))
  }

  const toggleAroma = (key: string) => {
    setWheels(w => {
      const cur = w.aromas ?? []
      return { ...w, aromas: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] }
    })
  }
  const addExtraAroma = (label: string) => setWheels(w => ({ ...w, extra: [...(w.extra ?? []), label] }))
  const removeExtraAroma = (label: string) => setWheels(w => ({ ...w, extra: (w.extra ?? []).filter(l => l !== label) }))

  const handleSave = async () => {
    if (!user || !selectedDrink || !tid) return
    setSaving(true)
    const overall = Math.round(((nose + taste + finish) / 3) * 10) / 10
    const { error } = await supabase.from('tasting_ratings').upsert({
      tasting_id: tid,
      drink_id: selectedDrink.drink_id,
      user_id: user.id,
      nose, taste, finish, overall, wheels,
      note: note.trim() || null,
    }, { onConflict: 'tasting_id,drink_id,user_id' })
    setSaving(false)
    if (error) { setSaveError(error.message) }
    else { setSaveError(null); setSaved(true); setTimeout(() => setSaved(false), 2000); loadRatings() }
  }

  const addDrinkToTasting = async (drinkId: string, name: string, producer: string | null = null, photo_url: string | null = null) => {
    if (!tid) return
    const pos = drinks.length
    const { error } = await supabase.from('tasting_drinks').insert({
      tasting_id: tid, drink_id: drinkId, position: pos,
    })
    if (!error) {
      setDrinks(prev => [...prev, {
        drink_id: drinkId, position: pos,
        drinks: { id: drinkId, name, producer, photo_url }
      }])
      setDrinkSearch('')
      setShowAddDrink(false)
    }
  }

  const createAndAddDrink = async () => {
    if (!drinkSearch.trim() || !user) return
    setCreatingDrink(true)

    let photo_url: string | null = null
    if (newPhoto) {
      const ext = newPhoto.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('drink-photos').upload(path, newPhoto)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('drink-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    let created
    try {
      created = await createDrink({
        name: drinkSearch.trim(),
        producer: newProducer.trim() || null,
        region: newRegion.trim() || null,
        age_years: newAge ? parseInt(newAge) : null,
        abv: newAbv ? parseFloat(newAbv) : null,
        photo_url,
        created_by: user.id,
      })
    } catch {
      setCreatingDrink(false)
      return
    }
    setCreatingDrink(false)
    setAllDrinks(prev => [...prev, created])
    await addDrinkToTasting(created.id, created.name, created.producer, created.photo_url)
    setShowNewDrinkForm(false)
    setNewProducer(''); setNewRegion(''); setNewAge(''); setNewAbv(''); setNewPhoto(null)
  }

  const closeTasting = async () => {
    if (!tid) return
    await supabase.from('tastings').update({ status: 'closed' }).eq('id', tid)
    setTasting(t => t ? { ...t, status: 'closed' } : t)
  }

  // Rangliste berechnen
  const ranking: RankEntry[] = drinks.map(td => {
    const drinkRatings = allRatings.filter(r => r.drink_id === td.drink_id && r.overall != null)
    const avg = drinkRatings.length
      ? Math.round((drinkRatings.reduce((s, r) => s + (r.overall ?? 0), 0) / drinkRatings.length) * 10) / 10
      : 0
    return {
      drink_id: td.drink_id,
      name: td.drinks.name,
      producer: td.drinks.producer,
      photo_url: td.drinks.photo_url,
      avg_overall: avg,
      num_ratings: drinkRatings.length,
    }
  }).sort((a, b) => b.avg_overall - a.avg_overall)

  if (loadError) return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <button onClick={() => navigate(`/groups/${id}`)} className="text-stone-400 hover:text-stone-200 text-sm">← {t('tasting.backToGroup')}</button>
      <LoadError onRetry={load} />
    </div>
  )

  if (!tasting) return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <div className="h-4 w-20 bg-stone-800 rounded mb-6 animate-pulse" />
      <div className="flex justify-between items-start mb-4 animate-pulse">
        <div>
          <div className="h-6 bg-stone-800 rounded w-48 mb-2" />
          <div className="h-4 bg-stone-800 rounded w-24" />
        </div>
        <div className="h-6 bg-stone-800 rounded-full w-24" />
      </div>
      <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6 animate-pulse">
        <div className="flex-1 h-8 bg-stone-800 rounded-lg" />
        <div className="flex-1 h-8 bg-stone-800 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4 animate-pulse">
            <div className="w-6 h-4 bg-stone-800 rounded" />
            <div className="w-12 h-12 bg-stone-800 rounded-lg flex-shrink-0" />
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

  return (
    <div className="max-w-lg mx-auto p-4 pb-24">
      <button onClick={() => navigate(`/groups/${id}`)} className="text-stone-400 hover:text-stone-200 text-sm mb-4">
        ← {t('tasting.backToGroup')}
      </button>

      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-stone-100">{tasting.title}</h1>
          {tasting.event_date && <p className="text-stone-500 text-sm">{tasting.event_date}</p>}
        </div>
        <span className={`text-xs rounded-full px-3 py-1 ${tasting.status === 'closed' ? 'bg-stone-700 text-stone-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {tasting.status === 'closed' ? t('tasting.statusClosed') : t('tasting.statusOpen')}
        </span>
      </div>

      {tasting.hosted_by === user?.id && tasting.status === 'open' && (
        <div className="flex gap-3 mb-4 flex-wrap">
          <button onClick={() => setShowAddDrink(v => !v)}
            className="text-sm bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg px-3 py-1.5">
            {t('tasting.addWhisky')}
          </button>
          <button onClick={closeTasting} className="text-sm text-red-400 hover:text-red-300">
            {t('tasting.closeTasting')}
          </button>
        </div>
      )}

      {showAddDrink && (
        <div className="bg-stone-900 rounded-xl p-4 mb-4">
          <input
            maxLength={120}
            value={drinkSearch}
            onChange={e => setDrinkSearch(e.target.value)}
            placeholder={t('tasting.searchWhisky')}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 mb-2"
          />
          {showNewDrinkForm && (
            <div className="flex flex-col gap-2 mb-3 bg-stone-800 rounded-xl p-4">
              <p className="text-sm font-medium text-amber-400">{t('tasting.newWhisky', { name: drinkSearch.trim() })}</p>
              <div className="grid grid-cols-2 gap-2">
                <input maxLength={80} value={newProducer} onChange={e => setNewProducer(e.target.value)}
                  placeholder={t('tasting.producer')} className="bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
                <input maxLength={60} value={newRegion} onChange={e => setNewRegion(e.target.value)}
                  placeholder={t('tasting.region')} className="bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
                <input type="number" value={newAge} onChange={e => setNewAge(e.target.value)}
                  placeholder={t('tasting.age')} className="bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
                <input type="number" step="0.1" value={newAbv} onChange={e => setNewAbv(e.target.value)}
                  placeholder={t('tasting.abv')} className="bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-100 text-sm focus:outline-none focus:border-amber-500" />
              </div>
              <input type="file" accept="image/*" onChange={e => setNewPhoto(e.target.files?.[0] ?? null)}
                className="w-full bg-stone-700 border border-stone-600 rounded-lg px-3 py-2 text-stone-400 text-sm file:mr-3 file:bg-stone-600 file:text-stone-200 file:border-0 file:rounded file:px-2 file:py-1" />
              <div className="flex gap-2 mt-1">
                <button onClick={createAndAddDrink} disabled={creatingDrink}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-3 py-2 text-sm">
                  {creatingDrink ? t('tasting.creating') : t('tasting.createAndAdd')}
                </button>
                <button onClick={() => setShowNewDrinkForm(false)}
                  className="bg-stone-700 hover:bg-stone-600 text-stone-300 rounded-lg px-3 py-2 text-sm">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {(() => {
              const filtered = allDrinks.filter(d =>
                !drinks.some(td => td.drink_id === d.id) &&
                (d.name.toLowerCase().includes(drinkSearch.toLowerCase()) ||
                  (d.producer ?? '').toLowerCase().includes(drinkSearch.toLowerCase()))
              ).slice(0, 10)

              const exactMatch = allDrinks.some(d =>
                d.name.toLowerCase() === drinkSearch.trim().toLowerCase()
              )

              return (
                <>
                  {filtered.map(d => (
                    <button key={d.id} onClick={() => addDrinkToTasting(d.id, d.name, d.producer)}
                      className="text-left px-3 py-2 rounded-lg hover:bg-stone-700 text-stone-200 text-sm">
                      {d.name}{d.producer ? ` · ${d.producer}` : ''}
                    </button>
                  ))}
                  {drinkSearch.trim() && !exactMatch && !showNewDrinkForm && (
                    <button onClick={() => setShowNewDrinkForm(true)}
                      className="text-left px-3 py-2 rounded-lg hover:bg-amber-500/20 text-amber-400 text-sm border border-dashed border-amber-500/30 mt-1">
                      {t('tasting.createNew', { name: drinkSearch.trim() })}
                    </button>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-900 rounded-xl p-1 mb-6">
        {(['rangliste', 'bewerten'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'}`}>
            {tab === 'rangliste' ? t('tasting.tabRanking') : t('tasting.tabRate')}
          </button>
        ))}
      </div>

      {/* Rangliste */}
      {activeTab === 'rangliste' && (
        <div className="flex flex-col gap-3">
          {ranking.length === 0 ? (
            <p className="text-stone-500 text-center py-8">{t('tasting.noRatings')}</p>
          ) : ranking.map((entry, i) => (
            <div key={entry.drink_id} className="flex items-center gap-4 bg-stone-900 rounded-xl p-4">
              <span className="text-stone-500 font-mono w-6 text-center">{i + 1}</span>
              {entry.photo_url ? (
                <img src={thumbUrl(entry.photo_url, 96)} alt={entry.name} loading="lazy" decoding="async" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🥃</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-100 truncate">{entry.name}</p>
                {entry.producer && <p className="text-sm text-stone-400 truncate">{entry.producer}</p>}
                <p className="text-xs text-stone-600">{t('tasting.ratingsCount', { count: entry.num_ratings })}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {entry.num_ratings > 0 ? (
                  <>
                    <p className="text-xl font-bold text-amber-400">{entry.avg_overall}</p>
                    <p className="text-xs text-stone-500">/10</p>
                  </>
                ) : <span className="text-stone-600">—</span>}
              </div>
            </div>
          ))}
          <p className="text-xs text-stone-600 text-center mt-2">{t('tasting.updatesLive')}</p>
        </div>
      )}

      {/* Bewerten */}
      {activeTab === 'bewerten' && (
        <div>
          {/* Whisky auswählen */}
          <p className="text-sm text-stone-400 mb-3">{t('tasting.chooseWhisky')}</p>
          <div className="flex flex-col gap-2 mb-6">
            {drinks.map(td => {
              const myRating = allRatings.find(r => r.drink_id === td.drink_id && r.user_id === user?.id)
              return (
                <button
                  key={td.drink_id}
                  onClick={() => { setSelectedDrink(td); }}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${selectedDrink?.drink_id === td.drink_id ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-stone-900 hover:bg-stone-800'}`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-stone-200">{td.drinks.name}</p>
                    {td.drinks.producer && <p className="text-xs text-stone-500">{td.drinks.producer}</p>}
                  </div>
                  {myRating && <span className="text-xs text-amber-400">✓ {myRating.overall}</span>}
                </button>
              )
            })}
          </div>

          {/* Bewertungsformular */}
          {selectedDrink && tasting.status === 'open' && (
            <div className="bg-stone-900 rounded-2xl p-5 flex flex-col gap-5">
              <h3 className="font-semibold text-stone-200">{selectedDrink.drinks.name}</h3>

              <WheelStepper wheels={wheels} onUpdate={updateWheel} />

              <div className="border-t border-stone-800 pt-4">
                <AromaTags
                  aromas={wheels.aromas ?? []}
                  extra={wheels.extra ?? []}
                  onToggle={toggleAroma}
                  onAddExtra={addExtraAroma}
                  onRemoveExtra={removeExtraAroma}
                />
              </div>

              {/* Noten – nach den Aromen */}
              <div className="flex flex-col gap-5 border-t border-stone-800 pt-4">
                {(['nose', 'taste', 'finish'] as const).map(key => {
                  const val = key === 'nose' ? nose : key === 'taste' ? taste : finish
                  const setter = key === 'nose' ? setNose : key === 'taste' ? setTaste : setFinish
                  const label = key === 'nose' ? t('tasting.nose') : key === 'taste' ? t('tasting.taste') : t('tasting.finish')
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-stone-300">{label}</span>
                        <span className="text-amber-400 font-bold">{val}/10</span>
                      </div>
                      <input type="range" min="1" max="10" value={val}
                        onChange={e => setter(Number(e.target.value))}
                        className="w-full accent-amber-500" />
                    </div>
                  )
                })}

                <div className="text-center text-stone-400 text-sm">
                  {t('tasting.total')} <span className="text-amber-400 font-bold text-lg">
                    {((nose + taste + finish) / 3).toFixed(1)}
                  </span>
                </div>
              </div>

              <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={2000}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
                placeholder={t('tasting.note')} />

              {saveError && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{saveError}</p>
              )}
              <button onClick={handleSave} disabled={saving}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-3 transition-colors">
                {saving ? t('common.saving') : saved ? t('common.saved') : t('tasting.saveRating')}
              </button>
            </div>
          )}

          {tasting.status === 'closed' && (
            <p className="text-stone-500 text-center py-4">{t('tasting.tastingClosed')}</p>
          )}
        </div>
      )}
    </div>
  )
}
