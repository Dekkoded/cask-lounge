import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { compressImage } from '../lib/image'

export default function AddWhisky() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [producer, setProducer] = useState('')
  const [region, setRegion] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [abv, setAbv] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)
    setLoading(true)

    let photo_url: string | null = null

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

    const { data, error } = await supabase
      .from('drinks')
      .insert({
        category: 'whisky',
        name: name.trim(),
        producer: producer.trim() || null,
        region: region.trim() || null,
        age_years: ageYears ? parseInt(ageYears) : null,
        abv: abv ? parseFloat(abv) : null,
        photo_url,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    navigate(`/whisky/${data.id}`)
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm mb-6 flex items-center gap-1">
        ← Zurück
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-6">Whisky hinzufügen</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-stone-300 mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            placeholder="z. B. Lagavulin 16"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Brennerei</label>
            <input
              value={producer}
              onChange={e => setProducer(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="z. B. Lagavulin"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-300 mb-1">Region</label>
            <input
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="z. B. Islay"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Alter (Jahre)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={ageYears}
              onChange={e => setAgeYears(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="16"
            />
          </div>
          <div>
            <label className="block text-sm text-stone-300 mb-1">Alkohol (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={abv}
              onChange={e => setAbv(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="43.0"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">Foto (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={e => setPhoto(e.target.files?.[0] ?? null)}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-400 text-sm file:mr-3 file:bg-stone-700 file:text-stone-200 file:border-0 file:rounded file:px-2 file:py-1"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors"
        >
          {loading ? 'Wird gespeichert…' : 'Whisky anlegen'}
        </button>
      </form>
    </div>
  )
}
