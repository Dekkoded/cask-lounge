import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import { loadGroupActivity, postSession, postSessions } from './sessions'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'insert', 'delete']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

const session = { group_id: 'g1', user_id: 'u1', drink_id: null, drink_name: 'Ardbeg', message: null }

beforeEach(() => {
  from.mockReset()
})

describe('sessions queries', () => {
  it('loadGroupActivity liefert Defaults bei leeren Ergebnissen', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(loadGroupActivity('g1')).resolves.toEqual({ sessions: [], ratingShares: [] })
  })

  it('postSession wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'insert failed' } }))
    await expect(postSession(session)).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('postSessions löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(postSessions([session, { ...session, group_id: 'g2' }])).resolves.toBeUndefined()
  })

  it('postSessions wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'batch failed' } }))
    await expect(postSessions([session])).rejects.toMatchObject({ message: 'batch failed' })
  })
})
