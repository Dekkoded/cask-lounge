import { useTranslation } from 'react-i18next'
import Modal from '../Modal'
import type { GroupSummary } from '../../lib/queries/groups'

interface Props {
  open: boolean
  onClose: () => void
  groups: GroupSummary[]
  currentId?: string
  onSelect: (groupId: string) => void
  onCreateNew: () => void
}

/** Modal zum Wechseln zwischen den Gruppen des Nutzers. */
export default function GroupSwitcher({ open, onClose, groups, currentId, onSelect, onCreateNew }: Props) {
  const { t } = useTranslation()
  return (
    <Modal open={open} onClose={onClose} ariaLabel={t('groups.switchGroup')} className="w-full max-w-lg p-6 gap-3">
      <h3 className="text-lg font-bold text-stone-100">{t('groups.switchGroup')}</h3>
      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        {groups.map(g => (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
              g.id === currentId ? 'bg-amber-500/15 border border-amber-500/40' : 'bg-stone-800 hover:bg-stone-700'
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-stone-700 flex items-center justify-center text-lg flex-shrink-0">👥</div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${g.id === currentId ? 'text-amber-300' : 'text-stone-100'}`}>{g.name}</p>
              {g.description && <p className="text-xs text-stone-500 truncate">{g.description}</p>}
            </div>
            {g.id === currentId && <span className="text-amber-400 flex-shrink-0">✓</span>}
          </button>
        ))}
      </div>
      <button
        onClick={onCreateNew}
        className="flex items-center gap-3 rounded-xl px-4 py-3 text-left bg-stone-800 hover:bg-stone-700 transition-colors"
      >
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg text-amber-400 flex-shrink-0">+</div>
        <p className="font-semibold text-stone-200">{t('groups.createOrJoin')}</p>
      </button>
    </Modal>
  )
}
