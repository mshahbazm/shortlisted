// Local PDF -> plain text and page images, entirely in the extension via
// pdf.js. Covers text-based PDFs, which is every CV exported from Word or
// LaTeX. A scan has no text layer to read, so ai/run.ts renders the pages here
// and asks the user's model to transcribe them instead.

import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * PDF pages as PNG data URLs — template previews, the in-panel CV viewer, and
 * the vision fallback for scanned CVs.
 *
 * Works in both extension contexts. The side panel has a DOM and can use a
 * real <canvas>; the background service worker has neither, and is exactly
 * where background CV intake runs — so it takes the OffscreenCanvas path.
 * Getting this wrong means scanned-PDF support silently works when a human is
 * watching and fails when it is not.
 */
export async function renderPdfPages(data: Uint8Array, targetWidth: number, maxPages = 4): Promise<string[]> {
  const task = pdfjs.getDocument({ data })
  const doc = await task.promise
  try {
    const urls: string[] = []
    for (let i = 1; i <= Math.min(doc.numPages, maxPages); i++) {
      const page = await doc.getPage(i)
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: targetWidth / base.width })
      const w = Math.ceil(viewport.width)
      const h = Math.ceil(viewport.height)

      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
        urls.push(canvas.toDataURL('image/png'))
      } else {
        const canvas = new OffscreenCanvas(w, h)
        const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx, viewport }).promise
        urls.push(await blobToDataUrl(await canvas.convertToBlob({ type: 'image/png' })))
      }
    }
    return urls
  } finally {
    void task.destroy()
  }
}

/** OffscreenCanvas hands back a Blob, and a worker has no FileReader worth
 *  using — encode the bytes directly. */
async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  // Chunked: String.fromCharCode with a whole page of pixels blows the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return `data:image/png;base64,${btoa(bin)}`
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
