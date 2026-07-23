// CV intake helpers shared by the onboarding wizards (Entry's has-CV door and
// Build's "I already have a resume" door). Pure functions, no JSX — kept out of
// the step files so both wizards run one parse/save path, not divergent copies.

import { cloudPdfText } from '../../ai/run'
import { assessTextQuality, extractPdfTextFromFile } from '../../lib/pdfText'
import { Settings, bytesToBase64, uid } from '../../lib/types'
import * as store from '../../lib/store'

// Read a CV PDF's text (local layer, cloud OCR fallback). No AI, no credit, no
// account — and crucially NO storage write: the file's bytes ride in wizard
// state and only become a saved resume via createUploadedResume. In the Entry
// (logged-out) flow that happens after sign-in; in Build the user is already
// signed in so it can happen immediately.
export async function readCvPdf(file: File, settings: Settings): Promise<{ cvText: string; cvBase64: string; cvFileName: string }> {
  const buf = await file.arrayBuffer()
  const local = await extractPdfTextFromFile(file).catch(() => '')
  const cvText = local && assessTextQuality(local) !== 'low' ? local : (await cloudPdfText(settings, buf)).text
  return { cvText, cvBase64: bytesToBase64(buf), cvFileName: file.name }
}

/** Save the uploaded PDF as this account's first resume. Call only when signed
 *  in, so it belongs to the account and syncs up normally. Returns the id. */
export async function createUploadedResume(base64: string, fileName: string): Promise<string> {
  const id = uid()
  await store.update('resumes', (resumes) => [
    ...resumes,
    {
      id,
      label: fileName.replace(/\.pdf$/i, ''),
      fileName,
      tags: [],
      isDefault: resumes.every((r) => !r.isDefault),
      createdAt: Date.now(),
      source: 'uploaded' as const,
      dataBase64: base64,
    },
  ])
  return id
}
