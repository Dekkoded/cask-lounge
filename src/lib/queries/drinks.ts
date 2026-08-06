// Typisierte Datenzugriffs-Schicht für die Tabelle `drinks`.
//
// Kapselt Tabellenname, Select-Strings und Kategorie-Filter an EINER Stelle,
// damit Komponenten schlank bleiben und die Datenzugriffe testbar sind.
//
// Konvention:
//  - Lesezugriffe sind best-effort: bei Fehlern liefern sie einen leeren/leeren
//    Default ([] bzw. null), genau wie der bisherige Inline-Code (`data ?? []`).
//  - Schreibzugriffe werfen bei einem Postgrest-Fehler, weil die Aufrufer die
//    Fehlermeldung dem Nutzer anzeigen (try/catch am Call-Site).

import { supabase } from '../supabase'
import type { Drink } from '../types'

/** Alle Drinks dieser App sind aktuell Whiskys. */
const WHISKY = 'whisky'

/** Schlanke Liste für Dropdowns. */
export interface DrinkListItem {
  id: string
  name: string
}

/** Liste mit Produzent (z. B. Duplikat-Hinweise, Tasting-Auswahl). */
export interface DrinkOption extends DrinkListItem {
  producer: string | null
}

/** Kernfelder für die Vergleichsansicht und als Insert-Rückgabe. */
export interface DrinkCompareData extends DrinkOption {
  region: string | null
  photo_url: string | null
}

/** Eingabe zum Anlegen eines neuen Drinks (Kategorie wird intern gesetzt). */
export interface NewDrink {
  name: string
  producer: string | null
  region: string | null
  age_years: number | null
  abv: number | null
  photo_url: string | null
  created_by: string
}

/** Änderbare Felder eines Drinks. */
export type DrinkUpdate = Partial<
  Pick<Drink, 'name' | 'producer' | 'region' | 'age_years' | 'abv' | 'photo_url'>
>

/** Alle Whiskys als {id, name}, alphabetisch – für Auswahl-Dropdowns. */
export async function listWhiskies(): Promise<DrinkListItem[]> {
  const { data } = await supabase
    .from('drinks')
    .select('id, name')
    .eq('category', WHISKY)
    .order('name')
  return data ?? []
}

/** Alle Whiskys inkl. Produzent, alphabetisch. */
export async function listWhiskyOptions(): Promise<DrinkOption[]> {
  const { data } = await supabase
    .from('drinks')
    .select('id, name, producer')
    .eq('category', WHISKY)
    .order('name')
  return data ?? []
}

/** Fuzzy-Namenssuche (ilike) für Duplikat-Hinweise beim Anlegen. */
export async function searchWhiskiesByName(query: string, limit = 4): Promise<DrinkOption[]> {
  const { data } = await supabase
    .from('drinks')
    .select('id, name, producer')
    .eq('category', WHISKY)
    .ilike('name', `%${query}%`)
    .limit(limit)
  return data ?? []
}

/** Vollständiger Drink per ID, oder null wenn nicht vorhanden. */
export async function getDrink(id: string): Promise<Drink | null> {
  const { data } = await supabase.from('drinks').select('*').eq('id', id).single()
  return (data as Drink | null) ?? null
}

/** Kernfelder eines Drinks für die Vergleichsansicht, oder null. */
export async function getDrinkForCompare(id: string): Promise<DrinkCompareData | null> {
  const { data } = await supabase
    .from('drinks')
    .select('id, name, producer, region, photo_url')
    .eq('id', id)
    .single()
  return (data as DrinkCompareData | null) ?? null
}

/** Legt einen neuen Drink an und gibt die angelegte Zeile zurück. Wirft bei Fehler. */
export async function createDrink(input: NewDrink): Promise<DrinkCompareData> {
  const { data, error } = await supabase
    .from('drinks')
    .insert({ category: WHISKY, ...input })
    .select('id, name, producer, region, photo_url')
    .single()
  if (error) throw error
  return data as DrinkCompareData
}

/** Aktualisiert einen Drink. Wirft bei Fehler. */
export async function updateDrink(id: string, patch: DrinkUpdate): Promise<void> {
  const { error } = await supabase.from('drinks').update(patch).eq('id', id)
  if (error) throw error
}

/** Löscht einen Drink. Wirft bei Fehler. */
export async function deleteDrink(id: string): Promise<void> {
  const { error } = await supabase.from('drinks').delete().eq('id', id)
  if (error) throw error
}
