// Gemeinsame, sprach-abhängige Formatierungs-Helfer.
// Locale immer aus i18n.language übergeben (z. B. "de" / "en"), damit
// Datums- und Zahlenformate der aktiven App-Sprache folgen statt hartcodiert
// auf "de-DE" zu stehen.

type DateInput = string | number | Date

/** Datum + Uhrzeit, kompakt (z. B. "10.06., 14:30" / "06/10, 02:30 PM"). */
export function formatDateTime(value: DateInput, locale: string): string {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Nur Datum (z. B. "10.06.2026" / "6/10/2026"). */
export function formatDate(value: DateInput, locale: string): string {
  return new Date(value).toLocaleDateString(locale)
}

/** Zahl mit lokalem Tausendertrennzeichen. */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return value.toLocaleString(locale, options)
}
