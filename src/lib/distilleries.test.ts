import { describe, it, expect } from 'vitest'
import { lookupDistillery } from './distilleries'

describe('lookupDistillery', () => {
  it('gibt null zurück, wenn kein Producer übergeben wird', () => {
    expect(lookupDistillery(null)).toBeNull()
    expect(lookupDistillery('')).toBeNull()
  })

  it('findet eine Brennerei bei exaktem Namen', () => {
    const geo = lookupDistillery('Lagavulin')
    expect(geo).not.toBeNull()
    expect(geo?.country).toBe('Schottland')
    expect(geo?.lat).toBeCloseTo(55.6357, 3)
  })

  it('ist unabhängig von Groß-/Kleinschreibung und Whitespace', () => {
    const spaced = lookupDistillery('  ARDBEG  ')
    const plain = lookupDistillery('ardbeg')
    expect(spaced).toEqual(plain)
    expect(spaced?.country).toBe('Schottland')
  })

  it('matcht per Fuzzy, wenn der Producer den Brennerei-Namen enthält', () => {
    // "Ardbeg Distillery" enthält "ardbeg" -> Treffer über Teil-Match.
    const geo = lookupDistillery('Ardbeg Distillery')
    expect(geo?.country).toBe('Schottland')
  })

  it('erkennt Producer aus verschiedenen Ländern', () => {
    expect(lookupDistillery('Yamazaki')?.country).toBe('Japan')
    expect(lookupDistillery('Buffalo Trace')?.country).toBe('USA')
    expect(lookupDistillery('Kavalan')?.country).toBe('Taiwan')
  })

  it('gibt null zurück für unbekannte Producer', () => {
    expect(lookupDistillery('Nicht Existente Brennerei XYZ')).toBeNull()
  })
})
