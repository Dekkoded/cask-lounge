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

/** Kompakter Profil-Eintrag für die Mitglieder-Suche. */
export interface MemberListItem {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

/** Öffentliche Profil-Infos eines anderen Nutzers. */
export interface MemberInfo {
  username: string
  display_name: string | null
  avatar_url: string | null
}

/** Ein öffentlich bewerteter Whisky eines Nutzers (Drink + eigene Note). */
export interface PublicRatedDrink {
  id: string
  name: string
  producer: string | null
  region: string | null
  photo_url: string | null
  overall: number | null
}

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

/**
 * Sucht Profile nach Username/Anzeigename (leerer Query → erste 30 alphabetisch).
 * Best-effort, liefert [] bei Fehler.
 */
export async function searchProfiles(query: string): Promise<MemberListItem[]> {
  let req = supabase.from('profiles').select('id, username, display_name, avatar_url')
  const q = query.trim()
  if (q.length >= 1) req = req.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
  const { data } = await req.order('username').limit(30)
  return (data as MemberListItem[]) ?? []
}

/** Öffentliche Profil-Infos eines Nutzers, oder null. */
export async function getMemberInfo(userId: string): Promise<MemberInfo | null> {
  const { data } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  return (data as MemberInfo | null) ?? null
}

/** Öffentlich bewertete Whiskys eines Nutzers, nach Note absteigend. */
export async function listPublicRatedDrinks(userId: string): Promise<PublicRatedDrink[]> {
  const { data } = await supabase
    .from('ratings')
    .select('overall, drinks(id, name, producer, region, photo_url)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('overall', { ascending: false, nullsFirst: false })
  const rows = (data as unknown as { overall: number | null; drinks: Omit<PublicRatedDrink, 'overall'> | null }[]) ?? []
  return rows.filter(r => r.drinks).map(r => ({ ...r.drinks!, overall: r.overall }))
}
