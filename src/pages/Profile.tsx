import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePushNotifications } from '../hooks/usePushNotifications'

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? '')
          setUsername(data.username ?? '')
          setAvatarUrl(data.avatar_url)
        }
        setLoading(false)
      })
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError(null)

    let newAvatarUrl = avatarUrl

    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true })
      if (uploadError) {
        setError('Foto-Upload fehlgeschlagen: ' + uploadError.message)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = urlData.publicUrl + `?t=${Date.now()}`
    }

    const { error } = await supabase.from('profiles').update({
      display_name: displayName.trim() || null,
      username: username.trim(),
      avatar_url: newAvatarUrl,
    }).eq('id', user.id)

    setSaving(false)
    if (error) { setError(error.message); return }
    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="h-4 w-20 bg-stone-800 rounded mb-8 animate-pulse" />
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-24 h-24 bg-stone-800 rounded-full" />
          <div className="h-5 bg-stone-800 rounded w-40" />
        </div>
      </div>
    )
  }

  const avatar = avatarPreview ?? avatarUrl

  return (
    <div className="max-w-lg mx-auto p-6 pb-24">
      <button onClick={() => navigate('/')} className="text-stone-400 hover:text-stone-200 text-sm mb-8">
        ← Zurück
      </button>

      <h1 className="text-2xl font-bold text-stone-100 mb-8">Mein Profil</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <label className="cursor-pointer group relative">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-stone-700 group-hover:ring-amber-500 transition-all" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-stone-800 flex items-center justify-center text-3xl ring-2 ring-stone-700 group-hover:ring-amber-500 transition-all">
              👤
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Ändern</span>
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <p className="text-stone-500 text-xs mt-2">Tippen zum Ändern</p>
      </div>

      {/* Formular */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm text-stone-300 mb-1">Anzeigename</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Wie soll dein Name angezeigt werden?"
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">Benutzername</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
            placeholder="username"
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-sm text-stone-300 mb-1">E-Mail</label>
          <input
            value={user?.email ?? ''}
            disabled
            className="w-full bg-stone-900 border border-stone-800 rounded-lg px-4 py-2.5 text-stone-500 cursor-not-allowed"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-3 transition-colors mt-2"
        >
          {saving ? 'Wird gespeichert…' : saved ? '✓ Gespeichert!' : 'Speichern'}
        </button>

        {/* Push Notifications */}
        {'Notification' in window && (
          <div className="flex items-center justify-between bg-stone-900 rounded-xl px-4 py-3 mt-2">
            <div>
              <p className="text-stone-200 text-sm font-medium">Push-Benachrichtigungen</p>
              <p className="text-stone-500 text-xs mt-0.5">
                {subscribed ? 'Aktiv — du wirst benachrichtigt' : 'Erhalte Infos wenn jemand trinkt'}
              </p>
            </div>
            <button
              onClick={subscribed ? unsubscribe : subscribe}
              disabled={pushLoading}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                subscribed
                  ? 'bg-stone-700 hover:bg-stone-600 text-stone-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
              }`}
            >
              {pushLoading ? '…' : subscribed ? 'Deaktivieren' : 'Aktivieren'}
            </button>
          </div>
        )}

        <button
          onClick={signOut}
          className="text-stone-500 hover:text-red-400 text-sm text-center py-2 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </div>
  )
}
