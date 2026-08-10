import { describe, it, expect, vi, afterEach } from 'vitest'
import { haptic } from './haptics'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('haptic', () => {
  it('ruft navigator.vibrate mit dem übergebenen Muster auf', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic(18)
    expect(vibrate).toHaveBeenCalledWith(18)
  })

  it('nutzt den Standardwert, wenn kein Muster übergeben wird', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic()
    expect(vibrate).toHaveBeenCalledWith(12)
  })

  it('tut nichts (und wirft nicht), wenn die Vibration API fehlt', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptic(10)).not.toThrow()
  })

  it('schluckt Fehler aus navigator.vibrate', () => {
    const vibrate = vi.fn(() => { throw new Error('blocked') })
    vi.stubGlobal('navigator', { vibrate })
    expect(() => haptic()).not.toThrow()
  })
})
