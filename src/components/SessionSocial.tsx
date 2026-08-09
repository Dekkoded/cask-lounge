import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

const REACTIONS = ['🥃', '🔥', '👏', '😍', '🤤']

export interface SessionReaction {
  emoji: string
  user_id: string
}

export interface SessionComment {
  id: string
  body: string
  created_at: string
  user_id: string
  profiles: { display_name: string | null; username: string } | null
}

export function ReactionBar({
  reactions,
  myId,
  onToggle,
}: {
  reactions: SessionReaction[]
  myId: string | undefined
  onToggle: (emoji: string, active: boolean) => void
}) {
  const counts = new Map<string, number>()
  const mine = new Set<string>()
  for (const r of reactions ?? []) {
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1)
    if (r.user_id === myId) mine.add(r.emoji)
  }
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {REACTIONS.map(e => {
        const c = counts.get(e) ?? 0
        const active = mine.has(e)
        return (
          <button
            key={e}
            onClick={() => onToggle(e, active)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-sm border transition-colors ${
              active
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-stone-800 border-stone-700 text-stone-400 hover:bg-stone-700'
            }`}
          >
            <span>{e}</span>
            {c > 0 && <span className="text-xs font-medium">{c}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function CommentSection({
  comments,
  myId,
  onPost,
  onDelete,
}: {
  comments: SessionComment[]
  myId: string | undefined
  onPost: (body: string) => void | Promise<void>
  onDelete: (commentId: string) => void | Promise<void>
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const sorted = [...(comments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at))

  const submit = async () => {
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    await onPost(body)
    setText('')
    setSending(false)
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      {sorted.map(c => (
        <div key={c.id} className="flex items-start gap-2 group">
          <div className="flex-1 bg-stone-800/60 rounded-lg px-3 py-2">
            <Link to={`/user/${c.user_id}`} className="text-xs font-semibold text-stone-300 hover:text-amber-400">
              {c.profiles?.display_name ?? c.profiles?.username ?? '?'}
            </Link>
            <p className="text-sm text-stone-200 break-words">{c.body}</p>
          </div>
          {c.user_id === myId && (
            <button
              onClick={() => onDelete(c.id)}
              aria-label={t('tasting.deleteComment')}
              className="text-stone-600 hover:text-red-400 text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {myId && (
        <div className="flex gap-2">
          <input
            maxLength={500}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder={t('tasting.commentPlaceholder')}
            className="flex-1 bg-stone-800 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={submit}
            disabled={sending || !text.trim()}
            className="bg-stone-700 hover:bg-stone-600 disabled:opacity-40 text-stone-200 rounded-lg px-3 text-sm transition-colors"
          >
            {t('tasting.send')}
          </button>
        </div>
      )}
    </div>
  )
}
