// Datenzugriffe für Web-Push-Abos (push_subscriptions).
import { supabase } from '../supabase'

/** Speichert bzw. aktualisiert ein Push-Abo des Nutzers. Wirft bei Fehler. */
export async function savePushSubscription(
  userId: string,
  endpoint: string,
  subscription: unknown,
): Promise<void> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, subscription }, { onConflict: 'user_id,endpoint' })
  if (error) throw error
}

/** Entfernt ein Push-Abo des Nutzers (best-effort). */
export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint)
}
