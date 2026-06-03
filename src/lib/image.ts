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
