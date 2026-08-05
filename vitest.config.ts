import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Eigenständige Test-Konfiguration: bewusst ohne die PWA-/Tailwind-Plugins aus
// vite.config.ts, damit die Testläufe schlank und schnell bleiben. React-Plugin
// wird für JSX-Transformation in Komponententests benötigt.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
