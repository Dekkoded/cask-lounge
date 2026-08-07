// Datenzugriffe rund um das eigene Profil und die daraus abgeleiteten
// Bewertungs-Statistiken. Reads best-effort (liefern null/Defaults),
// Writes werfen bei Postgrest-Fehler.
import { supabase } from '../supabase'

export interface ProfileRow {
  id: string
  display_name: string | null
  username: string | null
  avatar_url: string | null
  email_notifications: boolean | null
  notification_prefs: Record<string, boolean> | null
}

export interface RatingStats {
  count: number
  avg: number | null
  topRegion: string | null
}

export type ProfileUpdate = Partial<{
  display_name: string | null
  username: string
  avatar_url: string | null
  email_notifications: boolean
  notification_prefs: Record<string, boolean>
}>

/** Das eigene Profil, oder null. */
export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return (data as ProfileRow | null) ?? null
}

/** Aggregierte Bewertungs-Statistiken (Anzahl, Schnitt, häufigste Region). */
export async function loadRatingStats(userId: string): Promise<RatingStats> {
  const { data } = await supabase.from('ratings').select('overall, drinks(region)').eq('user_id', userId)
  const rows = (data as unknown as { overall: number | null; drinks: { region: string | null } | null }[]) ?? []
  const scored = rows.filter(r => r.overall != null)
  const avg = scored.length ? scored.reduce((s, r) => s + (r.overall ?? 0), 0) / scored.length : null
  const regionCounts = new Map<string, number>()
  for (const r of rows) {
    const region = r.drinks?.region
    if (region) regionCounts.set(region, (regionCounts.get(region) ?? 0) + 1)
  }
  const topRegion = [...regionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return { count: rows.length, avg, topRegion }
}

/** Ob der Username bereits von einem anderen Nutzer belegt ist. */
export async function isUsernameTaken(username: string, excludeUserId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .neq('id', excludeUserId)
    .maybeSingle()
  return !!data
}

/** Aktualisiert das eigene Profil. Wirft bei Fehler. */
export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}
