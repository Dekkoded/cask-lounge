import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function JoinGroup() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || !user || !code) return

    supabase.rpc('join_group', { p_invite_code: code }).then(({ data, error }) => {
      if (error || !data) {
        setError(error?.message ?? 'Beitritt fehlgeschlagen. Ist der Link noch gültig?')
        return
      }
      navigate(`/groups/${data}`, { replace: true })
    })
  }, [user, loading, code, navigate])

  if (loading) {
    return <Centered>Lädt…</Centered>
  }

  // Eingeloggt: Beitritt läuft (oder Fehler)
  if (user) {
    if (error) {
      return (
        <Centered>
          <p className="text-stone-300 mb-4">{error}</p>
          <Link to="/groups" className="text-amber-400 hover:text-amber-300">Zu meinen Gruppen</Link>
        </Centered>
      )
    }
    return <Centered>Du trittst der Gruppe bei…</Centered>
  }

  // Gast: zur Registrierung / Anmeldung leiten, Code im Ziel erhalten
  const next = encodeURIComponent(`/join/${code}`)
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🥃</div>
        <h1 className="text-2xl font-bold text-amber-400 mb-2">Du wurdest eingeladen</h1>
        <p className="text-stone-400 mb-8">
          Tritt einer Whisky-Gruppe auf Cask Lounge bei. Erstelle ein Konto oder melde dich an, um beizutreten.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            to={`/signup?next=${next}`}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            Konto erstellen & beitreten
          </Link>
          <Link
            to={`/login?next=${next}`}
            className="text-stone-400 hover:text-stone-200 text-sm transition-colors"
          >
            Ich habe schon ein Konto
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
