import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('zeigt Titel und Hinweis', () => {
    render(<EmptyState title="Nichts hier" hint="Leg gleich los" />)
    expect(screen.getByText('Nichts hier')).toBeInTheDocument()
    expect(screen.getByText('Leg gleich los')).toBeInTheDocument()
  })

  it('rendert die Aktion, wenn übergeben', () => {
    render(<EmptyState title="Leer" action={<button>Los</button>} />)
    expect(screen.getByRole('button', { name: 'Los' })).toBeInTheDocument()
  })

  it('zeigt keinen Hinweis, wenn keiner übergeben wird', () => {
    const { container } = render(<EmptyState title="Nur Titel" />)
    // Nur der Titel-Absatz, kein zweiter Hinweis-Absatz.
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })
})
