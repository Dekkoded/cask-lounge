import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import CountUp from './CountUp'

// „Bewegung reduzieren" erzwingen → Endwert erscheint sofort, ohne rAF.
function mockReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CountUp', () => {
  it('zeigt bei reduzierter Bewegung sofort den Endwert', () => {
    mockReducedMotion(true)
    render(<CountUp value={8} decimals={0} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('formatiert mit der gewünschten Zahl an Nachkommastellen', () => {
    mockReducedMotion(true)
    render(<CountUp value={8.4} decimals={1} />)
    expect(screen.getByText('8.4')).toBeInTheDocument()
  })
})
