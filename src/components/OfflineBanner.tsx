import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Zeigt einen dezenten Hinweis, sobald die Verbindung wegbricht. Die App
// bleibt dank Service-Worker-Cache benutzbar; der Banner erklärt nur, warum
// ggf. keine neuen Daten geladen werden.
export default function OfflineBanner() {
  const { t } = useTranslation()
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOffline(false)
    const goOffline = () => setOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      role="status"
      className="fixed bottom-20 inset-x-0 z-[70] flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-2 bg-stone-800 border border-stone-700 text-stone-200 text-sm rounded-full px-4 py-2 shadow-lg">
        <span>📡</span>
        {t('offline.banner')}
      </div>
    </div>
  )
}
