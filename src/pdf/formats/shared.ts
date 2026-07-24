// Shared PDF primitives for the REGIONAL format renderers (Europass, Lebenslauf).
// The Anglo/ATS renderer keeps its own internal closures in ../resumePdf.ts and
// is deliberately untouched by this module — these helpers exist so each new,
// structurally-different format is a small self-contained file over one painter.

import { jsPDF } from 'jspdf'
import type { LanguageProficiency } from '../../lib/types'

export const PAGE_W = 595.28 // A4 in points
export const PAGE_H = 841.89
export const MARGIN = 48

export const INK = '#1a1a1a'
export const SOFT = '#555555'
export const LINE = '#c9c9c9'

/** A text cursor down a column. Regional formats never spill columns sideways,
 *  so page-break is unconditional (unlike the ATS sidebar). */
export interface Cursor {
  x: number
  w: number
  y: number
}

// ---- CEFR (Europass language grid uses A1–C2) ----
export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

/** Map our 5-level proficiency onto the CEFR scale Europass expects. Lossy by
 *  design (we store one level per language, not per-skill) — the mapped level
 *  fills every column, which is the honest default when not self-assessed apart. */
export function toCefr(p: LanguageProficiency): Cefr {
  switch (p) {
    case 'elementary':
      return 'A2'
    case 'limited_working':
      return 'B1'
    case 'professional_working':
      return 'B2'
    case 'full_professional':
      return 'C1'
    case 'native_bilingual':
      return 'C2'
  }
}

export const isMotherTongue = (p: LanguageProficiency) => p === 'native_bilingual'

/** A minimal painter over a jsPDF doc: fonts, page-break-aware text, bullets. */
export function painter(doc: jsPDF, family: 'helvetica' | 'times' = 'helvetica') {
  const setFont = (bold: boolean, size: number, color: string = INK) => {
    doc.setFont(family, bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(color)
  }

  const ensure = (c: Cursor, need: number) => {
    if (c.y + need <= PAGE_H - MARGIN) return
    doc.addPage()
    c.y = MARGIN
  }

  const text = (
    c: Cursor,
    str: string,
    size: number,
    o: { bold?: boolean; color?: string; lh?: number; gap?: number; indent?: number; align?: 'left' | 'right' } = {},
  ) => {
    if (!str) return
    setFont(o.bold ?? false, size, o.color ?? INK)
    const indent = o.indent ?? 0
    const lines = doc.splitTextToSize(str, c.w - indent) as string[]
    const lineH = size * (o.lh ?? 1.35)
    for (const ln of lines) {
      ensure(c, lineH)
      if (o.align === 'right') doc.text(ln, c.x + c.w, c.y, { align: 'right' })
      else doc.text(ln, c.x + indent, c.y)
      c.y += lineH
    }
    c.y += o.gap ?? 0
  }

  const bullet = (c: Cursor, str: string, size: number, accent: string) => {
    if (!str) return
    setFont(false, size, INK)
    const lines = doc.splitTextToSize(str, c.w - 14) as string[]
    const lineH = size * 1.35
    ensure(c, lineH)
    doc.setTextColor(accent)
    doc.text('•', c.x + 2, c.y)
    doc.setTextColor(INK)
    for (const ln of lines) {
      ensure(c, lineH)
      doc.text(ln, c.x + 14, c.y)
      c.y += lineH
    }
    c.y += 1.5
  }

  return { doc, setFont, ensure, text, bullet }
}

/** Finish a doc to storage base64 (no data: prefix), matching renderResumePdf. */
export function toBase64(doc: jsPDF): string {
  return doc.output('datauristring').split(',')[1]
}
