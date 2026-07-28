// CV intake helpers shared by the onboarding wizards (Entry's has-CV door and
// Build's "I already have a resume" door). Pure functions, no JSX — kept out of
// the step files so both wizards run one parse/save path, not divergent copies.

import { readCvText } from '../../ai/run'
import { bytesToBase64, uid } from '../../lib/types'
import * as store from '../../lib/store'

// Read a CV PDF's text. pdf.js reads the text layer locally; if there isn't one
// — a scan or a photo — readCvText falls back to asking the configured model to
// transcribe the rendered pages, but only when the setup probe proved it can
// read images. Routed through run.ts rather than calling pdf.js directly, so
// this path gets that fallback like every other place a CV can be uploaded.
//
// Crucially NO storage write: the file's bytes ride in wizard state and only
// become a saved resume via createUploadedResume.
export async function readCvPdf(file: File): Promise<{ cvText: string; cvBase64: string; cvFileName: string }> {
  const buf = await file.arrayBuffer()
  const cvText = await readCvText(buf)
  return { cvText, cvBase64: bytesToBase64(buf), cvFileName: file.name }
}

/** Save the uploaded PDF as a resume. Returns the id. */
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
