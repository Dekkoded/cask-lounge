// Aggregiert das "Archiv" einer Gruppe: alle in der Gruppe bewerteten Whiskys
// aus zwei Quellen – geteilte Einzelbewertungen (group_ratings) und
// Tasting-Bewertungen (tasting_drinks + tasting_ratings) – zusammengeführt und
// nach Durchschnitts-Score sortiert.
import { supabase } from '../supabase'

export interface ArchiveDrink {
  id: string
  name: string
  producer: string | null
  photo_url: string | null
  scores: number[] // alle overall-Werte aus group_ratings + tasting_ratings
}

type DrinkRef = { id: string; name: string; producer: string | null; photo_url: string | null }

export async function loadGroupArchive(groupId: string): Promise<ArchiveDrink[]> {
  // Quelle 1: via group_ratings geteilte Bewertungen
  const { data: grData } = await supabase
    .from('group_ratings')
    .select('ratings(overall, drinks(id, name, producer, photo_url))')
    .eq('group_id', groupId)

  // Quelle 2: Tasting-IDs dieser Gruppe holen, dann tasting_drinks + tasting_ratings
  const { data: tastingRows } = await supabase.from('tastings').select('id').eq('group_id', groupId)
  const tastingIds = (tastingRows ?? []).map(t => t.id)

  let tdData: { drink_id: string; drinks: DrinkRef }[] = []
  let trData: { drink_id: string; overall: number | null }[] = []

  if (tastingIds.length > 0) {
    const { data: td } = await supabase
      .from('tasting_drinks')
      .select('drink_id, drinks(id, name, producer, photo_url)')
      .in('tasting_id', tastingIds)
    tdData = (td as unknown as typeof tdData) ?? []

    const { data: tr } = await supabase
      .from('tasting_ratings')
      .select('drink_id, overall')
      .in('tasting_id', tastingIds)
    trData = tr ?? []
  }

  // Alle Drinks zusammenführen — Map by drink_id
  const map = new Map<string, ArchiveDrink>()

  const addDrink = (d: DrinkRef) => {
    if (!map.has(d.id)) map.set(d.id, { id: d.id, name: d.name, producer: d.producer, photo_url: d.photo_url, scores: [] })
  }

  // group_ratings
  for (const gr of grData ?? []) {
    const r = gr.ratings as unknown as { overall: number | null; drinks: DrinkRef }
    if (!r?.drinks) continue
    addDrink(r.drinks)
    if (r.overall != null) map.get(r.drinks.id)!.scores.push(r.overall)
  }

  // tasting_drinks (stellt sicher dass auch unbewertete Whiskys erscheinen)
  for (const td of tdData) {
    if (td.drinks) addDrink(td.drinks)
  }

  // tasting_ratings scores hinzufügen
  for (const tr of trData) {
    if (tr.overall != null && map.has(tr.drink_id)) {
      map.get(tr.drink_id)!.scores.push(tr.overall)
    }
  }

  // Nach Durchschnitt sortieren
  return Array.from(map.values()).sort((a, b) => {
    const avgA = a.scores.length ? a.scores.reduce((s, v) => s + v, 0) / a.scores.length : -1
    const avgB = b.scores.length ? b.scores.reduce((s, v) => s + v, 0) / b.scores.length : -1
    return avgB - avgA
  })
}
