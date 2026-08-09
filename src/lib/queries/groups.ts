// Datenzugriffe rund um Gruppen und Mitglieder.
import { supabase } from '../supabase'

export interface Group {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
}

export interface GroupSummary {
  id: string
  name: string
  description: string | null
}

export interface Member {
  user_id: string
  role: string
  joined_at: string
  profiles: { username: string; display_name: string | null }
}

/** Eine Gruppe per ID. Wirft bei Fehler (der Aufrufer zeigt einen Ladefehler an). */
export async function getGroup(id: string): Promise<Group | null> {
  const { data, error } = await supabase.from('groups').select('*').eq('id', id).single()
  if (error) throw error
  return (data as Group | null) ?? null
}

/** Alle Gruppen des Nutzers (für den Gruppen-Wechsler), neueste zuerst. */
export async function listMyGroups(): Promise<GroupSummary[]> {
  const { data } = await supabase
    .from('groups')
    .select('id, name, description')
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Mitglieder einer Gruppe inkl. Profil. */
export async function listMembers(groupId: string): Promise<Member[]> {
  const { data } = await supabase
    .from('group_members')
    .select('user_id, role, joined_at, profiles(username, display_name)')
    .eq('group_id', groupId)
  return (data as unknown as Member[]) ?? []
}

/** Entfernt ein Mitglied. Wirft bei Fehler. */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
  if (error) throw error
}

/** Legt eine Gruppe an und liefert deren ID. Wirft bei Fehler. */
export async function createGroup(name: string, description: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', {
    p_name: name,
    p_description: description,
  })
  if (error) throw error
  return data as string
}

/**
 * Tritt einer Gruppe per Einladungscode bei und liefert deren ID.
 * Wirft bei Fehler; liefert null, wenn kein passender Code gefunden wurde.
 */
export async function joinGroup(inviteCode: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('join_group', { p_invite_code: inviteCode })
  if (error) throw error
  return (data as string | null) ?? null
}
