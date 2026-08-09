// Datenzugriffe für Nutzer-Feedback (Ideen & Problemmeldungen).
import { supabase } from '../supabase'

export type FeedbackType = 'idea' | 'problem'

export interface FeedbackRow {
  id: string
  type: FeedbackType
  message: string
  status: string
  created_at: string
}

/** Die eigenen Feedback-Einträge, neueste zuerst. */
export async function listMyFeedback(userId: string): Promise<FeedbackRow[]> {
  const { data } = await supabase
    .from('feedback')
    .select('id, type, message, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data as FeedbackRow[]) ?? []
}

/** Legt einen Feedback-Eintrag an. Wirft bei Fehler. */
export async function submitFeedback(userId: string, type: FeedbackType, message: string): Promise<void> {
  const { error } = await supabase.from('feedback').insert({ user_id: userId, type, message })
  if (error) throw error
}
