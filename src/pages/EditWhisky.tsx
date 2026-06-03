import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { compressImage } from '../lib/image'
import type { Drink } from '../lib/types'

export default function EditWhisky() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user, isAdmin } = useAuth()

  const [drink, setDrink] = useState<Drink | null>(null)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [name, setName] = useState('')
  const [producer, setProducer] = useState('')
  const [region, setRegion] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [abv, setAbv] = useState('')
  const [price, setPrice] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id || !user) return
    supabase.from('drinks').select('*').eq('id', id).single()
      .then(async ({ data }) => {
        if (!data) { setAllowed(false); return }
        setDrink(data)
        setName(data.name ?? '')
        setProducer(data.producer ?? '')
        setRegion(data.region ?? '')
        setAgeYears(data.age_years != null ? String(data.age_years) : '')
        setAbv(data.abv != null ? String(data.abv) : '')
        setPrice(data.price != null ? String(data.price) : '')

        if (isAdmin) { setAllowed(true); return }
        if (data.created_by !== user.id) { setAllowed(false); return }
        const { count } = await supabase.from('ratings').select('id', { count: 'exact', head: true })
          .eq('drink_id', id).neq('user_id', user.id)
        setAllowed((count ?? 0) === 0)
      })
  }, [id, user, isAdmin])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !id || !drink) return
    setError(null)
    setLoading(true)

    let photo_url = drink.photo_url
    if (photo) {
      const compressed = await compressImage(photo)
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('drink-photos')
        .upload(path, compressed, { contentType: 'image/jpeg' })
      if (uploadError) {
        setError('Foto-Upload fehlgeschlagen: ' + uploadError.message)
        setLoading(false)
        return
      }
      const { data } = supabase.storage.from('drink-photos').getPublicUrl(path)
      photo_url = data.publicUrl
    }

    const { error } = await supabase.from('drinks').update({
      name: name.trim(),
      producer: producer.trim() || null,
      region: region.trim() || null,
      age_years: ageYears ? parseInt(ageYears) : null,
      abv: abv ? parseFloat(abv) : null,
      price: price ? parseFloat(price) : null,
      photo_url,
    }).eq('id', id)

    setLoading(false)
    if (error) { setError(error.message); return }
    navigate(`/whisky/${id}`)
  }

  if (allowed === false) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <button onClick={() => navigate(`/whisky/${id}`)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">← Zurück</button>
        <p className="text-stone-400">Dieser Whisky kann nicht mehr bearbeitet werden, da bereits andere ihn bewertet haben.</p>
      </div>
    )
  }

  if (allowed === null) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="h-7 w-48 bg-stone-800 rounded mb-6 animate-pulse" />
        <div className="flex flex-col gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-11 bg-stone-800 rounded-lg" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <button onClick={() => navigate(`/whisky/${id}`)} className="text-stone-400 hover:text-stone-200 text-sm mb-6 flex items-center gap-1">
        ← Zurück
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-6">Whisky bearbeiten</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-stone-300 mb-1">Name *</label>
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            placeholder="z. B. Lagavulin 16" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Brennerei</label>
            <input value={producer} onChange={e => setProducer(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="z. B. Lagavulin" />
          </div>
          <div>
            <label className="block text-sm text-stone-300 mb-1">Region</label>
            <input value={region} onChange={e => setRegion(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="z. B. Islay" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Alter (Jahre)</label>
            <input type="number" min="0" max="100" value={ageYears} onChange={e => setAgeYears(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="16" />
          </div>
          <div>
            <label className="block text-sm text-stone-300 mb-1">Alkohol (%)</label>
            <input type="number" min="0" max="100" step="0.1" value={abv} onChange={e => setAbv(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="43.0" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">Flaschenwert (€)</label>
          <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            placeholder="z. B. 65" />
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">Foto ersetzen (optional)</label>
          <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] ?? null)}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-400 text-sm file:mr-3 file:bg-stone-700 file:text-stone-200 file:border-0 file:rounded file:px-2 file:py-1" />
        </div>

        {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

        <button type="submit" disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors">
          {loading ? 'Wird gespeichert…' : 'Änderungen speichern'}
        </button>
      </form>
    </div>
  )
}
