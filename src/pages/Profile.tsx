import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { getProfile, loadRatingStats, isUsernameTaken, updateProfile } from '../lib/queries/profile'
import { useAuth } from '../context/auth-context'
import { usePushNotifications } from '../hooks/usePushNotifications'
import { compressImage, thumbUrl } from '../lib/image'
import Img from '../components/Img'
import { openIntro } from '../lib/intro'
import FeedbackSection from '../components/FeedbackSection'
import LegalLinks from '../components/LegalLinks'
import { getTheme, setTheme, type Theme } from '../lib/theme'
import { LANGUAGES } from '../i18n'

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div onClick={onToggle}
      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${enabled ? 'bg-amber-500' : 'bg-stone-700'}`}>
      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${enabled ? 'translate-x-6' : 'translate-x-0'}`} />
    </div>
  )
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [emailMsg, setEmailMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [stats, setStats] = useState<{ count: number; avg: number | null; topRegion: string | null } | null>(null)
  const [theme, setThemeState] = useState<Theme>(getTheme())
  const { subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications()

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(data => {
      if (data) {
        setDisplayName(data.display_name ?? '')
        setUsername(data.username ?? '')
        setAvatarUrl(data.avatar_url)
        setEmailNotifications(data.email_notifications ?? true)
        setNotifPrefs(data.notification_prefs ?? {})
      }
      setLoading(false)
    })
    setNewEmail(user.email ?? '')

    loadRatingStats(user.id).then(setStats)
  }, [user])

  const checkUsername = async (val: string) => {
    if (!val.trim()) { setUsernameError(t('profile.usernameEmpty')); return }
    const taken = await isUsernameTaken(val.trim(), user!.id)
    if (taken) setUsernameError(t('profile.usernameTaken'))
    else setUsernameError(null)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!user || usernameError) return
    setSaving(true)
    setError(null)

    let newAvatarUrl = avatarUrl
    if (avatarFile) {
      const compressed = await compressImage(avatarFile, 512, 0.85)
      const path = `${user.id}/avatar.jpg`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
      if (uploadError) { setError(t('profile.photoUploadFailed') + uploadError.message); setSaving(false); return }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      newAvatarUrl = urlData.publicUrl + `?t=${Date.now()}`
    }

    try {
      await updateProfile(user.id, {
        display_name: displayName.trim() || null,
        username: username.trim(),
        avatar_url: newAvatarUrl,
        email_notifications: emailNotifications,
      })
    } catch (e) {
      setSaving(false)
      setError((e as Error).message); return
    }

    setSaving(false)
    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const setPref = async (key: string, val: boolean) => {
    const prev = notifPrefs
    const next = { ...prev, [key]: val }
    setNotifPrefs(next)
    try {
      await updateProfile(user!.id, { notification_prefs: next })
    } catch (e) {
      setNotifPrefs(prev)
      setError(t('profile.settingSaveFailed') + (e as Error).message)
    }
  }

  const handleEmailChange = async () => {
    if (!newEmail.trim() || newEmail === user?.email) return
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) setEmailMsg(t('profile.error') + error.message)
    else setEmailMsg(t('profile.emailConfirmSent'))
    setTimeout(() => setEmailMsg(null), 4000)
  }

  const [deleting, setDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (!user) return
    setDeleting(true)
    setError(null)
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
    if (error) {
      setError(t('profile.deleteFailed') + error.message)
      setDeleting(false)
      return
    }
    await signOut()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="h-4 w-20 bg-stone-800 rounded mb-8 skeleton" />
        <div className="flex flex-col items-center gap-4 skeleton">
          <div className="w-24 h-24 bg-stone-800 rounded-full" />
          <div className="h-5 bg-stone-800 rounded w-40" />
        </div>
      </div>
    )
  }

  const avatar = avatarPreview ?? avatarUrl

  return (
    <div className="max-w-lg mx-auto p-6 pb-24">
      <h1 className="font-display text-2xl font-semibold text-stone-100 mb-8">{t('profile.title')}</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <label className="cursor-pointer group relative">
          {avatar ? (
            <Img src={thumbUrl(avatar, 256)} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-stone-700 group-hover:ring-amber-500 transition-shadow duration-200" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-stone-800 flex items-center justify-center text-3xl ring-2 ring-stone-700 group-hover:ring-amber-500 transition-shadow duration-200">👤</div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">{t('profile.change')}</span>
          </div>
          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
        </label>
        <p className="text-stone-500 text-xs mt-2">{t('profile.tapToChange')}</p>
      </div>

      {stats && stats.count > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-8">
          <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
            <p className="font-display text-2xl font-semibold text-amber-400 tabular-nums">{stats.count}</p>
            <p className="text-stone-500 text-xs mt-1">{t('profile.stats.rated')}</p>
          </div>
          <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
            <p className="font-display text-2xl font-semibold text-amber-400 tabular-nums">{stats.avg != null ? stats.avg.toFixed(1) : '—'}</p>
            <p className="text-stone-500 text-xs mt-1">{t('profile.stats.avg')}</p>
          </div>
          <div className="bg-stone-900 rounded-xl px-3 py-4 text-center">
            <p className="text-base font-bold text-amber-400 truncate">{stats.topRegion ?? '—'}</p>
            <p className="text-stone-500 text-xs mt-1">{t('profile.stats.topRegion')}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Anzeigename */}
        <div>
          <label className="block text-sm text-stone-300 mb-1">{t('profile.displayName')}</label>
          <input maxLength={50} value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder={t('profile.displayNamePlaceholder')}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm text-stone-300 mb-1">{t('profile.username')}</label>
          <input maxLength={30} value={username}
            onChange={e => { setUsername(e.target.value.replace(/\s/g, '')); setUsernameError(null) }}
            onBlur={e => checkUsername(e.target.value)}
            placeholder={t('profile.usernamePlaceholder')}
            className={`w-full bg-stone-800 border rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none font-mono ${usernameError ? 'border-red-500 focus:border-red-500' : 'border-stone-700 focus:border-amber-500'}`} />
          {usernameError && <p className="text-red-400 text-xs mt-1">{usernameError}</p>}
        </div>

        {/* E-Mail */}
        <div>
          <label className="block text-sm text-stone-300 mb-1">{t('profile.email')}</label>
          <div className="flex gap-2">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
              className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
            {newEmail !== user?.email && (
              <button onClick={handleEmailChange}
                className="bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg px-3 py-2.5 text-sm whitespace-nowrap">
                {t('profile.change')}
              </button>
            )}
          </div>
          {emailMsg && <p className="text-amber-400 text-xs mt-1">{emailMsg}</p>}
        </div>

        {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

        <button onClick={handleSave} disabled={saving || !!usernameError}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-3 transition-colors mt-2">
          {saving ? t('common.saving') : saved ? t('common.saved') : t('common.save')}
        </button>

        {/* Darstellung */}
        <div className="border-t border-stone-800 pt-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-stone-300">{t('profile.appearance')}</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'dark' as Theme, icon: '🌙', label: t('profile.dark') },
              { value: 'light' as Theme, icon: '☀️', label: t('profile.light') },
            ]).map(opt => (
              <button
                key={opt.value}
                onClick={() => { setTheme(opt.value); setThemeState(opt.value) }}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors border ${
                  theme === opt.value
                    ? 'bg-amber-500 text-stone-950 border-amber-500'
                    : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600'
                }`}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sprache */}
        <div className="border-t border-stone-800 pt-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-stone-300">{t('profile.language')}</p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => i18n.changeLanguage(lang.code)}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors border ${
                  i18n.resolvedLanguage === lang.code
                    ? 'bg-amber-500 text-stone-950 border-amber-500'
                    : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600'
                }`}
              >
                <span>{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Benachrichtigungen */}
        <div className="border-t border-stone-800 pt-4 flex flex-col gap-3">
          <p className="text-sm font-medium text-stone-300">{t('profile.notifications')}</p>
          <div className="flex items-center justify-between bg-stone-900 rounded-xl px-4 py-3">
            <div>
              <p className="text-stone-200 text-sm font-medium">{t('profile.email')}</p>
              <p className="text-stone-500 text-xs mt-0.5">{t('profile.emailNotif')}</p>
            </div>
            <Toggle enabled={emailNotifications} onToggle={async () => {
              const next = !emailNotifications
              setEmailNotifications(next)
              try {
                await updateProfile(user!.id, { email_notifications: next })
              } catch (e) {
                setEmailNotifications(!next)
                setError(t('profile.settingSaveFailed') + (e as Error).message)
              }
            }} />
          </div>
          {'Notification' in window && (
            <div className="flex items-center justify-between bg-stone-900 rounded-xl px-4 py-3">
              <div>
                <p className="text-stone-200 text-sm font-medium">{t('profile.push')}</p>
                <p className="text-stone-500 text-xs mt-0.5">{subscribed ? t('profile.pushActive') : t('profile.pushInactive')}</p>
              </div>
              <button onClick={subscribed ? unsubscribe : subscribe} disabled={pushLoading} className="disabled:opacity-50">
                <Toggle enabled={subscribed} onToggle={() => {}} />
              </button>
            </div>
          )}

          {/* Granular: wofür benachrichtigen */}
          {(emailNotifications || subscribed) && (
            <div className="bg-stone-900 rounded-xl px-4 py-3 flex flex-col gap-3 mt-1">
              <div>
                <p className="text-stone-200 text-sm font-medium">{t('profile.notifWhat')}</p>
                <p className="text-stone-500 text-xs mt-0.5">{t('profile.notifWhatSub')}</p>
              </div>
              {([
                { key: 'live', label: t('profile.notifLive') },
                { key: 'comment', label: t('profile.notifComment') },
                { key: 'rating', label: t('profile.notifRating') },
                { key: 'battle', label: t('profile.notifBattle') },
              ]).map(opt => {
                const on = notifPrefs[opt.key] !== false
                return (
                  <div key={opt.key} className="flex items-center justify-between">
                    <p className="text-stone-300 text-sm">{opt.label}</p>
                    <Toggle enabled={on} onToggle={() => setPref(opt.key, !on)} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Feedback & Hilfe */}
        <FeedbackSection />

        {/* Account löschen */}
        <div className="border-t border-stone-800 pt-4">
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500 hover:text-red-400 text-sm transition-colors">
              {t('profile.deleteAccount')}
            </button>
          ) : (
            <div className="bg-red-950 border border-red-800 rounded-xl p-4 flex flex-col gap-3">
              <p className="text-red-300 text-sm font-medium">{t('profile.deleteConfirm')}</p>
              <div className="flex gap-2">
                <button onClick={handleDeleteAccount} disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-2 text-sm">
                  {deleting ? t('profile.deleting') : t('profile.deleteYes')}
                </button>
                <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                  className="flex-1 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-stone-200 rounded-lg px-4 py-2 text-sm">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        <button onClick={openIntro} className="text-stone-500 hover:text-stone-300 text-sm text-center py-2 transition-colors">
          {t('profile.viewIntro')}
        </button>

        <button onClick={signOut} className="text-stone-500 hover:text-red-400 text-sm text-center py-2 transition-colors">
          {t('profile.signOut')}
        </button>

        <LegalLinks className="mt-4" />
      </div>
    </div>
  )
}
