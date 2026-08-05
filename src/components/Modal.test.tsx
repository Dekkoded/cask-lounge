import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

beforeEach(() => {
  // Sicherstellen, dass der Body-Scroll-Lock zwischen Tests neutral startet.
  document.body.style.overflow = ''
})

describe('Modal', () => {
  it('rendert nichts, solange open=false', () => {
    render(
      <Modal open={false} onClose={() => {}} ariaLabel="Test">
        <p>Inhalt</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Inhalt')).toBeNull()
  })

  it('rendert Kinder mit role=dialog, aria-modal und aria-label', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="Mein Dialog">
        <p>Inhalt</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Mein Dialog')
    expect(screen.getByText('Inhalt')).toBeInTheDocument()
  })

  it('portalt den Dialog direkt an document.body (nicht in den Render-Container)', () => {
    const { container } = render(
      <Modal open onClose={() => {}} ariaLabel="Test">
        <p>Inhalt</p>
      </Modal>,
    )
    // Der Render-Container selbst bleibt leer, der Dialog hängt am body.
    expect(container).toBeEmptyDOMElement()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it('schließt bei Escape, wenn dismissible (Default)', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} ariaLabel="Test">
        <p>Inhalt</p>
      </Modal>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignoriert Escape, wenn dismissible=false', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} dismissible={false} ariaLabel="Test">
        <p>Inhalt</p>
      </Modal>,
    )
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('schließt bei Klick auf den Backdrop, aber nicht bei Klick auf den Inhalt', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} ariaLabel="Test">
        <button>Aktion</button>
      </Modal>,
    )
    // Klick auf den Panel-Inhalt darf NICHT schließen (stopPropagation).
    await userEvent.click(screen.getByText('Aktion'))
    expect(onClose).not.toHaveBeenCalled()

    // Klick auf den Backdrop (Elternelement des Dialogs) schließt.
    const backdrop = screen.getByRole('dialog').parentElement as HTMLElement
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('sperrt den Body-Scroll, solange offen, und gibt ihn beim Schließen frei', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} ariaLabel="Test">
        <p>Inhalt</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Modal open={false} onClose={() => {}} ariaLabel="Test">
        <p>Inhalt</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('setzt den Fokus beim Öffnen auf das erste fokussierbare Element', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="Test">
        <button>Erster Button</button>
        <button>Zweiter Button</button>
      </Modal>,
    )
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Erster Button' }),
    )
  })
})
