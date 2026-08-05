import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import LegalLinks from '../components/LegalLinks'

export default function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const next = searchParams.get('next')
  const from = next ?? (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    navigate(from, { replace: true })
  }

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setResetLoading(false)
    setResetSent(true)
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-amber-400 mb-2 text-center tracking-tight">Cask Lounge</h1>
        <p className="text-stone-400 text-center mb-8">{t('auth.login.subtitle')}</p>

        {!showReset ? (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-stone-300 mb-1">{t('auth.login.emailLabel')}</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
                  placeholder="du@example.com" />
              </div>
              <div>
                <label className="block text-sm text-stone-300 mb-1">{t('auth.login.passwordLabel')}</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500"
                  placeholder="••••••••" />
              </div>
              {error && (
                <p className="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg px-4 py-2">{error}</p>
              )}
              <button type="submit" disabled={loading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5 transition-colors">
                {loading ? t('auth.login.submitting') : t('auth.login.submit')}
              </button>
            </form>

            <button onClick={() => setShowReset(true)}
              className="w-full text-stone-500 hover:text-stone-300 text-sm text-center mt-4 transition-colors">
              {t('auth.login.forgotPassword')}
            </button>

            <p className="text-stone-500 text-sm text-center mt-4">
              {t('auth.login.noAccount')}{' '}
              <Link to={next ? `/signup?next=${encodeURIComponent(next)}` : '/signup'} className="text-amber-400 hover:text-amber-300">{t('auth.login.registerLink')}</Link>
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-stone-200">{t('auth.reset.title')}</h2>
            {resetSent ? (
              <p className="text-green-400 text-sm bg-green-950 border border-green-800 rounded-lg px-4 py-3">
                {t('auth.reset.sent')}
              </p>
            ) : (
              <form onSubmit={handleReset} className="flex flex-col gap-3">
                <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                  placeholder={t('auth.reset.emailPlaceholder')}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-2.5 text-stone-100 focus:outline-none focus:border-amber-500" />
                <button type="submit" disabled={resetLoading}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-lg px-4 py-2.5">
                  {resetLoading ? t('auth.reset.submitting') : t('auth.reset.submit')}
                </button>
              </form>
            )}
            <button onClick={() => setShowReset(false)} className="text-stone-500 hover:text-stone-300 text-sm text-center">
              ← {t('auth.reset.backToLogin')}
            </button>
          </div>
        )}

        <LegalLinks className="mt-10" />
      </div>
    </div>
  )
}
