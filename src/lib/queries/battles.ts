// Datenzugriffe für Battles einer Gruppe.
import { supabase } from '../supabase'

export interface BattleListItem {
  id: string
  status: string
  battle_drinks: { position: number; drinks: { name: string } | null }[]
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

/**
 * Legt ein Battle samt Teilnehmer-Drinks an und gibt die Battle-ID zurück.
 * Wirft, falls das Battle selbst nicht angelegt werden kann; ein Fehler beim
 * Einfügen der battle_drinks wird (wie bisher) still ignoriert.
 */
export async function createBattle(
  groupId: string,
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
