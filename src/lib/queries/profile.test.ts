import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  getProfile,
  loadRatingStats,
  isUsernameTaken,
  isUserAdmin,
  updateProfile,
  searchProfiles,
  getMemberInfo,
  listPublicRatedDrinks,
} from './profile'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'or', 'order', 'limit', 'update', 'single', 'maybeSingle']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
})

describe('profile queries – Lesezugriffe (best-effort)', () => {
  it('getProfile gibt die Profilzeile zurück', async () => {
    const row = { id: 'u1', display_name: 'Leon', username: 'leon', avatar_url: null, email_notifications: true, notification_prefs: null }
    from.mockReturnValue(builder({ data: row }))
    await expect(getProfile('u1')).resolves.toEqual(row)
    expect(from).toHaveBeenCalledWith('profiles')
  })

  it('getProfile gibt null zurück, wenn nichts gefunden wird', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(getProfile('u1')).resolves.toBeNull()
  })

  it('loadRatingStats aggregiert Anzahl, Schnitt und Top-Region', async () => {
    from.mockReturnValue(builder({ data: [
      { overall: 8, drinks: { region: 'Islay' } },
      { overall: 6, drinks: { region: 'Islay' } },
      { overall: null, drinks: { region: 'Speyside' } },
    ] }))
    await expect(loadRatingStats('u1')).resolves.toEqual({ count: 3, avg: 7, topRegion: 'Islay' })
  })

  it('loadRatingStats liefert Defaults bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(loadRatingStats('u1')).resolves.toEqual({ count: 0, avg: null, topRegion: null })
  })

  it('isUsernameTaken ist true, wenn ein anderer Nutzer den Namen hat', async () => {
    from.mockReturnValue(builder({ data: { id: 'u2' } }))
    await expect(isUsernameTaken('leon', 'u1')).resolves.toBe(true)
  })

  it('isUsernameTaken ist false ohne Treffer', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(isUsernameTaken('leon', 'u1')).resolves.toBe(false)
  })

  it('isUserAdmin ist true, wenn is_admin gesetzt ist', async () => {
    from.mockReturnValue(builder({ data: { is_admin: true } }))
    await expect(isUserAdmin('u1')).resolves.toBe(true)
  })

  it('isUserAdmin ist false ohne Treffer oder ohne Flag', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(isUserAdmin('u1')).resolves.toBe(false)
  })

  it('searchProfiles liefert die Trefferliste', async () => {
    const rows = [{ id: 'u2', username: 'ida', display_name: null, avatar_url: null }]
    from.mockReturnValue(builder({ data: rows }))
    await expect(searchProfiles('ida')).resolves.toEqual(rows)
  })

  it('searchProfiles liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(searchProfiles('')).resolves.toEqual([])
  })

  it('getMemberInfo gibt null zurück, wenn nichts gefunden wird', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(getMemberInfo('u2')).resolves.toBeNull()
  })

  it('listPublicRatedDrinks flacht Drinks samt Note ab und filtert Leere', async () => {
    from.mockReturnValue(builder({ data: [
      { overall: 9, drinks: { id: 'd1', name: 'Ardbeg', producer: 'A', region: 'Islay', photo_url: null } },
      { overall: 5, drinks: null },
    ] }))
    await expect(listPublicRatedDrinks('u2')).resolves.toEqual([
      { id: 'd1', name: 'Ardbeg', producer: 'A', region: 'Islay', photo_url: null, overall: 9 },
    ])
  })
})

describe('profile queries – Schreibzugriffe (werfen bei Fehler)', () => {
  it('updateProfile löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(updateProfile('u1', { display_name: 'X' })).resolves.toBeUndefined()
  })

  it('updateProfile wirft bei einem Postgrest-Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'update failed' } }))
    await expect(updateProfile('u1', { display_name: 'X' })).rejects.toMatchObject({ message: 'update failed' })
  })
})
