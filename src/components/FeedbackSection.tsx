import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

type FeedbackType = 'idea' | 'problem'

interface FeedbackRow {
  id: string
  type: FeedbackType
  message: string
  status: string
  created_at: string
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-stone-700 text-stone-300',
  planned: 'bg-amber-500/20 text-amber-400',
  done: 'bg-green-600/20 text-green-500',
  declined: 'bg-red-900/40 text-red-400',
}

export default function FeedbackSection() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [type, setType] = useState<FeedbackType>('idea')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<FeedbackRow[]>([])

  const load = () => {
    if (!user) return
    supabase.from('feedback')
      .select('id, type, message, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setEntries((data as FeedbackRow[]) ?? []))
  }

  useEffect(load, [user])

  const submit = async () => {
    if (!user || !message.trim() || sending) return
    setSending(true)
    setError(null)
    const { error: insErr } = await supabase.from('feedback').insert({
      user_id: user.id,
      type,
      message: message.trim(),
    })
    setSending(false)
    if (insErr) { setError(t('profile.feedback.error') + insErr.message); return }
    setMessage('')
    setSent(true)
    setTimeout(() => setSent(false), 3000)
    load()
  }

  const typeBtn = (value: FeedbackType, icon: string, label: string) => (
    <button
      type="button"
      onClick={() => setType(value)}
      className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors border ${
        type === value
          ? 'bg-amber-500 text-stone-950 border-amber-500'
          : 'bg-stone-900 text-stone-300 border-stone-700 hover:border-stone-600'
      }`}
    >
      <span>{icon}</span>
      {label}
    </button>
  )

  return (
    <div className="border-t border-stone-800 pt-4 flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium text-stone-300">{t('profile.feedback.title')}</p>
        <p className="text-stone-500 text-xs mt-0.5">{t('profile.feedback.sub')}</p>
      </div>

      <div className="flex gap-2">
        {typeBtn('idea', '💡', t('profile.feedback.idea'))}
        {typeBtn('problem', '🐞', t('profile.feedback.problem'))}
      </div>

      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={t('profile.feedback.placeholder')}
        rows={3}
        maxLength={1000}
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 resize-none"
      />

      {error && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>}

      <button
        onClick={submit}
        disabled={sending || !message.trim()}
        className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-2.5 transition-colors"
      >
        {sending ? t('profile.feedback.sending') : sent ? t('profile.feedback.sent') : t('profile.feedback.send')}
      </button>

      {entries.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          <p className="text-stone-500 text-xs">{t('profile.feedback.yourEntries')}</p>
          {entries.map(e => (
            <div key={e.id} className="bg-stone-900 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="flex-shrink-0 mt-0.5">{e.type === 'problem' ? '🐞' : '💡'}</span>
              <p className="flex-1 text-sm text-stone-300 break-words min-w-0">{e.message}</p>
              <span className={`flex-shrink-0 text-xs rounded-full px-2.5 py-0.5 ${STATUS_STYLE[e.status] ?? STATUS_STYLE.open}`}>
                {t(`profile.feedback.status.${e.status}`, t('profile.feedback.status.open'))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
