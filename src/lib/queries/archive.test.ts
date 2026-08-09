import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../supabase'
import { loadGroupArchive } from './archive'

// Der Supabase-Client wird komplett gemockt: kein Netzwerk, keine Env-Variablen.
vi.mock('../supabase', () => ({ supabase: { from: vi.fn() } }))

// Baut einen fluent-Query-Builder nach: jede Kettenmethode gibt den Builder
// zurück, und `await builder` löst zum vorgegebenen Ergebnis auf.
function builder(result: { data?: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in']) {
    b[m] = vi.fn(() => b)
  }
  b.then = (resolve: (r: unknown) => unknown) => resolve(result)
  return b
}

const from = supabase.from as unknown as ReturnType<typeof vi.fn>

// Routet die einzelnen Tabellen-Abfragen von loadGroupArchive auf feste Ergebnisse.
function route(results: Record<string, { data?: unknown; error?: unknown }>) {
  from.mockImplementation((table: string) => builder(results[table] ?? { data: null }))
}

const drink = (id: string, name: string) => ({ id, name, producer: null, photo_url: null })

beforeEach(() => {
  from.mockReset()
})

describe('archive queries', () => {
  it('liefert [] bei komplett leeren Quellen', async () => {
    route({ group_ratings: { data: null }, tastings: { data: null } })
    await expect(loadGroupArchive('g1')).resolves.toEqual([])
  })

  it('überspringt Tasting-Abfragen, wenn die Gruppe keine Tastings hat', async () => {
    route({
      group_ratings: { data: [{ ratings: { overall: 7, drinks: drink('d1', 'Ardbeg') } }] },
      tastings: { data: [] },
    })
    const result = await loadGroupArchive('g1')
    expect(result).toEqual([{ id: 'd1', name: 'Ardbeg', producer: null, photo_url: null, scores: [7] }])
    // Ohne Tastings dürfen tasting_drinks/tasting_ratings gar nicht abgefragt werden.
    expect(from).not.toHaveBeenCalledWith('tasting_drinks')
    expect(from).not.toHaveBeenCalledWith('tasting_ratings')
  })

  it('führt beide Quellen zusammen und sortiert nach Durchschnitts-Score', async () => {
    route({
      group_ratings: { data: [
        { ratings: { overall: 6, drinks: drink('d1', 'Ardbeg') } },
        { ratings: { overall: null, drinks: drink('d2', 'Lagavulin') } },
      ] },
      tastings: { data: [{ id: 't1' }] },
      tasting_drinks: { data: [
        { drink_id: 'd2', drinks: drink('d2', 'Lagavulin') },
        { drink_id: 'd3', drinks: drink('d3', 'Talisker') },
      ] },
      tasting_ratings: { data: [
        { drink_id: 'd2', overall: 9 },
        { drink_id: 'd3', overall: 8 },
        { drink_id: 'd1', overall: 6 },
      ] },
    })
    const result = await loadGroupArchive('g1')
    // d2: (9) avg 9 → d3: (8) avg 8 → d1: (6,6) avg 6
    expect(result.map(d => d.id)).toEqual(['d2', 'd3', 'd1'])
    expect(result.find(d => d.id === 'd1')!.scores).toEqual([6, 6])
    expect(result.find(d => d.id === 'd2')!.scores).toEqual([9])
  })
})
