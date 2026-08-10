import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { searchProfiles, type MemberListItem } from '../lib/queries/profile'
import { thumbUrl } from '../lib/image'
import Img from '../components/Img'

export default function Members() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    const run = async () => {
      const data = await searchProfiles(query)
      if (active) {
        setMembers(data)
        setLoading(false)
      }
    }

    const t = setTimeout(run, 250)
    return () => { active = false; clearTimeout(t) }
  }, [query])

  return (
    <div className="max-w-lg mx-auto p-6 pb-24">
      <button onClick={() => navigate(-1)} className="text-stone-400 hover:text-stone-200 text-sm mb-6">← {t('common.back')}</button>

      <h1 className="font-display text-2xl font-semibold text-amber-400 mb-6">{t('groups.membersTitle')}</h1>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={t('groups.searchByName')}
        className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500 mb-4"
      />

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 bg-stone-900 rounded-xl skeleton" />
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="bg-stone-900 rounded-xl p-4 text-stone-500 text-sm">{t('groups.noMembersFound')}</div>
      ) : (
        <div className="stagger flex flex-col gap-2">
          {members.map(m => {
            const name = m.display_name ?? m.username
            return (
              <Link
                key={m.id}
                to={`/user/${m.id}`}
                className="press flex items-center gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl p-3 transition-colors"
              >
                {m.avatar_url ? (
                  <Img src={thumbUrl(m.avatar_url, 96)} alt={name} loading="lazy" decoding="async" className="w-12 h-12 rounded-full object-cover flex-shrink-0 ring-1 ring-stone-700" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-stone-800 flex items-center justify-center text-xl flex-shrink-0">👤</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-100 truncate">{name}</p>
                  {m.display_name && <p className="text-stone-500 text-xs font-mono truncate">@{m.username}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
