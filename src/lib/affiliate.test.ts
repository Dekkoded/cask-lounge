import { describe, it, expect } from 'vitest'
import { amazonSearchUrl } from './affiliate'

describe('amazonSearchUrl', () => {
  it('baut eine amazon.de-Such-URL mit dem Query-Parameter', () => {
    const url = amazonSearchUrl('Lagavulin 16')
    expect(url).toMatch(/^https:\/\/www\.amazon\.de\/s\?/)
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('k')).toBe('Lagavulin 16')
  })

  it('kodiert Sonderzeichen im Suchbegriff korrekt', () => {
    const url = amazonSearchUrl('Glenfiddich 12 & Co / 40%')
    // Der rohe Query darf keine unkodierten Steuerzeichen enthalten.
    expect(url).not.toContain(' & Co')
    const params = new URLSearchParams(url.split('?')[1])
    // Nach dem Dekodieren muss der Originalwert wieder herauskommen.
    expect(params.get('k')).toBe('Glenfiddich 12 & Co / 40%')
  })
})
