import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { thumbUrl } from '../../lib/image'
import type { ArchiveDrink } from '../../lib/queries/archive'

interface Props {
  archive: ArchiveDrink[]
}

/** Rangliste aller in der Gruppe bewerteten Whiskys, nach Durchschnitt sortiert. */
export default function ArchiveTab({ archive }: Props) {
  const { t } = useTranslation()

  if (archive.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-stone-500 text-center py-8">
          {t('groups.noArchive')}
          <br />
          <span className="text-sm">{t('groups.noArchiveSub')}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {archive.map((drink, i) => {
        const avg = drink.scores.length
          ? Math.round(drink.scores.reduce((s, v) => s + v, 0) / drink.scores.length * 10) / 10
          : null
        return (
          <Link
            key={drink.id}
            to={`/whisky/${drink.id}`}
            className="press flex items-center gap-4 bg-stone-900 hover:bg-stone-800 rounded-xl p-4 transition-colors"
          >
            <span className="text-stone-600 font-mono text-sm w-5 text-center">{i + 1}</span>
            {drink.photo_url ? (
              <img src={thumbUrl(drink.photo_url, 112)} alt={drink.name} loading="lazy" decoding="async" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
            ) : (
              <div className="w-14 h-14 bg-stone-800 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">🥃</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-100 truncate">{drink.name}</p>
              {drink.producer && <p className="text-sm text-stone-400 truncate">{drink.producer}</p>}
              <p className="text-xs text-stone-600 mt-0.5">
                {t('groups.ratingCount', { count: drink.scores.length })}
              </p>
            </div>
            {avg != null ? (
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-amber-400">{avg}</p>
                <p className="text-xs text-stone-500">/10</p>
              </div>
            ) : (
              <span className="text-stone-600 text-sm">—</span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
