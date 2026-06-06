import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const { t } = useTranslation()
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('install-dismissed') === '1')

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  const handleInstall = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDismissed(true)
      localStorage.setItem('install-dismissed', '1')
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('install-dismissed', '1')
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto bg-stone-800 border border-stone-700 rounded-2xl p-4 flex items-center gap-3 shadow-xl z-50">
      <span className="text-2xl">🥃</span>
      <div className="flex-1">
        <p className="text-stone-100 font-semibold text-sm">{t('install.title')}</p>
        <p className="text-stone-400 text-xs">{t('install.subtitle')}</p>
      </div>
      <button
        onClick={handleInstall}
        className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold rounded-lg px-3 py-1.5 text-sm"
      >
        {t('install.action')}
      </button>
      <button onClick={handleDismiss} className="text-stone-500 hover:text-stone-300 text-lg leading-none">×</button>
    </div>
  )
}
