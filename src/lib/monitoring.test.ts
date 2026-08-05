import { describe, it, expect } from 'vitest'
import { MONITORING_ENABLED, captureError, initMonitoring } from './monitoring'

// Im Test ist VITE_SENTRY_DSN nicht gesetzt -> Monitoring bleibt aus. Wichtig
// ist, dass die Helfer dann folgenlos no-op'en und niemals werfen (sie werden
// aus der ErrorBoundary heraus aufgerufen, dürfen also nie selbst crashen).
describe('monitoring (ohne DSN)', () => {
  it('ist deaktiviert, wenn kein DSN gesetzt ist', () => {
    expect(MONITORING_ENABLED).toBe(false)
  })

  it('initMonitoring löst folgenlos auf', async () => {
    await expect(initMonitoring()).resolves.toBeUndefined()
  })

  it('captureError wirft nicht und gibt nichts zurück', () => {
    expect(() => captureError(new Error('boom'))).not.toThrow()
    expect(() => captureError(new Error('boom'), { userId: 42 })).not.toThrow()
  })
})
