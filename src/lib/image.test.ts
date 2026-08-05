import { describe, it, expect } from 'vitest'
import { thumbUrl } from './image'

describe('thumbUrl', () => {
  it('gibt undefined zurück für leere Eingaben', () => {
    expect(thumbUrl(null, 300)).toBeUndefined()
    expect(thumbUrl(undefined, 300)).toBeUndefined()
  })

  it('lässt Nicht-Storage-URLs unverändert', () => {
    const external = 'https://example.com/bild.jpg'
    expect(thumbUrl(external, 300)).toBe(external)
  })

  it('lässt URLs unverändert, solange Transforms deaktiviert sind (Default)', () => {
    // VITE_IMAGE_TRANSFORMS ist im Test nicht gesetzt -> Feature aus, daher
    // wird auch eine Storage-URL unverändert durchgereicht.
    const storage =
      'https://x.supabase.co/storage/v1/object/public/photos/a.jpg'
    expect(thumbUrl(storage, 300)).toBe(storage)
  })
})
