export type Theme = 'dark' | 'light'

const KEY = 'cl_theme'

export function getTheme(): Theme {
  const stored = localStorage.getItem(KEY)
  return stored === 'light' ? 'light' : 'dark'
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') root.dataset.theme = 'light'
  else delete root.dataset.theme
  // Browser-UI (Statusleiste/Adressleiste) farblich angleichen.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'light' ? '#ddd0b3' : '#1c1917')
}

export function setTheme(theme: Theme) {
  localStorage.setItem(KEY, theme)
  applyTheme(theme)
}
