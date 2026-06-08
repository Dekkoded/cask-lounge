// Amazon Associates Partner-Tag.
// Am einfachsten als Umgebungsvariable in Vercel setzen: VITE_AMAZON_TAG=casklounge-21
// (Project → Settings → Environment Variables, danach neu deployen).
// Alternativ direkt als Fallback hier eintragen. Solange leer, sind es
// normale Such-Links ohne Provision und die Affiliate-Hinweise bleiben aus.
const ENV_TAG = (import.meta.env.VITE_AMAZON_TAG as string | undefined)?.trim()
const FALLBACK_TAG = ''

export const AMAZON_TAG = ENV_TAG || FALLBACK_TAG
export const AMAZON_ENABLED = AMAZON_TAG.length > 0

export function amazonSearchUrl(query: string): string {
  const params = new URLSearchParams({ k: query })
  if (AMAZON_TAG) params.set('tag', AMAZON_TAG)
  return `https://www.amazon.de/s?${params.toString()}`
}
