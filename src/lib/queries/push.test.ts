import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import { savePushSubscription, removePushSubscription } from './push'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['upsert', 'delete', 'eq']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
})

describe('push queries', () => {
  it('savePushSubscription löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(savePushSubscription('u1', 'https://ep', {})).resolves.toBeUndefined()
    expect(from).toHaveBeenCalledWith('push_subscriptions')
  })

  it('savePushSubscription wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'save failed' } }))
    await expect(savePushSubscription('u1', 'https://ep', {})).rejects.toMatchObject({ message: 'save failed' })
  })

  it('removePushSubscription läuft ohne Fehler durch (best-effort)', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(removePushSubscription('u1', 'https://ep')).resolves.toBeUndefined()
  })
})
