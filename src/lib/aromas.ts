// Kuratierte, weit verbreitete Whisky-Aromen, gruppiert nach den offiziellen
// Kategorien des Whisky-Aromarads (SWRI/Pentlands). Schlüssel sind stabil und
// sprachunabhängig; die Anzeige läuft über i18n (whisky.aromaList.<key>).
export const AROMA_GROUPS: { category: string; aromas: string[] }[] = [
  { category: 'fruity', aromas: ['apple', 'pear', 'citrus', 'banana', 'driedFruit', 'berry'] },
  { category: 'floral', aromas: ['rose', 'heather', 'hay', 'grassy'] },
  { category: 'spicy', aromas: ['cinnamon', 'pepper', 'clove', 'ginger', 'nutmeg'] },
  { category: 'grainy', aromas: ['malt', 'biscuit', 'cereal', 'bread'] },
  { category: 'peaty', aromas: ['peat', 'earth', 'bonfire', 'medicinal'] },
  { category: 'sulphury', aromas: ['rubber', 'matchstick'] },
  { category: 'yeasty', aromas: ['dough', 'beery'] },
  { category: 'nutty', aromas: ['almond', 'walnut', 'hazelnut', 'marzipan'] },
  { category: 'woody', aromas: ['oak', 'cedar', 'resin', 'vanilla'] },
  { category: 'winey', aromas: ['sherry', 'port', 'redWine', 'raisin'] },
  { category: 'chocolate', aromas: ['darkChocolate', 'cocoa', 'coffee'] },
  { category: 'smoky', aromas: ['smoke', 'ash', 'tar', 'leather'] },
  { category: 'sweet', aromas: ['honey', 'caramel', 'toffee', 'butterscotch'] },
]

// Schnelle Lookup-Menge aller bekannten kuratierten Schlüssel.
const KNOWN = new Set(AROMA_GROUPS.flatMap(g => g.aromas))

export const isKnownAroma = (key: string) => KNOWN.has(key)

// Hilfsfunktion zum Anzeigen einer Aroma-Liste (kuratiert + frei) als Chips,
// z.B. in der schreibgeschützten Bewertungsansicht.
export function aromaLabel(key: string, t: (k: string) => string): string {
  return isKnownAroma(key) ? t(`whisky.aromaList.${key}`) : key
}
