import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { GlobalDrinkScore } from '../lib/types'
import CompareWheel from '../components/CompareWheel'
import { aromaLabel } from '../components/AromaTags'
import { usePageMeta } from '../lib/pageMeta'

const COLORS = ['#f59e0b', '#60a5fa', '#34d399']
const MAX = 3

interface RatingRow {
  overall: number | null
  nose: number | null
  taste: number | null
  finish: number | null
  wheels: { nose?: number[]; taste?: number[]; aromas?: string[]; extra?: string[] } | null
}

interface CompareData {
  id: string
  name: string
  producer: string | null
  region: string | null
  photo_url: string | null
  count: number
  avgOverall: number | null
  avgNose: number | null
  avgTaste: number | null
  avgFinish: number | null
  wheelNose: number[]
  wheelTaste: number[]
  aromas: { token: string; count: number }[]
}

function avg(nums: number[]): number | null {
  if (!nums.length) return null
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10
}

function avgWheel(rows: RatingRow[], type: 'nose' | 'taste'): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const vs = rows.map(r => r.wheels?.[type]?.[i]).filter((v): v is number => typeof v === 'number')
    return vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : 0
  })
}

export default function Compare() {
  const { t } = useTranslation()
  usePageMeta({ title: t('compare.title'), description: t('compare.subtitle') })
  const [params, setParams] = useSearchParams()
  const ids = (params.get('ids') || '').split(',').filter(Boolean).slice(0, MAX)

  const [scores, setScores] = useState<GlobalDrinkScore[]>([])
  const [data, setData] = useState<Record<string, CompareData>>({})
  const [search, setSearch] = useState('')
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    supabase.from('global_drink_scores').select('*')
      .order('avg_overall', { ascending: false, nullsFirst: false })
      .then(({ data }) => setScores(data ?? []))
  }, [])

  useEffect(() => {
    const missing = ids.filter(id => !data[id])
    if (missing.length === 0) return
    let cancelled = false
    ;(async () => {
      const updates: Record<string, CompareData> = {}
      for (const id of missing) {
        const [{ data: drink }, { data: ratings }] = await Promise.all([
          supabase.from('drinks').select('id, name, producer, region, photo_url').eq('id', id).single(),
          supabase.from('ratings').select('overall, nose, taste, finish, wheels').eq('drink_id', id).eq('is_public', true),
        ])
        if (!drink) continue
        const rs = (ratings ?? []) as RatingRow[]
        const freq = new Map<string, number>()
        for (const r of rs) {
          const tokens = [...(r.wheels?.aromas ?? []), ...(r.wheels?.extra ?? [])]
          for (const tok of new Set(tokens)) freq.set(tok, (freq.get(tok) ?? 0) + 1)
        }
        updates[id] = {
          id: drink.id,
          name: drink.name,
          producer: drink.producer,
          region: drink.region,
          photo_url: drink.photo_url,
          count: rs.length,
          avgOverall: avg(rs.map(r => r.overall).filter((n): n is number => n != null)),
          avgNose: avg(rs.map(r => r.nose).filter((n): n is number => n != null)),
          avgTaste: avg(rs.map(r => r.taste).filter((n): n is number => n != null)),
          avgFinish: avg(rs.map(r => r.finish).filter((n): n is number => n != null)),
          wheelNose: avgWheel(rs, 'nose'),
          wheelTaste: avgWheel(rs, 'taste'),
          aromas: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([token, count]) => ({ token, count })),
        }
      }
      if (!cancelled) setData(d => ({ ...d, ...updates }))
    })()
    return () => { cancelled = true }
  }, [ids.join(','), data])

  const setIds = (next: string[]) => {
    const uniq = [...new Set(next)].slice(0, MAX)
    setParams(uniq.length ? { ids: uniq.join(',') } : {}, { replace: true })
  }
  const addId = (id: string) => { setIds([...ids, id]); setPicking(false); setSearch('') }
  const removeId = (id: string) => setIds(ids.filter(x => x !== id))

  const selected = ids.map(id => data[id]).filter((d): d is CompareData => !!d)
  const q = search.toLowerCase()
  const pickList = scores.filter(s =>
    !ids.includes(s.id) &&
    (s.name.toLowerCase().includes(q) || (s.producer ?? '').toLowerCase().includes(q) || (s.region ?? '').toLowerCase().includes(q))
  )

  // Bestwert je Kennzahl ermitteln (für Hervorhebung).
  const best = (key: 'avgOverall' | 'avgNose' | 'avgTaste' | 'avgFinish'): number | null => {
    const vals = selected.map(d => d[key]).filter((v): v is number => v != null)
    return vals.length ? Math.max(...vals) : null
  }

  const METRICS: { key: 'avgOverall' | 'avgNose' | 'avgTaste' | 'avgFinish'; label: string }[] = [
    { key: 'avgOverall', label: t('compare.overall') },
    { key: 'avgNose', label: t('whisky.nose') },
    { key: 'avgTaste', label: t('whisky.taste') },
    { key: 'avgFinish', label: t('whisky.finish') },
  ]

  const cols = selected.length || 1

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24">
      <Link to="/" className="text-stone-400 hover:text-stone-200 text-sm">← {t('common.back')}</Link>
      <h1 className="text-2xl font-bold text-stone-100 mt-3 mb-1">{t('compare.title')}</h1>
      <p className="text-stone-500 text-sm mb-5">{t('compare.subtitle')}</p>

      {/* Auswahl-Spalten */}
      {selected.length > 0 && (
        <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {selected.map((d, i) => (
            <div key={d.id} className="bg-stone-900 rounded-xl p-3 flex flex-col items-center text-center">
              {d.photo_url ? (
                <img src={d.photo_url} alt={d.name} className="w-16 h-16 object-cover rounded-lg mb-2" />
              ) : (
                <div className="w-16 h-16 bg-stone-800 rounded-lg flex items-center justify-center text-2xl mb-2">🥃</div>
              )}
              <span className="w-2.5 h-2.5 rounded-full mb-1" style={{ backgroundColor: COLORS[i] }} />
              <Link to={`/whisky/${d.id}`} className="text-sm font-semibold text-stone-100 hover:text-amber-400 leading-tight line-clamp-2">
                {d.name}
              </Link>
              {d.producer && <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{d.producer}</p>}
              <button onClick={() => removeId(d.id)} className="text-red-500 hover:text-red-400 text-xs mt-2">
                {t('compare.remove')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hinzufügen */}
      {ids.length < MAX && (
        <div className="mb-6">
          {!picking ? (
            <button
              onClick={() => setPicking(true)}
              className="w-full border border-dashed border-stone-700 hover:border-stone-600 text-stone-400 rounded-xl py-3 text-sm transition-colors"
            >
              + {t('compare.addWhisky')}
            </button>
          ) : (
            <div className="bg-stone-900 rounded-xl p-3">
              <input
                type="search"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('compare.searchPlaceholder')}
                className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 mb-2 [&::-webkit-search-cancel-button]:hidden"
              />
              <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
                {pickList.slice(0, 30).map(s => (
                  <button
                    key={s.id}
                    onClick={() => addId(s.id)}
                    className="flex items-center gap-3 text-left rounded-lg p-2 hover:bg-stone-800 transition-colors"
                  >
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-stone-800 rounded flex items-center justify-center flex-shrink-0">🥃</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-stone-200 truncate">{s.name}</p>
                      <p className="text-xs text-stone-500 truncate">{[s.producer, s.region].filter(Boolean).join(' · ')}</p>
                    </div>
                  </button>
                ))}
                {pickList.length === 0 && <p className="text-stone-500 text-sm p-2">{t('compare.noResults')}</p>}
              </div>
              <button onClick={() => { setPicking(false); setSearch('') }} className="text-stone-500 hover:text-stone-300 text-sm mt-2">
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      {selected.length < 2 ? (
        <p className="text-center text-stone-500 text-sm py-8">{t('compare.pickTwo')}</p>
      ) : (
        <>
          {/* Kennzahlen */}
          <div className="bg-stone-900 rounded-xl p-4 mb-6">
            {METRICS.map(m => {
              const bestVal = best(m.key)
              return (
                <div key={m.key} className="flex items-center py-1.5 border-b border-stone-800 last:border-0">
                  <span className="text-sm text-stone-400 w-20 flex-shrink-0">{m.label}</span>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                    {selected.map(d => {
                      const v = d[m.key]
                      const isBest = v != null && bestVal != null && v === bestVal
                      return (
                        <span key={d.id} className={`text-center text-lg font-bold ${isBest ? 'text-amber-400' : 'text-stone-300'}`}>
                          {v != null ? v : '—'}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div className="flex items-center pt-1.5">
              <span className="text-sm text-stone-400 w-20 flex-shrink-0">{t('compare.ratings')}</span>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {selected.map(d => (
                  <span key={d.id} className="text-center text-sm text-stone-500">{d.count}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Aromaräder überlagert */}
          <div className="flex flex-col gap-6 mb-6">
            <CompareWheel
              label={t('whisky.wheel.nose')}
              series={selected.map((d, i) => ({ values: d.wheelNose, color: COLORS[i], name: d.name }))}
            />
            <CompareWheel
              label={t('whisky.wheel.taste')}
              series={selected.map((d, i) => ({ values: d.wheelTaste, color: COLORS[i], name: d.name }))}
            />
          </div>

          {/* Häufigste Aromen */}
          <div className="bg-stone-900 rounded-xl p-4">
            <p className="text-sm font-medium text-stone-300 mb-3">{t('compare.topAromas')}</p>
            <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {selected.map((d, i) => (
                <div key={d.id} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold" style={{ color: COLORS[i] }}>{d.name}</span>
                  {d.aromas.length === 0 ? (
                    <span className="text-xs text-stone-600">—</span>
                  ) : (
                    d.aromas.map(a => (
                      <span key={a.token} className="text-xs text-stone-400">
                        {aromaLabel(a.token, t)} <span className="text-stone-600">×{a.count}</span>
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
