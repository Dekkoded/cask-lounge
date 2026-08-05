// Fehler-Monitoring, gated hinter VITE_SENTRY_DSN.
//
// Ohne gesetzten DSN passiert nichts: das Sentry-SDK wird per Dynamic Import
// geladen und landet dadurch in einem eigenen Chunk, der ohne DSN gar nicht
// erst angefragt wird – null Kosten fürs Haupt-Bundle. Mit DSN (in Vercel unter
// VITE_SENTRY_DSN gesetzt, danach neu deployen) initialisiert sich Sentry und
// erfasst unbehandelte Fehler samt Stacktrace.

type SentryModule = typeof import('@sentry/react')

let sentry: SentryModule | null = null

const DSN = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim()

/** true, sobald ein DSN konfiguriert ist (nur zur Info/für Tests). */
export const MONITORING_ENABLED = Boolean(DSN)

/**
 * Initialisiert Sentry, falls ein DSN vorliegt. Fire-and-forget aus main.tsx:
 * blockiert das erste Rendern nicht. Fehler beim Laden/Init werden geschluckt –
 * Monitoring darf die App niemals selbst beschädigen.
 */
export async function initMonitoring(): Promise<void> {
  if (!DSN) return
  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn: DSN,
      environment: import.meta.env.MODE,
      // Nur Fehler, kein Performance-Tracing und kein Session-Replay
      // (Bundle klein halten + Datenschutz).
      tracesSampleRate: 0,
    })
    sentry = Sentry
  } catch {
    // bewusst leer: Monitoring-Fehler dürfen nicht zum App-Fehler werden.
  }
}

/**
 * Meldet einen Fehler ans Monitoring, sofern initialisiert. No-op, wenn kein
 * DSN gesetzt ist oder Sentry (noch) nicht geladen wurde.
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (!sentry) return
  sentry.captureException(error, context ? { extra: context } : undefined)
}
