import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LegalLinks from '../components/LegalLinks'

export default function Signup() {
  const { t } = useTranslation()
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
      setError(t('auth.signup.usernameTooShort'))
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
    setResendMsg(error ? t('auth.verify.resendError', { message: error.message }) : t('auth.verify.resendSuccess'))
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-amber-400 mb-2 text-center tracking-tight">Cask Lounge</h1>
        <p className="text-stone-400 text-center mb-8">{awaitingCode ? t('auth.signup.confirmTitle') : t('auth.signup.createTitle')}</p>

        {awaitingCode ? (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <p className="text-stone-400 text-sm text-center">
              {t('auth.verify.codeSentBefore')} <span className="text-stone-200">{email}</span> {t('auth.verify.codeSentAfter')}
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
              {verifying ? t('auth.verify.submitting') : t('auth.verify.submit')}
            </button>

            <button type="button" onClick={handleResend}
              className="text-stone-500 hover:text-stone-300 text-sm text-center transition-colors">
              {t('auth.verify.resend')}
            </button>
            {resendMsg && <p className="text-amber-400 text-xs text-center">{resendMsg}</p>}
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('auth.signup.usernameLabel')}</label>
            <input
              type="text"
              required
              value={username}
              onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('auth.signup.emailLabel')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-stone-300 mb-1">{t('auth.signup.passwordLabel')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder={t('auth.signup.passwordPlaceholder')}
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
            {loading ? t('auth.signup.submitting') : t('auth.signup.submit')}
          </button>

          <p className="text-stone-500 text-xs text-center">
            {t('auth.signup.terms')}{' '}
            <Link to="/agb" className="text-stone-400 hover:text-stone-200 underline">{t('auth.signup.termsLink')}</Link>{' '}
            {t('auth.signup.and')}{' '}
            <Link to="/datenschutz" className="text-stone-400 hover:text-stone-200 underline">{t('auth.signup.privacyLink')}</Link>.
          </p>
        </form>
        )}

        <p className="text-stone-500 text-sm text-center mt-6">
          {t('auth.signup.haveAccount')}{' '}
          <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'} className="text-amber-400 hover:text-amber-300">
            {t('auth.signup.loginLink')}
          </Link>
        </p>

        <LegalLinks className="mt-10" />
      </div>
    </div>
  )
}
