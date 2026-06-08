import { useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LivePostModal from './LivePostModal'
import CreateTastingModal from './CreateTastingModal'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [livePostOpen, setLivePostOpen] = useState(false)
  const [tastingOpen, setTastingOpen] = useState(false)
  const { t } = useTranslation()

  const path = location.pathname
  const view = searchParams.get('view')
  const isGlobal = path === '/' && view !== 'vitrine' && view !== 'wishlist' && view !== 'live'
  const isVitrine = path === '/' && (view === 'vitrine' || view === 'wishlist')
  const isGruppen = path === '/groups' || path.startsWith('/groups/')
  const isProfile = path === '/profile'

  const go = (to: string) => { setSheetOpen(false); navigate(to) }
  const openModal = (setter: (v: boolean) => void) => { setSheetOpen(false); setter(true) }

  const openGroups = () => {
    const last = localStorage.getItem('lastGroupId')
    go(last ? `/groups/${last}` : '/groups')
  }

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
            <SheetItem icon="🥃" title={t('nav.sheet.livePost.title')} sub={t('nav.sheet.livePost.sub')} onClick={() => openModal(setLivePostOpen)} />
            <SheetItem icon="➕" title={t('nav.sheet.addWhisky.title')} sub={t('nav.sheet.addWhisky.sub')} onClick={() => go('/add-whisky')} />
            <SheetItem icon="📋" title={t('nav.sheet.createTasting.title')} sub={t('nav.sheet.createTasting.sub')} onClick={() => openModal(setTastingOpen)} />
            <button onClick={() => setSheetOpen(false)} className="mt-2 text-stone-400 text-sm py-2">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-app/95 backdrop-blur border-t border-stone-800/60 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-2xl mx-auto flex h-16 items-stretch">
          {tab(isGlobal, '🌍', t('nav.global'), () => go('/'))}
          {tab(isVitrine, '🥃', t('nav.collection'), () => go('/?view=vitrine'))}
          <div className="flex-1 flex justify-center items-start">
            <button
              onClick={() => setSheetOpen(true)}
              aria-label={t('nav.add')}
              className="-mt-6 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/30 ring-4 ring-app transition-transform"
            >
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>
          {tab(isGruppen, '👥', t('nav.groups'), openGroups)}
          {tab(isProfile, '👤', t('nav.profile'), () => go('/profile'))}
        </div>
      </nav>

      <LivePostModal open={livePostOpen} onClose={() => setLivePostOpen(false)} />
      <CreateTastingModal open={tastingOpen} onClose={() => setTastingOpen(false)} />
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
