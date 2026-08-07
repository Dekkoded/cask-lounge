// Datenzugriffe für Battles: Gruppen-Listen, öffentlicher Feed sowie das
// Detail-Battle mit Contendern und Abstimmung.
import { supabase } from '../supabase'
import type { Drink } from '../types'

export interface BattleListItem {
  id: string
  status: string
  battle_drinks: { position: number; drinks: { name: string } | null }[]
}

/** Öffentlicher Battle-Feed-Eintrag (inkl. Zeitstempel und Gruppe). */
export interface BattleFeedItem {
  id: string
  status: string
  created_at: string
  group_id: string | null
  battle_drinks: { position: number; drinks: { name: string } | null }[]
}

export interface BattleRow {
  id: string
  group_id: string | null
  status: string
  created_by: string | null
}

export interface BattleVote {
  drink_id: string
  user_id: string
}

export interface BattleContender {
  drink: Drink
  position: number
}

/** Alle Battles einer Gruppe inkl. Teilnehmer-Drinks, neueste zuerst. */
export async function listBattles(groupId: string): Promise<BattleListItem[]> {
  const { data } = await supabase
    .from('battles')
    .select('id, status, battle_drinks(position, drinks(name))')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
  return (data as unknown as BattleListItem[]) ?? []
}

/** Öffentlicher Feed aller Battles, neueste zuerst. Wirft bei Fehler. */
export async function listAllBattles(): Promise<BattleFeedItem[]> {
  const { data, error } = await supabase
    .from('battles')
    .select('id, status, created_at, group_id, battle_drinks(position, drinks(name))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as BattleFeedItem[]) ?? []
}

/**
 * Legt ein Battle samt Teilnehmer-Drinks an und gibt die Battle-ID zurück.
 * `groupId` ist null für öffentliche Battles. Wirft, falls das Battle selbst
 * nicht angelegt werden kann; ein Fehler beim Einfügen der battle_drinks wird
 * (wie bisher) still ignoriert.
 */
export async function createBattle(
  groupId: string | null,
  createdBy: string,
  drinkIds: string[],
): Promise<string> {
  const { data, error } = await supabase
    .from('battles')
    .insert({ group_id: groupId, created_by: createdBy, status: 'open' })
    .select('id')
    .single()
  if (error) throw error
  const rows = drinkIds.map((drink_id, position) => ({ battle_id: data.id, drink_id, position }))
  await supabase.from('battle_drinks').insert(rows)
  return data.id as string
}

/** Ein einzelnes Battle per ID. Wirft bei Fehler (Aufrufer zeigt Ladefehler). */
export async function getBattle(battleId: string): Promise<BattleRow | null> {
  const { data, error } = await supabase
    .from('battles')
    .select('id, group_id, status, created_by')
    .eq('id', battleId)
    .maybeSingle()
  if (error) throw error
  return (data as BattleRow) ?? null
}

/** Die Teilnehmer-Drinks eines Battles, nach Position sortiert. */
export async function listBattleContenders(battleId: string): Promise<BattleContender[]> {
  const { data } = await supabase
    .from('battle_drinks')
    .select('position, drinks(*)')
    .eq('battle_id', battleId)
    .order('position')
  return ((data as unknown as { position: number; drinks: Drink | null }[]) ?? [])
    .filter(r => r.drinks)
    .map(r => ({ drink: r.drinks as Drink, position: r.position }))
}

/** Alle Stimmen eines Battles. */
export async function loadBattleVotes(battleId: string): Promise<BattleVote[]> {
  const { data } = await supabase
    .from('battle_votes')
    .select('drink_id, user_id')
    .eq('battle_id', battleId)
  return (data as BattleVote[]) ?? []
}

/** Gibt eine Stimme ab bzw. ändert sie (ein Vote pro Nutzer). Wirft bei Fehler. */
export async function castBattleVote(battleId: string, drinkId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('battle_votes')
    .upsert({ battle_id: battleId, drink_id: drinkId, user_id: userId }, { onConflict: 'battle_id,user_id' })
  if (error) throw error
}

/** Öffnet/schließt ein Battle (best-effort). */
export async function setBattleStatus(battleId: string, status: string): Promise<void> {
  await supabase.from('battles').update({ status }).eq('id', battleId)
}

/** Löscht ein Battle (best-effort). */
export async function deleteBattle(battleId: string): Promise<void> {
  await supabase.from('battles').delete().eq('id', battleId)
}
