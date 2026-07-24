// Produce the small JPEG DERIVATIVE of a user photo that CV rendering uses — a
// downscaled ~20–40 KB JPEG (headshots need no transparency; JPEG is small and
// jsPDF embeds it fast — its PNG path is pathologically slow). This is the render
// copy only. The ORIGINAL upload is kept as the source of truth in S3 (see the
// files-to-s3 work) so we can re-derive any size/crop/format later; nothing is
// thrown away. Until S3 lands, only this derivative rides in the profile.

/** The raw file as a data: URL — the ORIGINAL upload, preserved as the source of
 *  truth (kept in S3). Separate from the small render derivative below. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error ?? new Error('Could not read the file.'))
    r.readAsDataURL(file)
  })
}

export async function fileToProfilePhoto(file: File, maxEdge = 600, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process the image.')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', quality)
  } finally {
    bitmap.close()
  }
}
