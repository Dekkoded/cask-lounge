// Datenzugriffe für den Aktivitäts-Feed einer Gruppe: "Ich trinke gerade"-
// Sessions samt Reaktionen/Kommentaren sowie geteilte Bewertungen.
import { supabase } from '../supabase'
import type { SessionReaction, SessionComment } from '../../components/SessionSocial'

export interface GroupSession {
  id: string
  user_id: string
  drink_id: string | null
  drink_name: string | null
  message: string | null
  started_at: string
  profiles: { display_name: string | null; username: string } | null
  drinks: { name: string } | null
  session_reactions: SessionReaction[]
  session_comments: SessionComment[]
}

export interface RatingShare {
  rating_id: string
  shared_at: string
  shared_by: string
  ratings: { overall: number | null; drinks: { id: string; name: string; photo_url: string | null } | null } | null
}

export interface NewSession {
  group_id: string
  user_id: string
  drink_id: string | null
  drink_name: string | null
  message: string | null
}

/** Lädt Sessions und geteilte Bewertungen einer Gruppe (jeweils neueste zuerst). */
export async function loadGroupActivity(
  groupId: string,
): Promise<{ sessions: GroupSession[]; ratingShares: RatingShare[] }> {
  const [{ data: sData }, { data: rData }] = await Promise.all([
    supabase
      .from('drink_sessions')
      .select('id, user_id, drink_id, drink_name, message, started_at, profiles(display_name, username), drinks(name), session_reactions(emoji, user_id), session_comments(id, body, created_at, user_id, profiles(display_name, username))')
      .eq('group_id', groupId)
      .order('started_at', { ascending: false }),
    supabase
      .from('group_ratings')
      .select('rating_id, shared_at, shared_by, ratings(overall, drinks(id, name, photo_url))')
      .eq('group_id', groupId)
      .order('shared_at', { ascending: false }),
  ])
  return {
    sessions: (sData as unknown as GroupSession[]) ?? [],
    ratingShares: (rData as unknown as RatingShare[]) ?? [],
  }
}

/** Postet eine "Ich trinke gerade"-Session. Wirft bei Fehler. */
export async function postSession(input: NewSession): Promise<void> {
  const { error } = await supabase.from('drink_sessions').insert(input)
  if (error) throw error
}

/** Fügt eine Emoji-Reaktion hinzu oder entfernt sie (best-effort). */
export async function toggleSessionReaction(
  sessionId: string,
  userId: string,
  emoji: string,
  active: boolean,
): Promise<void> {
  if (active) {
    await supabase
      .from('session_reactions')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
  } else {
    await supabase.from('session_reactions').insert({ session_id: sessionId, user_id: userId, emoji })
  }
}

/** Schreibt einen Kommentar zu einer Session (best-effort). */
export async function postSessionComment(sessionId: string, userId: string, body: string): Promise<void> {
  await supabase.from('session_comments').insert({ session_id: sessionId, user_id: userId, body })
}

/** Löscht einen Kommentar (best-effort). */
export async function deleteSessionComment(commentId: string): Promise<void> {
  await supabase.from('session_comments').delete().eq('id', commentId)
}
