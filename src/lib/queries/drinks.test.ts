import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  listWhiskies,
  searchWhiskiesByName,
  getDrink,
  createDrink,
  updateDrink,
  deleteDrink,
} from './drinks'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen { data, error } auf.
function builder(result: { data: unknown; error: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'ilike', 'limit', 'insert', 'update', 'delete', 'single']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
})

describe('drinks queries – Lesezugriffe (best-effort)', () => {
  it('listWhiskies gibt die Datenzeilen zurück', async () => {
    from.mockReturnValue(builder({ data: [{ id: '1', name: 'Ardbeg' }], error: null }))
    await expect(listWhiskies()).resolves.toEqual([{ id: '1', name: 'Ardbeg' }])
    expect(from).toHaveBeenCalledWith('drinks')
  })

  it('listWhiskies liefert [] statt zu werfen, wenn ein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'boom' } }))
    await expect(listWhiskies()).resolves.toEqual([])
  })

  it('searchWhiskiesByName liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null, error: null }))
    await expect(searchWhiskiesByName('xyz')).resolves.toEqual([])
  })

  it('getDrink gibt null zurück, wenn nichts gefunden wird', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'no rows' } }))
    await expect(getDrink('missing')).resolves.toBeNull()
  })
})

describe('drinks queries – Schreibzugriffe (werfen bei Fehler)', () => {
  it('createDrink gibt die angelegte Zeile zurück', async () => {
    const row = { id: '9', name: 'Neu', producer: null, region: null, photo_url: null }
    from.mockReturnValue(builder({ data: row, error: null }))
    await expect(
      createDrink({ name: 'Neu', producer: null, region: null, age_years: null, abv: null, photo_url: null, created_by: 'u1' }),
    ).resolves.toEqual(row)
  })

  it('createDrink wirft bei einem Postgrest-Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'insert failed' } }))
    await expect(
      createDrink({ name: 'Neu', producer: null, region: null, age_years: null, abv: null, photo_url: null, created_by: 'u1' }),
    ).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('updateDrink löst auf, wenn kein Fehler auftritt, und wirft sonst', async () => {
    from.mockReturnValue(builder({ data: null, error: null }))
    await expect(updateDrink('1', { name: 'X' })).resolves.toBeUndefined()
    from.mockReturnValue(builder({ data: null, error: { message: 'update failed' } }))
    await expect(updateDrink('1', { name: 'X' })).rejects.toMatchObject({ message: 'update failed' })
  })

  it('deleteDrink wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'delete failed' } }))
    await expect(deleteDrink('1')).rejects.toMatchObject({ message: 'delete failed' })
  })
})
