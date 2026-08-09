import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, applyTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
  document.head.innerHTML = '<meta name="theme-color" content="">'
})

describe('theme', () => {
  it('getTheme liefert standardmäßig "dark"', () => {
    expect(getTheme()).toBe('dark')
  })

  it('getTheme liefert "light", wenn so gespeichert', () => {
    localStorage.setItem('cl_theme', 'light')
    expect(getTheme()).toBe('light')
  })

  it('getTheme fällt bei unbekanntem Wert auf "dark" zurück', () => {
    localStorage.setItem('cl_theme', 'neon')
    expect(getTheme()).toBe('dark')
  })

  it('applyTheme setzt bei "light" das data-Attribut und die Meta-Farbe', () => {
    applyTheme('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#ece8dc')
  })

  it('applyTheme entfernt bei "dark" das data-Attribut', () => {
    applyTheme('light')
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe('#100e0b')
  })

  it('setTheme speichert die Auswahl und wendet sie an', () => {
    setTheme('light')
    expect(localStorage.getItem('cl_theme')).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
