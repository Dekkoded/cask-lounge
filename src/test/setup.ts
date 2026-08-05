// Globale Test-Einrichtung: registriert die jest-dom-Matcher (z. B.
// toBeInTheDocument, toHaveTextContent) an Vitests expect und räumt nach jedem
// Test das gerenderte DOM auf, damit Tests sich nicht gegenseitig beeinflussen.
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})
