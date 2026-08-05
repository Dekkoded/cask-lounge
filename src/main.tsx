import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Selbst-gehostete, variable Schriften (DSGVO-konform, offline-fähig).
// Inter = UI/Fließtext, Fraunces = edle Display-Serif für Titel/Marke.
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './index.css'
import './i18n'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { initMonitoring } from './lib/monitoring'

// Fehler-Monitoring so früh wie möglich anstoßen (no-op ohne VITE_SENTRY_DSN).
initMonitoring()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
