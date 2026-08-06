// Datenzugriffe für Tastings einer Gruppe.
import { supabase } from '../supabase'

export interface Tasting {
  id: string
  title: string
  status: string
  event_date: string | null
  hosted_by: string
}

export interface NewTasting {
  group_id: string
  title: string
  hosted_by: string
  event_date: string | null
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
