import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  listBattles,
  listAllBattles,
  createBattle,
  getBattle,
  listBattleContenders,
  loadBattleVotes,
  castBattleVote,
} from './battles'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'insert', 'upsert', 'update', 'delete', 'single', 'maybeSingle']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
})

describe('battles queries – Lesezugriffe (best-effort)', () => {
  it('listBattles liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listBattles('g1')).resolves.toEqual([])
    expect(from).toHaveBeenCalledWith('battles')
  })

  it('listAllBattles gibt die Feed-Zeilen zurück', async () => {
    const rows = [{ id: 'b1', status: 'open', created_at: 't', group_id: null, battle_drinks: [] }]
    from.mockReturnValue(builder({ data: rows, error: null }))
    await expect(listAllBattles()).resolves.toEqual(rows)
  })

  it('listAllBattles wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'boom' } }))
    await expect(listAllBattles()).rejects.toMatchObject({ message: 'boom' })
  })

  it('getBattle gibt null zurück, wenn nichts gefunden wird', async () => {
    from.mockReturnValue(builder({ data: null, error: null }))
    await expect(getBattle('b1')).resolves.toBeNull()
  })

  it('getBattle wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'no access' } }))
    await expect(getBattle('b1')).rejects.toMatchObject({ message: 'no access' })
  })

  it('listBattleContenders filtert leere Drinks und mappt auf {drink,position}', async () => {
    from.mockReturnValue(builder({ data: [
      { position: 1, drinks: { id: 'd1', name: 'Ardbeg' } },
      { position: 2, drinks: null },
    ] }))
    await expect(listBattleContenders('b1')).resolves.toEqual([
      { drink: { id: 'd1', name: 'Ardbeg' }, position: 1 },
    ])
  })

  it('loadBattleVotes liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(loadBattleVotes('b1')).resolves.toEqual([])
  })
})

describe('battles queries – Schreibzugriffe (werfen bei Fehler)', () => {
  it('createBattle gibt die neue Battle-ID zurück', async () => {
    from.mockReturnValue(builder({ data: { id: 'b9' }, error: null }))
    await expect(createBattle(null, 'u1', ['d1', 'd2'])).resolves.toBe('b9')
  })

  it('createBattle wirft, wenn das Battle nicht angelegt werden kann', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'insert failed' } }))
    await expect(createBattle('g1', 'u1', ['d1', 'd2'])).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('castBattleVote wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'vote failed' } }))
    await expect(castBattleVote('b1', 'd1', 'u1')).rejects.toMatchObject({ message: 'vote failed' })
  })
})
