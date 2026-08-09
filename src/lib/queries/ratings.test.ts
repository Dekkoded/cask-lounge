import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  getGlobalScore,
  listGlobalScores,
  listRatingDetails,
  listMyRatedDrinks,
  listWishlist,
  removeWishlistEntry,
  listPublicRatings,
  getMyRating,
  othersHaveRated,
  isInWishlist,
  upsertRating,
  createCollectionEntry,
  deleteRating,
  addToWishlist,
  shareRatingToGroup,
  type RatingPayload,
} from './ratings'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown; count?: number }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'in', 'order', 'insert', 'upsert', 'delete', 'single', 'maybeSingle']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

const payload: RatingPayload = {
  drink_id: 'd1', user_id: 'u1', nose: 5, taste: 5, finish: 5, overall: 5,
  color_idx: null, wheels: {}, note: null, purchase_price: null, is_public: true,
  updated_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  from.mockReset()
})

describe('ratings queries – Lesezugriffe (best-effort)', () => {
  it('getGlobalScore mappt avg/count aus der View', async () => {
    from.mockReturnValue(builder({ data: { avg_overall: 8.2, num_ratings: 3 } }))
    await expect(getGlobalScore('d1')).resolves.toEqual({ avg: 8.2, count: 3 })
    expect(from).toHaveBeenCalledWith('global_drink_scores')
  })

  it('getGlobalScore liefert Nullwerte, wenn nichts gefunden wird', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(getGlobalScore('d1')).resolves.toEqual({ avg: null, count: 0 })
  })

  it('listPublicRatings liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null, error: null }))
    await expect(listPublicRatings('d1')).resolves.toEqual([])
  })

  it('getMyRating gibt null zurück, wenn keine Bewertung existiert', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(getMyRating('d1', 'u1')).resolves.toBeNull()
  })

  it('othersHaveRated ist true, wenn count > 0', async () => {
    from.mockReturnValue(builder({ count: 2 }))
    await expect(othersHaveRated('d1', 'u1')).resolves.toBe(true)
  })

  it('isInWishlist ist false ohne Treffer', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(isInWishlist('d1', 'u1')).resolves.toBe(false)
  })

  it('listGlobalScores gibt das Ranking zurück', async () => {
    const rows = [{ id: 'd1', name: 'Ardbeg', avg_overall: 9 }]
    from.mockReturnValue(builder({ data: rows, error: null }))
    await expect(listGlobalScores()).resolves.toEqual(rows)
  })

  it('listGlobalScores wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'boom' } }))
    await expect(listGlobalScores()).rejects.toMatchObject({ message: 'boom' })
  })

  it('listRatingDetails liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listRatingDetails('d1')).resolves.toEqual([])
  })

  it('listMyRatedDrinks liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listMyRatedDrinks('u1')).resolves.toEqual([])
  })

  it('listWishlist liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listWishlist('u1')).resolves.toEqual([])
  })

  it('removeWishlistEntry läuft ohne Fehler durch (best-effort)', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(removeWishlistEntry('w1')).resolves.toBeUndefined()
  })
})

describe('ratings queries – Schreibzugriffe (werfen bei Fehler)', () => {
  it('upsertRating gibt die gespeicherte Zeile zurück', async () => {
    const row = { id: 'r1', ...payload }
    from.mockReturnValue(builder({ data: row, error: null }))
    await expect(upsertRating(payload)).resolves.toEqual(row)
  })

  it('upsertRating wirft bei einem Postgrest-Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'upsert failed' } }))
    await expect(upsertRating(payload)).rejects.toMatchObject({ message: 'upsert failed' })
  })

  it('createCollectionEntry wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'insert failed' } }))
    await expect(createCollectionEntry('d1', 'u1')).rejects.toMatchObject({ message: 'insert failed' })
  })

  it('deleteRating wirft, wenn das Löschen der Bewertung fehlschlägt', async () => {
    from.mockReturnValue(builder({ data: null, error: { message: 'delete failed' } }))
    await expect(deleteRating('r1')).rejects.toMatchObject({ message: 'delete failed' })
  })

  it('addToWishlist löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(addToWishlist('d1', 'u1')).resolves.toBeUndefined()
  })

  it('shareRatingToGroup wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'share failed' } }))
    await expect(shareRatingToGroup('g1', 'r1', 'u1')).rejects.toMatchObject({ message: 'share failed' })
  })
})
