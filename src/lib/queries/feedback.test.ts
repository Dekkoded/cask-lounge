import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import { listMyFeedback, submitFeedback } from './feedback'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'insert']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
})

describe('feedback queries', () => {
  it('listMyFeedback liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listMyFeedback('u1')).resolves.toEqual([])
    expect(from).toHaveBeenCalledWith('feedback')
  })

  it('listMyFeedback gibt die Einträge zurück', async () => {
    const rows = [{ id: 'f1', type: 'idea', message: 'Hi', status: 'open', created_at: 't' }]
    from.mockReturnValue(builder({ data: rows }))
    await expect(listMyFeedback('u1')).resolves.toEqual(rows)
  })

  it('submitFeedback löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(submitFeedback('u1', 'idea', 'Hi')).resolves.toBeUndefined()
  })

  it('submitFeedback wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'insert failed' } }))
    await expect(submitFeedback('u1', 'problem', 'Bug')).rejects.toMatchObject({ message: 'insert failed' })
  })
})
