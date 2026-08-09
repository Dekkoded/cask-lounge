import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  listTastings,
  createTasting,
  getTasting,
  listTastingDrinks,
  loadTastingRatings,
  addTastingDrink,
  upsertTastingRating,
  closeTasting,
} from './tastings'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'insert', 'upsert', 'update', 'single', 'maybeSingle']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
})

describe('tastings queries – Lesezugriffe (best-effort)', () => {
  it('listTastings liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listTastings('g1')).resolves.toEqual([])
    expect(from).toHaveBeenCalledWith('tastings')
  })

  it('getTasting gibt die Tasting-Zeile zurück', async () => {
    const row = { id: 't1', title: 'Islay Night', status: 'open', event_date: null, hosted_by: 'u1', group_id: 'g1' }
    from.mockReturnValue(builder({ data: row, error: null }))
    await expect(getTasting('t1')).resolves.toEqual(row)
  })

  it('getTasting wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'no access' } }))
    await expect(getTasting('t1')).rejects.toMatchObject({ message: 'no access' })
  })

  it('listTastingDrinks liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listTastingDrinks('t1')).resolves.toEqual([])
  })

  it('loadTastingRatings liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(loadTastingRatings('t1')).resolves.toEqual([])
  })
})

describe('tastings queries – Schreibzugriffe (werfen bei Fehler)', () => {
  it('createTasting gibt die neue Tasting-ID zurück', async () => {
    from.mockReturnValue(builder({ data: { id: 't9' }, error: null }))
    await expect(createTasting({ group_id: 'g1', title: 'X', hosted_by: 'u1', event_date: null })).resolves.toBe('t9')
  })

  it('createTasting wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'insert failed' } }))
    await expect(createTasting({ group_id: 'g1', title: 'X', hosted_by: 'u1', event_date: null })).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('addTastingDrink wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'add failed' } }))
    await expect(addTastingDrink('t1', 'd1', 0)).rejects.toMatchObject({ message: 'add failed' })
  })

  it('upsertTastingRating löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(upsertTastingRating({
      tasting_id: 't1', drink_id: 'd1', user_id: 'u1',
      nose: 5, taste: 6, finish: 7, overall: 6, wheels: { nose: [], taste: [] }, note: null,
    })).resolves.toBeUndefined()
  })

  it('upsertTastingRating wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'vote failed' } }))
    await expect(upsertTastingRating({
      tasting_id: 't1', drink_id: 'd1', user_id: 'u1',
      nose: 5, taste: 6, finish: 7, overall: 6, wheels: { nose: [], taste: [] }, note: null,
    })).rejects.toMatchObject({ message: 'vote failed' })
  })

  it('closeTasting läuft ohne Fehler durch (best-effort)', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(closeTasting('t1')).resolves.toBeUndefined()
  })
})
