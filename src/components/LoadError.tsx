import { useTranslation } from 'react-i18next'

// Einheitlicher Zustand für fehlgeschlagene Lade-Anfragen: zeigt einen Hinweis
// statt einer kommentarlos leeren Liste und bietet einen Wiederholen-Button.
export default function LoadError({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex flex-col items-center gap-3 text-center py-12">
      <span className="text-3xl">⚠️</span>
      <p className="text-stone-400 text-sm max-w-xs">{t('errors.loadFailed')}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-medium transition-colors"
        >
          {t('errors.retry')}
        </button>
      )}
    </div>
  )
}
