// Name des DOM-Events, mit dem die Intro-Tour von außen (z.B. aus dem Profil)
// erneut geöffnet werden kann.
export const INTRO_EVENT = 'open-intro'

/** Öffnet die Intro-Tour erneut. */
export function openIntro() {
  window.dispatchEvent(new Event(INTRO_EVENT))
}
