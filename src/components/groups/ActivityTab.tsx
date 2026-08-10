import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ReactionBar, CommentSection } from '../SessionSocial'
import Modal from '../Modal'
import { formatDateTime } from '../../lib/format'
import { thumbUrl } from '../../lib/image'
import Img from '../Img'
import type { GroupSession, RatingShare } from '../../lib/queries/sessions'
import type { DrinkListItem } from '../../lib/queries/drinks'

// View-Modell für den zusammengeführten Aktivitäts-Feed (Sessions + geteilte
// Bewertungen). Die Daten-Interfaces leben in lib/queries/*.
export type Activity =
  | { kind: 'session'; ts: string; session: GroupSession }
  | { kind: 'rating'; ts: string; share: RatingShare }

interface Props {
  activity: Activity[]
  loading: boolean
  allDrinks: DrinkListItem[]
  myId?: string
  lang: string
  memberName: (userId: string) => string
  onPost: (drinkId: string, drinkName: string, message: string) => Promise<void>
  onToggleReaction: (sessionId: string, emoji: string, active: boolean) => void
  onPostComment: (sessionId: string, body: string) => void
  onDeleteComment: (commentId: string) => void
}

/** Tab: Aktivitäts-Feed einer Gruppe plus "Ich trinke gerade"-Dialog. */
export default function ActivityTab({
  activity, loading, allDrinks, myId, lang, memberName,
  onPost, onToggleReaction, onPostComment, onDeleteComment,
}: Props) {
  const { t } = useTranslation()
  const [showPost, setShowPost] = useState(false)
  const [drinkId, setDrinkId] = useState('')
  const [drinkName, setDrinkName] = useState('')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  const handlePost = async () => {
    setPosting(true)
    setPostError(null)
    try {
      await onPost(drinkId, drinkName, message)
      setShowPost(false)
      setDrinkId(''); setDrinkName(''); setMessage('')
    } catch (e) {
      setPostError(t('groups.shareError', { message: (e as Error).message }))
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => { setPostError(null); setShowPost(true) }}
        className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl py-3 text-lg">
        {t('groups.drinkingNow')}
      </button>

      {loading ? (
        <p className="text-stone-500 text-center py-8 animate-pulse">{t('common.loading')}</p>
      ) : activity.length === 0 ? (
        <p className="text-stone-500 text-center py-8">
          {t('groups.noActivity')}
          <br />
          <span className="text-sm">{t('groups.noActivitySub')}</span>
        </p>
      ) : (
        activity.map(a => a.kind === 'session' ? (
          <div key={`s-${a.session.id}`} className="bg-stone-900 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🥃</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-100">
                  <Link to={`/user/${a.session.user_id}`} className="hover:text-amber-400 transition-colors">
                    {a.session.profiles?.display_name ?? a.session.profiles?.username ?? '?'}
                  </Link> {t('groups.isDrinking')}
                </p>
                <p className="text-amber-400 font-medium">
                  {a.session.drinks?.name ?? a.session.drink_name ?? '—'}
                </p>
                {a.session.message && <p className="text-stone-400 text-sm mt-1">„{a.session.message}"</p>}
                <p className="text-stone-600 text-xs mt-1">
                  {formatDateTime(a.session.started_at, lang)}
                </p>
                <ReactionBar reactions={a.session.session_reactions} myId={myId} onToggle={(emoji, active) => onToggleReaction(a.session.id, emoji, active)} />
                <CommentSection
                  comments={a.session.session_comments}
                  myId={myId}
                  onPost={body => onPostComment(a.session.id, body)}
                  onDelete={onDeleteComment}
                />
              </div>
            </div>
          </div>
        ) : (
          <Link
            key={`r-${a.share.rating_id}`}
            to={a.share.ratings?.drinks ? `/whisky/${a.share.ratings.drinks.id}` : '#'}
            className="press flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
          >
            <span className="text-2xl">⭐</span>
            {a.share.ratings?.drinks?.photo_url ? (
              <Img src={thumbUrl(a.share.ratings.drinks.photo_url, 96)} alt={a.share.ratings.drinks.name} loading="lazy" decoding="async" className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 bg-stone-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🥃</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-stone-100 text-sm">
                <span className="font-semibold">{memberName(a.share.shared_by)}</span> {t('groups.sharedRating')}
              </p>
              <p className="text-amber-400 font-medium truncate">{a.share.ratings?.drinks?.name ?? '—'}</p>
              <p className="text-stone-600 text-xs mt-0.5">
                {formatDateTime(a.share.shared_at, lang)}
              </p>
            </div>
            {a.share.ratings?.overall != null && (
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-amber-400">{a.share.ratings.overall}</p>
                <p className="text-xs text-stone-500">/10</p>
              </div>
            )}
          </Link>
        ))
      )}

      {/* Post-Dialog */}
      <Modal open={showPost} onClose={() => { setShowPost(false); setPostError(null) }} ariaLabel={t('groups.postTitle')} className="w-full max-w-lg p-6 gap-4">
        <h3 className="text-lg font-bold text-stone-100">{t('groups.postTitle')}</h3>

        <div>
          <label className="text-sm text-stone-400 mb-1 block">{t('groups.selectFromCatalog')}</label>
          <select value={drinkId} onChange={e => { setDrinkId(e.target.value); setDrinkName('') }}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500">
            <option value="">{t('groups.orFreeInput')}</option>
            {allDrinks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {!drinkId && (
          <div>
            <label className="text-sm text-stone-400 mb-1 block">{t('groups.enterNameLabel')}</label>
            <input maxLength={120} value={drinkName} onChange={e => setDrinkName(e.target.value)}
              placeholder={t('groups.drinkNamePlaceholder')}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
          </div>
        )}

        <div>
          <label className="text-sm text-stone-400 mb-1 block">{t('groups.messageLabel')}</label>
          <input maxLength={280} value={message} onChange={e => setMessage(e.target.value)}
            placeholder={t('groups.messagePlaceholder')}
            className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
        </div>

        {postError && <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{postError}</p>}

        <div className="flex gap-3">
          <button onClick={handlePost} disabled={posting || (!drinkId && !drinkName.trim())}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3">
            {posting ? t('groups.sending') : t('groups.share')}
          </button>
          <button onClick={() => { setShowPost(false); setPostError(null) }}
            className="bg-stone-800 text-stone-300 rounded-xl px-4">
            {t('common.cancel')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
