import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { joinGroup } from '../lib/queries/groups'
import { useAuth } from '../context/AuthContext'

export default function JoinGroup() {
  const { t } = useTranslation()
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user || !code) return

    joinGroup(code)
      .then(groupId => {
        if (!groupId) { setError(t('groups.joinFailed')); return }
        navigate(`/groups/${groupId}`, { replace: true })
      })
      .catch(err => setError((err as Error).message ?? t('groups.joinFailed')))
    // t bewusst nicht als Dependency: der Beitritt soll nur bei Auth/Code-Änderung
    // erneut laufen, nicht bei einem Sprachwechsel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, code, navigate])

  if (loading) {
    return <Centered>{t('common.loading')}</Centered>
  }

  // Eingeloggt: Beitritt läuft (oder Fehler)
  if (user) {
    if (error) {
      return (
        <Centered>
          <p className="text-stone-300 mb-4">{error}</p>
          <Link to="/groups" className="text-amber-400 hover:text-amber-300">{t('groups.toMyGroups')}</Link>
        </Centered>
      )
    }
    return <Centered>{t('groups.joining')}</Centered>
  }

  // Gast: zur Registrierung / Anmeldung leiten, Code im Ziel erhalten
  const next = encodeURIComponent(`/join/${code}`)
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🥃</div>
        <h1 className="font-display text-2xl font-semibold text-amber-400 mb-2">{t('groups.invitedTitle')}</h1>
        <p className="text-stone-400 mb-8">
          {t('groups.invitedSub')}
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/signup?next=${next}`}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            {t('groups.createAccountAndJoin')}
          </Link>
          <Link
            to={`/login?next=${next}`}
            className="text-stone-400 hover:text-stone-200 text-sm transition-colors"
          >
            {t('groups.haveAccount')}
          </Link>
        </div>
      </div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="text-center text-stone-400">{children}</div>
    </div>
  )
}
