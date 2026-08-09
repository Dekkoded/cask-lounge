import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context'

export default function TopBar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()

  return (
    <div className="sticky top-0 z-40 bg-app/90 backdrop-blur border-b border-stone-800/50">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="font-display text-amber-400 font-semibold text-xl tracking-tight"
        >
          Cask Lounge
        </button>
        {!user && (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-stone-400 hover:text-stone-200 text-sm transition-colors">{t('nav.login')}</Link>
            <Link to="/signup" className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-3 py-1.5 text-sm">{t('nav.register')}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
