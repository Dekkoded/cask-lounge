import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { compressImage } from '../lib/image'

export default function AddWhisky() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()

  const [name, setName] = useState('')
  const [producer, setProducer] = useState('')
  const [region, setRegion] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [abv, setAbv] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [similar, setSimilar] = useState<{ id: string; name: string; producer: string | null }[]>([])
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [addingCollection, setAddingCollection] = useState(false)

  const checkDuplicates = async () => {
    const q = name.trim()
    if (q.length < 2) { setSimilar([]); return }
    const { data } = await supabase.from('drinks')
      .select('id, name, producer').eq('category', 'whisky')
      .ilike('name', `%${q}%`).limit(4)
    setSimilar(data ?? [])
  }

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
        setError(t('whisky.photoUploadFailed', { message: uploadError.message }))
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

    setLoading(false)
    setCreatedId(data.id)
  }

  const addToCollection = async () => {
    if (!user || !createdId) return
    setAddingCollection(true)
    // Sammlungs-Eintrag ohne Bewertung: privat, keine Noten.
    await supabase.from('ratings').insert({
      drink_id: createdId,
      user_id: user.id,
      is_public: false,
    })
    navigate(`/whisky/${createdId}`)
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      {createdId && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-stone-900 border border-stone-700 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🥃</div>
            <h2 className="text-lg font-bold text-stone-100 mb-1">{t('whisky.createdHeading', { name: name.trim() })}</h2>
            <p className="text-stone-400 text-sm mb-6">{t('whisky.createdPrompt')}</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={addToCollection}
                disabled={addingCollection}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-2.5 transition-colors"
              >
                {addingCollection ? t('whisky.addingToCollection') : t('whisky.addToCollection')}
              </button>
              <button
                onClick={() => navigate(`/whisky/${createdId}`)}
                className="text-stone-400 hover:text-stone-200 text-sm py-2 transition-colors"
              >
                {t('common.skip')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm mb-6 flex items-center gap-1">
        ← {t('common.back')}
      </button>

      <h1 className="text-2xl font-bold text-amber-400 mb-6">{t('whisky.addTitle')}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-stone-300 mb-1">{t('whisky.fields.nameRequired')}</label>
          <input
            required
            maxLength={120}
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={checkDuplicates}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            placeholder={t('whisky.placeholders.name')}
          />
          {similar.length > 0 && (
            <div className="mt-2 bg-stone-800/60 border border-stone-700 rounded-lg p-3">
              <p className="text-xs text-stone-400 mb-2">{t('whisky.maybeExists')}</p>
              <div className="flex flex-col gap-1">
                {similar.map(d => (
                  <Link
                    key={d.id}
                    to={`/whisky/${d.id}`}
                    className="text-sm text-amber-400 hover:text-amber-300 truncate"
                  >
                    {d.name}{d.producer ? ` · ${d.producer}` : ''}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('whisky.fields.producer')}</label>
            <input
              maxLength={80}
              value={producer}
              onChange={e => setProducer(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder={t('whisky.placeholders.producer')}
            />
          </div>
          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('whisky.fields.region')}</label>
            <input
              maxLength={60}
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder={t('whisky.placeholders.region')}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('whisky.fields.age')}</label>
            <input
              type="number"
              min="0"
              max="100"
              value={ageYears}
              onChange={e => setAgeYears(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder={t('whisky.placeholders.age')}
            />
          </div>
          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('whisky.fields.abv')}</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={abv}
              onChange={e => setAbv(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder={t('whisky.placeholders.abv')}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">{t('whisky.fields.photo')}</label>
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
          {loading ? t('common.saving') : t('whisky.createWhisky')}
        </button>
      </form>
    </div>
  )
}
