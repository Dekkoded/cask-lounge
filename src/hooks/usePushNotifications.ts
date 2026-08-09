import { useState, useEffect } from 'react'
import { savePushSubscription, removePushSubscription } from '../lib/queries/push'
import { useAuth } from '../context/auth-context'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const { user } = useAuth()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('Notification' in window)) return
    setPermission(Notification.permission)

    if (Notification.permission === 'granted' && user) {
      checkSubscription()
    }
  }, [user])

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    setSubscribed(!!sub)
  }

  const subscribe = async () => {
    if (!user) { alert('Nicht eingeloggt'); return }
    if (!('serviceWorker' in navigator)) { alert('Service Worker nicht verfügbar'); return }
    if (!('PushManager' in window)) { alert('Push wird von diesem Browser nicht unterstützt. iOS 16.4+ als PWA nötig.'); return }
    setLoading(true)

    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { setLoading(false); return }

      const reg = await navigator.serviceWorker.ready
      if (!reg.pushManager) {
        alert('Push wird von diesem Browser/Gerät nicht unterstützt.')
        setLoading(false)
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = sub.toJSON()
      try {
        await savePushSubscription(user.id, sub.endpoint, subJson)
      } catch (error) {
        alert('Fehler beim Speichern: ' + (error as Error).message)
        setLoading(false)
        return
      }

      setSubscribed(true)
    } catch (err) {
      alert('Push-Fehler: ' + String(err))
    }
    setLoading(false)
  }

  const unsubscribe = async () => {
    if (!user || !('serviceWorker' in navigator)) return
    setLoading(true)
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      await removePushSubscription(user.id, sub.endpoint)
    }
    setSubscribed(false)
    setLoading(false)
  }

  return { permission, subscribed, loading, subscribe, unsubscribe }
}
