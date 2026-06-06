import { useEffect } from 'react'

// Basistitel/-beschreibung spiegeln die statischen Tags in index.html.
const DEFAULT_TITLE = 'Cask Lounge – Whisky entdecken & bewerten'
const DEFAULT_DESC = 'Whiskys entdecken, bewerten, vergleichen und mit deiner Tasting-Gruppe teilen.'

function setMeta(attr: 'name' | 'property', key: string, value: string) {
  const el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (el) el.setAttribute('content', value)
}

interface Opts {
  title?: string
  description?: string
}

// Aktualisiert <title> und die wichtigsten OG/Twitter-Tags pro Seite.
// Hinweis: Social-Crawler (WhatsApp, Facebook) führen kein JS aus – für
// echte Pro-Whisky-Vorschaubilder wäre serverseitiges Rendering nötig.
// Für Browser-Tabs und Google (rendert JS) wirkt das hier dennoch.
export function usePageMeta({ title, description }: Opts = {}) {
  const fullTitle = title ? `${title} · Cask Lounge` : DEFAULT_TITLE
  const desc = description ?? DEFAULT_DESC

  useEffect(() => {
    document.title = fullTitle
    setMeta('name', 'description', desc)
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:url', window.location.href)
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    return () => {
      document.title = DEFAULT_TITLE
      setMeta('name', 'description', DEFAULT_DESC)
      setMeta('property', 'og:title', DEFAULT_TITLE)
      setMeta('property', 'og:description', DEFAULT_DESC)
    }
  }, [fullTitle, desc])
}
