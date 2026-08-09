// Datenzugriffe für Tastings einer Gruppe.
import { supabase } from '../supabase'

export interface Tasting {
  id: string
  title: string
  status: string
  event_date: string | null
  hosted_by: string
  group_id: string
}

export interface NewTasting {
  group_id: string
  title: string
  hosted_by: string
  event_date: string | null
}

/** Ein Teilnehmer-Drink eines Tastings inkl. eingebettetem Drink. */
export interface TastingDrink {
  drink_id: string
  position: number
  drinks: { id: string; name: string; producer: string | null; photo_url: string | null }
}

/** Eine abgegebene Bewertung innerhalb eines Tastings. */
export interface TastingRating {
  id: string
  drink_id: string
  user_id: string
  nose: number | null
  taste: number | null
  finish: number | null
  overall: number | null
  wheels: { nose: number[]; taste: number[]; aromas?: string[]; extra?: string[] }
  note: string | null
}

/** Nutzlast zum Anlegen/Aktualisieren einer Tasting-Bewertung. */
export interface TastingRatingPayload {
  tasting_id: string
  drink_id: string
  user_id: string
  nose: number
  taste: number
  finish: number
  overall: number
  wheels: TastingRating['wheels']
  note: string | null
}

/** Alle Tastings einer Gruppe, neueste zuerst. */
export async function listTastings(groupId: string): Promise<Tasting[]> {
  const { data } = await supabase
    .from('tastings')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Legt ein Tasting an und gibt dessen ID zurück. Wirft bei Fehler. */
export async function createTasting(input: NewTasting): Promise<string> {
  const { data, error } = await supabase
    .from('tastings')
    .insert({ ...input, status: 'open' })
    .select('id')
    .single()
  if (error) throw error
  return data.id as string
}

/** Ein einzelnes Tasting per ID. Wirft bei Fehler (Aufrufer zeigt Ladefehler). */
export async function getTasting(tastingId: string): Promise<Tasting | null> {
  const { data, error } = await supabase
    .from('tastings')
    .select('*')
    .eq('id', tastingId)
    .single()
  if (error) throw error
  return (data as Tasting) ?? null
}

/** Die Teilnehmer-Drinks eines Tastings, nach Position sortiert. */
export async function listTastingDrinks(tastingId: string): Promise<TastingDrink[]> {
  const { data } = await supabase
    .from('tasting_drinks')
    .select('drink_id, position, drinks(id, name, producer, photo_url)')
    .eq('tasting_id', tastingId)
    .order('position')
  return (data as unknown as TastingDrink[]) ?? []
}

/** Alle Bewertungen eines Tastings. */
export async function loadTastingRatings(tastingId: string): Promise<TastingRating[]> {
  const { data } = await supabase
    .from('tasting_ratings')
    .select('*')
    .eq('tasting_id', tastingId)
  return (data as TastingRating[]) ?? []
}

/** Fügt einem Tasting einen Drink an der angegebenen Position hinzu. Wirft bei Fehler. */
export async function addTastingDrink(tastingId: string, drinkId: string, position: number): Promise<void> {
  const { error } = await supabase
    .from('tasting_drinks')
    .insert({ tasting_id: tastingId, drink_id: drinkId, position })
  if (error) throw error
}

/** Legt eine Tasting-Bewertung an bzw. aktualisiert sie (ein Vote pro Drink/Nutzer). Wirft bei Fehler. */
export async function upsertTastingRating(payload: TastingRatingPayload): Promise<void> {
  const { error } = await supabase
    .from('tasting_ratings')
    .upsert(payload, { onConflict: 'tasting_id,drink_id,user_id' })
  if (error) throw error
}

/** Schließt ein Tasting (best-effort). */
export async function closeTasting(tastingId: string): Promise<void> {
  await supabase.from('tastings').update({ status: 'closed' }).eq('id', tastingId)
}
