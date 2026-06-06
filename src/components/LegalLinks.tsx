import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function LegalLinks({ className = '' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div className={`flex items-center justify-center gap-3 text-xs text-stone-600 ${className}`}>
      <Link to="/impressum" className="hover:text-stone-400 transition-colors">{t('legal.impressum')}</Link>
      <span>·</span>
      <Link to="/datenschutz" className="hover:text-stone-400 transition-colors">{t('legal.datenschutz')}</Link>
      <span>·</span>
      <Link to="/agb" className="hover:text-stone-400 transition-colors">{t('legal.agb')}</Link>
    </div>
  )
}
