/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA-Navigations-Fallback: Da Routing clientseitig passiert, liefern wir für
// jede Seitennavigation die vorab gecachte index.html aus. Dadurch lädt die
// App-Shell auch offline bzw. bei Deep-Links – React Router rendert dann die
// passende Route, und Datenabrufe greifen auf den supabase-Cache zurück.
// Supabase-/Auth-Endpunkte sind ausgenommen (sollen echtes Netzwerk treffen).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /supabase/i, /\/auth\//],
  }),
)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Cask Lounge', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data?.url as string) ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const existing = clients.find(c => c.url === url)
      if (existing) return existing.focus()
      return self.clients.openWindow(url)
    })
  )
})
