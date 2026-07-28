// Read a scanned CV — the fallback for a PDF with no usable text layer.
//
// This is OCR, done by the model the user already configured rather than by
// shipping a WASM OCR engine. Bundling tesseract would add several megabytes to
// the extension for a case most CVs never hit — a PDF exported from Word or
// LaTeX always has a text layer, and scans come from a phone camera or a
// photocopier.
//
// Transcription ONLY. It deliberately does not parse the CV into a profile:
// that is extract-profile's job, and it is far better at it than a vision pass
// would be. Splitting them means the scanned path and the normal path converge
// on the same extractor, so a scanned CV and a text one produce the same
// quality of profile — and any improvement to extraction benefits both.

import { systemAgent, type LlmClient } from '../../systemAgent'

const PROMPT = [
  'You transcribe document images into plain text.',
  'Reproduce every word you can read, in reading order, top to bottom.',
  'Preserve the structure: keep headings on their own lines, keep list items as separate lines,',
  'and keep dates and job titles next to the text they belong to.',
  'Multi-column layouts read down one column, then the next — not across.',
  'Do NOT summarise, correct, translate, reorder or add anything.',
  'If a word is genuinely illegible, write [?] in its place rather than guessing.',
  'Return ONLY the transcribed text — no commentary, no markdown fences.',
].join(' ')

/** How many pages to send. A CV that runs past this is unusual, and each page
 *  is an image the user pays for — the cap keeps a mis-picked 200-page PDF from
 *  becoming an expensive surprise. */
export const MAX_SCAN_PAGES = 6

/**
 * Page images in, plain text out.
 *
 * No schema, so no repair-parse: the answer IS the text, and forcing it through
 * JSON would only give the model a way to fail. Callers get '' when nothing
 * legible came back and should treat that as "still unreadable".
 */
export async function readScan(client: LlmClient, images: string[]): Promise<string> {
  if (!images.length) return ''
  const res = await systemAgent({
    client,
    systemPrompt: PROMPT,
    input: `Transcribe ${images.length === 1 ? 'this page' : `these ${images.length} pages`} of a CV.`,
    images: images.slice(0, MAX_SCAN_PAGES),
    temperature: 0,
    tier: 'full',
  })
  return res.text.trim()
}
