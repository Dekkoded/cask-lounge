// Datenzugriffe rund um Bewertungen (ratings), Wunschliste (wishlist) und das
// Teilen von Bewertungen in Gruppen (group_ratings). Reads sind best-effort
// (liefern []/null), Writes werfen bei Postgrest-Fehler.
import { supabase } from '../supabase'
import type { Rating } from '../types'

export interface PublicRating extends Rating {
  profiles: { display_name: string | null; username: string }
}

export interface GlobalScore {
  avg: number | null
  count: number
}

export type RatingPayload = {
  drink_id: string
  user_id: string
  nose: number
  taste: number
  finish: number
  overall: number
  color_idx: number | null
  wheels: unknown
  note: string | null
  purchase_price: number | null
  is_public: boolean
  updated_at: string
}

/** Aggregat (Schnitt + Anzahl) aus der öffentlichen View – auch ohne Login. */
export async function getGlobalScore(drinkId: string): Promise<GlobalScore> {
  const { data } = await supabase
    .from('global_drink_scores')
    .select('avg_overall, num_ratings')
    .eq('id', drinkId)
    .maybeSingle()
  return data ? { avg: data.avg_overall, count: data.num_ratings ?? 0 } : { avg: null, count: 0 }
}

/** Öffentliche Einzelbewertungen (inkl. Profil), höchste zuerst. */
export async function listPublicRatings(drinkId: string): Promise<PublicRating[]> {
  const { data } = await supabase
    .from('ratings')
    .select('*, profiles(display_name, username)')
    .eq('drink_id', drinkId)
    .eq('is_public', true)
    .order('overall', { ascending: false })
  return (data as unknown as PublicRating[]) ?? []
}

/** Die eigene Bewertung eines Whiskys, oder null. */
export async function getMyRating(drinkId: string, userId: string): Promise<Rating | null> {
  const { data } = await supabase
    .from('ratings')
    .select('*')
    .eq('drink_id', drinkId)
    .eq('user_id', userId)
    .maybeSingle()
  return (data as Rating | null) ?? null
}

/** Ob den Whisky außer dem Nutzer noch jemand bewertet hat. */
export async function othersHaveRated(drinkId: string, userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('drink_id', drinkId)
    .neq('user_id', userId)
  return (count ?? 0) > 0
}

/** Legt eine Bewertung an oder aktualisiert sie. Wirft bei Fehler. */
export async function upsertRating(payload: RatingPayload): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .upsert(payload, { onConflict: 'drink_id,user_id' })
    .select('*')
    .single()
  if (error) throw error
  return data as Rating
}

/** Sammlungs-Eintrag ohne Bewertung (privat, keine Noten). Wirft bei Fehler. */
export async function createCollectionEntry(drinkId: string, userId: string): Promise<Rating> {
  const { data, error } = await supabase
    .from('ratings')
    .insert({ drink_id: drinkId, user_id: userId, is_public: false })
    .select('*')
    .single()
  if (error) throw error
  return data as Rating
}

/** Löscht eine Bewertung samt ihrer Gruppen-Freigaben. Wirft bei Fehler. */
export async function deleteRating(ratingId: string): Promise<void> {
  await supabase.from('group_ratings').delete().eq('rating_id', ratingId)
  const { error } = await supabase.from('ratings').delete().eq('id', ratingId)
  if (error) throw error
}

/** Löscht alle Bewertungen eines Whiskys samt Freigaben (best-effort). */
export async function deleteRatingsForDrink(drinkId: string): Promise<void> {
  const { data: rids } = await supabase.from('ratings').select('id').eq('drink_id', drinkId)
  const ids = (rids ?? []).map(r => r.id)
  if (ids.length) {
    await supabase.from('group_ratings').delete().in('rating_id', ids)
    await supabase.from('ratings').delete().in('id', ids)
  }
}

/** Ob der Whisky auf der Wunschliste des Nutzers steht. */
export async function isInWishlist(drinkId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('wishlist')
    .select('id')
    .eq('drink_id', drinkId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

/** Fügt den Whisky zur Wunschliste hinzu. Wirft bei Fehler. */
export async function addToWishlist(drinkId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('wishlist').insert({ drink_id: drinkId, user_id: userId })
  if (error) throw error
}

/** Entfernt den Whisky von der Wunschliste. Wirft bei Fehler. */
export async function removeFromWishlist(drinkId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('wishlist').delete().eq('drink_id', drinkId).eq('user_id', userId)
  if (error) throw error
}

/** IDs der Gruppen, in denen eine Bewertung geteilt ist. */
export async function listSharedGroups(ratingId: string): Promise<string[]> {
  const { data } = await supabase.from('group_ratings').select('group_id').eq('rating_id', ratingId)
  return (data ?? []).map(r => r.group_id)
}

/** Teilt eine Bewertung in eine Gruppe. Wirft bei Fehler. */
export async function shareRatingToGroup(groupId: string, ratingId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_ratings')
    .insert({ group_id: groupId, rating_id: ratingId, shared_by: userId })
  if (error) throw error
}

/** Nimmt eine Bewertung aus einer Gruppe zurück (best-effort). */
export async function unshareRatingFromGroup(groupId: string, ratingId: string): Promise<void> {
  await supabase.from('group_ratings').delete().eq('group_id', groupId).eq('rating_id', ratingId)
}
