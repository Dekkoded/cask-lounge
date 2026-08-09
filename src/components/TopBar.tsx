import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/auth-context'

export default function TopBar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useTranslation()

  // Header liegt im Ruhezustand flach auf dem Grund; erst beim Scrollen
  // erscheinen Trennlinie + weicher Schatten (Apple-Standard: Elevation on
  // scroll). Passiver Listener, initial einmal geprüft.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      className={`sticky top-0 z-40 bg-app/90 backdrop-blur border-b transition-[border-color,box-shadow] duration-200 ${
        scrolled
          ? 'border-stone-800/50 shadow-[0_4px_20px_-12px_rgba(0,0,0,0.6)]'
          : 'border-transparent'
      }`}
    >
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
