import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)

  const path = location.pathname
  const view = searchParams.get('view')
  const isGlobal = path === '/' && view !== 'vitrine' && view !== 'live'
  const isVitrine = path === '/' && view === 'vitrine'
  const isTastings = path.startsWith('/groups')
  const isProfil = path.startsWith('/profile')

  const go = (to: string) => { setSheetOpen(false); navigate(to) }

  const tab = (active: boolean, icon: string, label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${active ? 'text-amber-400' : 'text-stone-500 hover:text-stone-300'}`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setSheetOpen(false)}>
          <div
            className="bg-stone-900 rounded-t-2xl w-full max-w-2xl mx-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-2"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-stone-700 rounded-full mx-auto mb-2" />
            <SheetItem icon="🥃" title="Live posten" sub="Teile, was du gerade trinkst" onClick={() => go('/?view=live')} />
            <SheetItem icon="➕" title="Whisky hinzufügen" sub="Neuen Whisky in den Katalog" onClick={() => go('/add-whisky')} />
            <SheetItem icon="👥" title="Gruppe erstellen" sub="Starte eine neue Gruppe" onClick={() => go('/groups?create=1')} />
            <SheetItem icon="📋" title="Tasting erstellen" sub="In einer deiner Gruppen" onClick={() => go('/groups')} />
            <button onClick={() => setSheetOpen(false)} className="mt-2 text-stone-400 text-sm py-2">Abbrechen</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-stone-950/95 backdrop-blur border-t border-stone-800/60 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto flex items-end relative">
          {tab(isGlobal, '🌍', 'Global', () => go('/'))}
          {tab(isVitrine, '🥃', 'Sammlung', () => go('/?view=vitrine'))}
          <div className="flex-1 relative flex justify-center">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label="Hinzufügen"
              className="absolute -top-5 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 text-3xl font-light flex items-center justify-center shadow-lg shadow-black/40"
            >
              +
            </button>
          </div>
          {tab(isTastings, '📋', 'Tastings', () => go('/groups'))}
          {tab(isProfil, '👤', 'Profil', () => go('/profile'))}
        </div>
      </nav>
    </>
  )
}

function SheetItem({ icon, title, sub, onClick }: { icon: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 bg-stone-800 hover:bg-stone-700 rounded-xl p-3 text-left transition-colors"
    >
      <span className="text-2xl w-8 text-center flex-shrink-0">{icon}</span>
      <div>
        <p className="font-semibold text-stone-100">{title}</p>
        <p className="text-xs text-stone-400">{sub}</p>
      </div>
    </button>
  )
}
