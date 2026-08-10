/**
 * Dezentes haptisches Feedback für bestätigende Kernaktionen (Bewertung
 * gespeichert, zur Sammlung/Wunschliste hinzugefügt). Progressive
 * Enhancement: Wo die Vibration API fehlt (u.a. iOS Safari, Desktop),
 * passiert einfach nichts – nie ein Fehler.
 *
 * Bewusst sparsam einsetzen: nur auf Erfolg/Abschluss, nicht auf jeden Tap.
 */
export function haptic(pattern: number | number[] = 12): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Manche Browser werfen bei zu häufigen/blockierten Aufrufen – ignorieren.
  }
}
