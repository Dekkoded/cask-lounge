import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, formatNumber } from './format'

// Fixer Zeitpunkt: 10. Juni 2026, 14:30 Uhr lokal.
const SAMPLE = new Date(2026, 5, 10, 14, 30)

describe('formatNumber', () => {
  it('nutzt lokale Tausendertrennzeichen (de vs. en)', () => {
    expect(formatNumber(1234567, 'de-DE')).toBe('1.234.567')
    expect(formatNumber(1234567, 'en-US')).toBe('1,234,567')
  })

  it('reicht Intl-Optionen durch (z. B. Nachkommastellen)', () => {
    expect(formatNumber(3.14159, 'en-US', { maximumFractionDigits: 2 })).toBe('3.14')
  })
})

describe('formatDate', () => {
  it('formatiert je nach Locale unterschiedlich', () => {
    const de = formatDate(SAMPLE, 'de-DE')
    const en = formatDate(SAMPLE, 'en-US')
    expect(de).not.toBe(en)
    // de-DE nutzt Punkte als Trenner, en-US Schrägstriche.
    expect(de).toContain('.')
    expect(en).toContain('/')
  })

  it('akzeptiert ISO-Strings und Timestamps', () => {
    const iso = formatDate('2026-06-10T14:30:00', 'de-DE')
    const ts = formatDate(SAMPLE.getTime(), 'de-DE')
    expect(iso).toBe(ts)
  })
})

describe('formatDateTime', () => {
  it('enthält Tag, Monat und Uhrzeit', () => {
    const out = formatDateTime(SAMPLE, 'de-DE')
    expect(out).toContain('10')
    expect(out).toContain('06')
    expect(out).toContain('30')
  })
})
