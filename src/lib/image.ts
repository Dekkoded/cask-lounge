// Downscale & re-encode an image client-side before upload.
// Returns a JPEG File, capped to maxDim on the longest edge.
export async function compressImage(
  file: File,
  maxDim = 1200,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resolve =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  )
  if (!blob) return file

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

// ---------------------------------------------------------------------------
// Supabase Storage Image Transformations
//
// Wandelt eine öffentliche Storage-URL in eine größenoptimierte Variante um,
// damit für kleine Thumbnails nicht das (bis 1200px große) Originalbild geladen
// wird.
//
// ACHTUNG: Image Transformations sind eine Funktion des Supabase Pro-Plans.
// Solange der Plan das nicht unterstützt, würde der render-Endpunkt Fehler
// liefern und Bilder kaputt gehen. Daher ist die Funktion per Default AUS und
// wird über die Umgebungsvariable VITE_IMAGE_TRANSFORMS=true aktiviert
// (in Vercel setzen, danach neu deployen). Solange aus, gibt der Helper die
// Original-URL unverändert zurück.
export const IMAGE_TRANSFORMS_ENABLED =
  (import.meta.env.VITE_IMAGE_TRANSFORMS as string | undefined)?.trim() === 'true'

const PUBLIC_SEGMENT = '/storage/v1/object/public/'
const RENDER_SEGMENT = '/storage/v1/render/image/public/'

/**
 * Liefert eine auf `width` skalierte Thumbnail-URL für Supabase-Storage-Bilder.
 * Für Nicht-Storage-URLs oder bei deaktivierten Transforms wird die Eingabe
 * unverändert zurückgegeben.
 *
 * @param width Zielbreite in Pixeln (idealerweise ~2× der CSS-Anzeigegröße für
 *              scharfe Darstellung auf Retina-Displays).
 */
export function thumbUrl(url: string | null | undefined, width: number): string | undefined {
  if (!url) return undefined
  if (!IMAGE_TRANSFORMS_ENABLED || !url.includes(PUBLIC_SEGMENT)) return url
  const base = url.replace(PUBLIC_SEGMENT, RENDER_SEGMENT)
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}width=${width}&quality=70`
}
