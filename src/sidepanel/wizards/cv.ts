// CV intake helpers shared by the onboarding wizards (Entry's has-CV door and
// Build's "I already have a resume" door). Pure functions, no JSX — kept out of
// the step files so both wizards run one parse/save path, not divergent copies.

import { extractPdfTextFromFile } from '../../lib/pdfText'
import { bytesToBase64, uid } from '../../lib/types'
import * as store from '../../lib/store'

// Read a CV PDF's text. No AI and no network — pdf.js reads the text layer here
// in the panel. This used to fall back to the server's OCR when the local read
// came out poor; there is no server, so a PDF with no text layer now throws
// (extractPdfTextFromFile says to paste the text instead) rather than silently
// handing the extractor a page of noise.
//
// Crucially NO storage write either: the file's bytes ride in wizard state and
// only become a saved resume via createUploadedResume.
export async function readCvPdf(file: File): Promise<{ cvText: string; cvBase64: string; cvFileName: string }> {
  const buf = await file.arrayBuffer()
  const cvText = await extractPdfTextFromFile(file)
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
