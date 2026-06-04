import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LegalLinks from '../components/LegalLinks'

export default function Signup() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Erscheint nur, wenn Supabase E-Mail-Bestätigung aktiv ist (signUp liefert dann keine Session).
  const [awaitingCode, setAwaitingCode] = useState(false)
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resendMsg, setResendMsg] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (username.length < 3) {
      setError('Benutzername muss mindestens 3 Zeichen lang sein.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Session vorhanden → E-Mail-Bestätigung ist deaktiviert, direkt rein.
    // Keine Session → Bestätigung aktiv, 6-stelligen Code abfragen.
    if (data.session) {
      navigate(next ?? '/', { replace: true })
    } else {
      setAwaitingCode(true)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setVerifying(true)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'signup',
    })

    setVerifying(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(next ?? '/', { replace: true })
  }

  const handleResend = async () => {
    setResendMsg(null)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setResendMsg(error ? 'Fehler: ' + error.message : 'Neuer Code gesendet.')
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-amber-400 mb-2 text-center">Cask Lounge</h1>
        <p className="text-stone-400 text-center mb-8">{awaitingCode ? 'E-Mail bestätigen' : 'Konto erstellen'}</p>

        {awaitingCode ? (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <p className="text-stone-400 text-sm text-center">
              Wir haben dir einen 6-stelligen Code an <span className="text-stone-200">{email}</span> geschickt.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:border-amber-500"
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={verifying || code.length < 6}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors"
            >
              {verifying ? 'Wird geprüft…' : 'Bestätigen'}
            </button>

            <button type="button" onClick={handleResend}
              className="text-stone-500 hover:text-stone-300 text-sm text-center transition-colors">
              Code erneut senden
            </button>
            {resendMsg && <p className="text-amber-400 text-xs text-center">{resendMsg}</p>}
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">Benutzername</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">Passwort</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="mind. 6 Zeichen"
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
            {loading ? 'Konto wird erstellt…' : 'Konto erstellen'}
          </button>

          <p className="text-stone-500 text-xs text-center">
            Mit der Registrierung akzeptierst du unsere{' '}
            <Link to="/agb" className="text-stone-400 hover:text-stone-200 underline">AGB</Link>{' '}
            und{' '}
            <Link to="/datenschutz" className="text-stone-400 hover:text-stone-200 underline">Datenschutzerklärung</Link>.
          </p>
        </form>
        )}

        <p className="text-stone-500 text-sm text-center mt-6">
          Schon ein Konto?{' '}
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="text-amber-400 hover:text-amber-300">
            Anmelden
          </Link>
        </p>

        <LegalLinks className="mt-10" />
      </div>
    </div>
  )
}
