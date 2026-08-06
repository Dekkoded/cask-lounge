import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Group, Member } from '../../lib/queries/groups'

interface Props {
  members: Member[]
  group: Group
  currentUserId?: string
  onRemoveMember: (userId: string) => void
}

/** Tab: Mitgliederliste plus Einladungs-Aktionen (Link teilen / Code kopieren). */
export default function MembersTab({ members, group, currentUserId, onRemoveMember }: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareInvite = async () => {
    const url = `${window.location.origin}/join/${group.invite_code}`
    const shareData = {
      title: t('groups.shareTitle', { name: group.name }),
      text: t('groups.shareText', { name: group.name }),
      url,
    }
    if (navigator.share) {
      try { await navigator.share(shareData) } catch { /* Abbruch durch Nutzer */ }
    } else {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {members.map(m => (
        <div key={m.user_id} className="flex items-center justify-between bg-stone-900 rounded-xl px-4 py-3">
          <Link to={`/user/${m.user_id}`} className="min-w-0">
            <p className="font-medium text-stone-200 hover:text-amber-400 transition-colors truncate">
              {m.profiles?.display_name ?? m.profiles?.username}
            </p>
            <p className="text-xs text-stone-500 truncate">@{m.profiles?.username}</p>
          </Link>
          <div className="flex items-center gap-2">
            {m.user_id === group.owner_id && (
              <span className="text-xs bg-amber-500/20 text-amber-400 rounded px-2 py-0.5">{t('groups.owner')}</span>
            )}
            {m.role === 'admin' && m.user_id !== group.owner_id && (
              <span className="text-xs bg-stone-700 text-stone-300 rounded px-2 py-0.5">{t('groups.admin')}</span>
            )}
            {currentUserId === group.owner_id && m.user_id !== group.owner_id && (
              <button
                onClick={() => onRemoveMember(m.user_id)}
                className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 rounded px-2 py-0.5 transition-colors"
              >
                {t('groups.remove')}
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Einladen */}
      <div className="mt-4 bg-stone-900 rounded-xl p-4 text-center">
        <p className="text-stone-400 text-sm mb-3">{t('groups.inviteNewMembers')}</p>
        <button
          onClick={shareInvite}
          className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors mb-2"
        >
          {linkCopied ? t('groups.linkCopied') : t('groups.shareInviteLink')}
        </button>
        <button
          onClick={copyInviteCode}
          className="text-stone-500 hover:text-stone-300 text-xs font-mono"
        >
          {copied ? t('groups.codeCopied') : t('groups.orCopyCode', { code: group.invite_code })}
        </button>
      </div>
    </div>
  )
}
