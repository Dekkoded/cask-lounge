import { describe, it, expect } from 'vitest'
import { AROMA_GROUPS, isKnownAroma, aromaLabel } from './aromas'

describe('aromas', () => {
  it('isKnownAroma erkennt kuratierte Schlüssel', () => {
    expect(isKnownAroma('peat')).toBe(true)
    expect(isKnownAroma('vanilla')).toBe(true)
  })

  it('isKnownAroma lehnt unbekannte Schlüssel ab', () => {
    expect(isKnownAroma('spaceship')).toBe(false)
    expect(isKnownAroma('')).toBe(false)
  })

  it('aromaLabel übersetzt bekannte Schlüssel über i18n', () => {
    const t = (k: string) => `T:${k}`
    expect(aromaLabel('peat', t)).toBe('T:whisky.aromaList.peat')
  })

  it('aromaLabel gibt freie/unbekannte Labels unverändert zurück', () => {
    const t = (k: string) => `T:${k}`
    expect(aromaLabel('Meersalz', t)).toBe('Meersalz')
  })

  it('AROMA_GROUPS enthält keine doppelten Aroma-Schlüssel', () => {
    const all = AROMA_GROUPS.flatMap(g => g.aromas)
    expect(new Set(all).size).toBe(all.length)
  })
})
