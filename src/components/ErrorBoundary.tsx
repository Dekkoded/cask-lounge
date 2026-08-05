import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from 'i18next'
import { captureError } from '../lib/monitoring'

// Erkennt Fehler beim Nachladen von Lazy-Chunks. Nach einem neuen Deploy haben
// bereits offene Clients veraltete Chunk-Hashes referenziert – der dynamische
// Import schlägt dann fehl. Statt eines Weißbildschirms laden wir die Seite
// einmalig neu, um die frischen Assets zu holen.
const CHUNK_ERROR_RE =
  /dynamically imported module|module script failed|importing a module script|ChunkLoadError|Failed to fetch/i

// Verhindert eine Endlosschleife: nach einem automatischen Reload warten wir
// mindestens 10 s, bevor erneut automatisch neu geladen wird.
const RELOAD_KEY = 'cl_chunk_reload_at'
const RELOAD_COOLDOWN_MS = 10_000

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const msg = error?.message ?? ''
    if (CHUNK_ERROR_RE.test(msg)) {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
      if (Date.now() - last > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
        window.location.reload()
      }
      // Veraltete Chunks sind ein Deploy-Artefakt, kein echter Bug -> nicht melden.
      return
    }
    // Echte Laufzeitfehler ans Monitoring melden (no-op ohne DSN).
    captureError(error, { componentStack: info.componentStack })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div
        role="alert"
        className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <span className="text-5xl">🥃</span>
        <h1 className="text-xl font-bold text-stone-100">{i18n.t('errors.title')}</h1>
        <p className="text-stone-400 text-sm max-w-sm">{i18n.t('errors.message')}</p>
        <button
          onClick={this.handleReload}
          className="mt-2 px-5 py-2.5 rounded-xl bg-amber-500 text-stone-950 font-semibold active:scale-95 transition-transform"
        >
          {i18n.t('errors.reload')}
        </button>
      </div>
    )
  }
}
