// Local PDF -> plain text. Runs entirely in the extension via pdf.js —
// no AI, no server. Covers text-based PDFs (~95% of CVs); scanned images
// would need OCR, which we don't do — the caller shows a helpful message.

import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/** PDF pages as PNG data URLs — template previews and the in-panel CV viewer. */
export async function renderPdfPages(data: Uint8Array, targetWidth: number, maxPages = 4): Promise<string[]> {
  const task = pdfjs.getDocument({ data })
  const doc = await task.promise
  try {
    const urls: string[] = []
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: targetWidth / base.width })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
      urls.push(canvas.toDataURL('image/png'))
    }
    return urls
  } finally {
    void task.destroy()
  }
}

/** First page only — the template picker's thumbnails. */
export async function renderPdfThumbnail(data: Uint8Array, targetWidth: number): Promise<string> {
  return (await renderPdfPages(data, targetWidth, 1))[0] ?? ''
}

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data }).promise
  const pages: string[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()

    // Rebuild reading order: group items into lines by their y position.
    const lines = new Map<number, { x: number; str: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str) continue
      const y = Math.round(item.transform[5])
      // Merge items within 2pt of an existing line (sub/superscripts, kerning).
      let key = y
      for (const existing of lines.keys()) {
        if (Math.abs(existing - y) <= 2) {
          key = existing
          break
        }
      }
      const line = lines.get(key) ?? []
      line.push({ x: item.transform[4], str: item.str })
      lines.set(key, line)
    }

    const ordered = [...lines.entries()]
      .sort((a, b) => b[0] - a[0]) // top of page first (PDF y grows upward)
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((it) => it.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter(Boolean)

    pages.push(ordered.join('\n'))
  }

  await doc.cleanup()
  return pages.join('\n\n').trim()
}

export async function extractPdfTextFromFile(file: File): Promise<string> {
  const text = await extractPdfText(await file.arrayBuffer())
  if (text.length < 100) {
    throw new Error(
      'This PDF has almost no selectable text — it might be a scanned image. Paste your CV text instead.',
    )
  }
  return text
}

// cuee's production heuristic: word count + contact-info presence.
// 'low' usually means a scanned/graphic PDF whose text layer is garbage.
export function assessTextQuality(text: string): 'high' | 'medium' | 'low' {
  const words = text.split(/\s+/).filter(Boolean).length
  const hasEmail = /\S+@\S+\.\S+/.test(text)
  const hasPhone = /[\d\s\-()]+\d{3}[\s\-()]?\d{3}[\s-]?\d{4}/.test(text)
  if (words > 300 && (hasEmail || hasPhone)) return 'high'
  if (words > 150) return 'medium'
  return 'low'
}
