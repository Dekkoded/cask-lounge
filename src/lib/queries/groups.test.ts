import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import {
  getGroup,
  listMyGroups,
  listMembers,
  removeMember,
  createGroup,
  joinGroup,
} from './groups'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn(), rpc: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'order', 'delete', 'single']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>
const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  from.mockReset()
  rpc.mockReset()
})

describe('groups queries – Lesezugriffe', () => {
  it('getGroup gibt die Gruppe zurück', async () => {
    const group = { id: 'g1', name: 'Islay Fans', description: null, owner_id: 'u1', invite_code: 'ABC' }
    from.mockReturnValue(builder({ data: group }))
    await expect(getGroup('g1')).resolves.toEqual(group)
    expect(from).toHaveBeenCalledWith('groups')
  })

  it('getGroup wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'not found' } }))
    await expect(getGroup('g1')).rejects.toMatchObject({ message: 'not found' })
  })

  it('listMyGroups liefert die Liste', async () => {
    const rows = [{ id: 'g1', name: 'A', description: null }]
    from.mockReturnValue(builder({ data: rows }))
    await expect(listMyGroups()).resolves.toEqual(rows)
  })

  it('listMyGroups liefert [] bei leerem Ergebnis', async () => {
    from.mockReturnValue(builder({ data: null }))
    await expect(listMyGroups()).resolves.toEqual([])
  })

  it('listMembers liefert die Mitglieder', async () => {
    const rows = [{ user_id: 'u1', role: 'owner', joined_at: '2026-01-01', profiles: { username: 'leon', display_name: null } }]
    from.mockReturnValue(builder({ data: rows }))
    await expect(listMembers('g1')).resolves.toEqual(rows)
  })
})

describe('groups queries – Schreibzugriffe (werfen bei Fehler)', () => {
  it('removeMember löst auf, wenn kein Fehler auftritt', async () => {
    from.mockReturnValue(builder({ error: null }))
    await expect(removeMember('g1', 'u2')).resolves.toBeUndefined()
  })

  it('removeMember wirft bei einem Fehler', async () => {
    from.mockReturnValue(builder({ error: { message: 'delete failed' } }))
    await expect(removeMember('g1', 'u2')).rejects.toMatchObject({ message: 'delete failed' })
  })

  it('createGroup liefert die neue Gruppen-ID', async () => {
    rpc.mockResolvedValue({ data: 'g-new', error: null })
    await expect(createGroup('Neue Gruppe', 'Beschreibung')).resolves.toBe('g-new')
    expect(rpc).toHaveBeenCalledWith('create_group', { p_name: 'Neue Gruppe', p_description: 'Beschreibung' })
  })

  it('createGroup wirft bei einem Fehler', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rpc failed' } })
    await expect(createGroup('X', null)).rejects.toMatchObject({ message: 'rpc failed' })
  })

  it('joinGroup liefert die Gruppen-ID bei Erfolg', async () => {
    rpc.mockResolvedValue({ data: 'g1', error: null })
    await expect(joinGroup('CODE')).resolves.toBe('g1')
    expect(rpc).toHaveBeenCalledWith('join_group', { p_invite_code: 'CODE' })
  })

  it('joinGroup liefert null, wenn kein Code passt', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await expect(joinGroup('CODE')).resolves.toBeNull()
  })

  it('joinGroup wirft bei einem Fehler', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Gruppe nicht gefunden' } })
    await expect(joinGroup('CODE')).rejects.toMatchObject({ message: 'Gruppe nicht gefunden' })
  })
})
