// Amazon Associates Tag – sobald du ein Konto hast, hier eintragen (z. B. 'casklounge-21').
// Solange leer, funktionieren die Suchlinks ohne Provision.
export const AMAZON_TAG = ''

export function amazonSearchUrl(query: string): string {
  const params = new URLSearchParams({ k: query })
  if (AMAZON_TAG) params.set('tag', AMAZON_TAG)
  return `https://www.amazon.de/s?${params.toString()}`
}
