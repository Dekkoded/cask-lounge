import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context'

export default function Home() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8">
      <h1 className="font-display text-4xl font-semibold text-amber-400 tracking-tight">{t('landing.homeTitle')}</h1>
      <p className="text-stone-300">
        {t('landing.loggedInAs')} <span className="text-amber-400 font-medium">{user?.email}</span>
      </p>
      <p className="text-stone-500 text-sm">{t('landing.phase1Success')}</p>
      <button
        onClick={signOut}
        className="mt-4 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg px-4 py-2 text-sm transition-colors"
      >
        {t('landing.signOut')}
      </button>
    </div>
  )
}
