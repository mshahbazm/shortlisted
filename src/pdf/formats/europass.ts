// Europass — the EU's official standardized CV, rebuilt to match the real layout
// (europa.eu): a TWO-COLUMN grid — a left rail holds the section labels and the
// date ranges (right-aligned), content sits in the right column; the photo lives
// in the rail; contact details use small icons; section rules carry the Europass
// square end-cap. Fixed order: Personal information → Position → About me → Work
// experience → Education and training → Language skills (CEFR self-assessment
// grid) → Digital skills.

import { jsPDF } from 'jspdf'
import { Profile, TailoredResume } from '../../lib/types'
import { ResumeTemplate } from '../templates'
import { Cursor, INK, LINE, MARGIN, PAGE_H, PAGE_W, SOFT, isMotherTongue, painter, toBase64, toCefr } from './shared'
import { EUROPASS_LOGO } from './europassLogo'

const ACCENT = '#0e4194' // the official Europass blue (sampled from the EU template)
const RAIL_W = 150
const GAP = 16
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "June 2007" / "2007" / "". */
const fullYm = (y?: number, m?: number) => (y ? `${m ? MONTHS_FULL[m - 1] + ' ' : ''}${y}` : '')

/** Europass date range: "From June 2007 to December 2015" / "From 2007 to present". */
function euRange(sY?: number, sM?: number, eY?: number, eM?: number, current?: boolean): string {
  const s = fullYm(sY, sM)
  const e = current ? 'present' : fullYm(eY, eM)
  if (!s && !e) return ''
  if (s && e) return `From ${s} to ${e}`
  return `From ${s || e}`
}

// Small line-drawn contact icons (jsPDF standard fonts can't render icon glyphs,
// so we draw them). Top-left at (x, y), ~10pt box, stroked in the accent.
function makeIcons(doc: jsPDF) {
  const set = (c: string) => {
    doc.setDrawColor(c)
    doc.setFillColor(c)
    doc.setLineWidth(0.8)
  }
  return {
    pin: (x: number, y: number, c: string) => {
      set(c)
      doc.circle(x + 4.5, y + 4, 3.2, 'S')
      doc.line(x + 2.1, y + 5.6, x + 4.5, y + 10.5)
      doc.line(x + 6.9, y + 5.6, x + 4.5, y + 10.5)
      doc.circle(x + 4.5, y + 4, 1, 'F')
    },
    phone: (x: number, y: number, c: string) => {
      set(c)
      doc.roundedRect(x + 2.4, y, 5.4, 10.4, 1.2, 1.2, 'S')
      doc.line(x + 3.7, y + 8.6, x + 6.5, y + 8.6)
    },
    mail: (x: number, y: number, c: string) => {
      set(c)
      doc.rect(x + 0.5, y + 1.8, 9, 6.6, 'S')
      doc.line(x + 0.5, y + 1.8, x + 5, y + 5.6)
      doc.line(x + 9.5, y + 1.8, x + 5, y + 5.6)
    },
    globe: (x: number, y: number, c: string) => {
      set(c)
      doc.circle(x + 5, y + 5, 4.4, 'S')
      doc.ellipse(x + 5, y + 5, 1.9, 4.4, 'S')
      doc.line(x + 0.6, y + 5, x + 9.4, y + 5)
    },
  }
}

export function renderEuropass(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  const accent = tpl.accent ?? ACCENT
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica')
  const ic = makeIcons(doc)
  const id = profile.identity

  const railRight = MARGIN + RAIL_W
  const colX = MARGIN + RAIL_W + GAP
  const pageRight = PAGE_W - MARGIN
  const col: Cursor = { x: colX, w: pageRight - colX, y: MARGIN }
  const name = `${id.firstName} ${id.lastName}`.trim()

  // ---- Header band: logo, "Curriculum Vitae", name — all centred on one line ----
  const headerC = MARGIN + 8 // vertical centre of the header row
  const logoH = 32
  const logoW = logoH * (132 / 50)
  try {
    doc.addImage(EUROPASS_LOGO, 'JPEG', MARGIN, headerC - logoH / 2, logoW, logoH)
  } catch {
    /* fall back to nothing */
  }
  p.setFont(false, 10, accent)
  doc.text('Curriculum Vitae', colX, headerC + 3.4)
  doc.text(name, pageRight, headerC + 3.4, { align: 'right' })
  col.y = headerC + logoH / 2 + 12

  // Right-aligned rail label (Europass blue) at a given baseline.
  const railLabel = (label: string, y: number) => {
    p.setFont(false, 8, accent)
    let yy = y
    for (const ln of doc.splitTextToSize(label.toUpperCase(), RAIL_W) as string[]) {
      doc.text(ln, railRight, yy, { align: 'right', charSpace: 0.3 })
      yy += 9.5
    }
  }

  // Section: rail label CENTRED on a full-width Europass-blue rule with the
  // square end-cap — line and square in the same blue at a matching weight.
  const section = (label: string) => {
    col.y += 16 // consistent space above every separator
    p.ensure(col, 26)
    const lineY = col.y
    railLabel(label, lineY + 2.6) // baseline just below the line → text sits on it
    doc.setDrawColor(accent)
    doc.setLineWidth(1.4)
    doc.line(colX, lineY, pageRight, lineY)
    doc.setFillColor(accent)
    doc.rect(pageRight - 5, lineY - 2.5, 5, 5, 'F')
    col.y = lineY + 15 // and consistent space below
  }

  // A dated entry: date range in the rail (right-aligned), content in the column,
  // both starting at the same baseline.
  const entry = (dateStr: string, render: (r: Cursor) => void) => {
    p.ensure(col, 30)
    const y0 = col.y
    if (dateStr) {
      p.setFont(false, 8.5, SOFT)
      let yy = y0
      for (const ln of doc.splitTextToSize(dateStr, RAIL_W - 4) as string[]) {
        doc.text(ln, railRight, yy, { align: 'right' })
        yy += 10
      }
    }
    render(col)
    col.y = Math.max(col.y, y0 + 12) + 6
  }

  // ---- Personal information (no rule): the name sits on the label's line, the
  // photo hangs in the rail, and the personal-detail line drops to the photo's
  // bottom edge — exactly like the official Europass. ----
  col.y += 16
  p.ensure(col, 132)
  const labelY = col.y + 3
  railLabel('Personal information', labelY)
  // Europass convention: first name + SURNAME in caps.
  const displayName = `${id.firstName} ${id.lastName.toUpperCase()}`.trim()
  p.setFont(false, 14, INK)
  doc.text(displayName || ' ', colX, labelY)
  // Photo in the rail, right edge on the label line.
  const PW = 92
  const PH = 116
  const photoTop = labelY + 10
  if (id.photo) {
    try {
      const fmt = id.photo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(id.photo, fmt, railRight - PW, photoTop, PW, PH)
    } catch {
      // A broken image must never break the CV.
    }
  }
  const photoBottom = id.photo ? photoTop + PH : labelY + 6
  // Contact rows (icons) under the name.
  const iconRow = (draw: (x: number, y: number, c: string) => void, text?: string) => {
    if (!text) return
    draw(colX, col.y - 8, accent)
    p.setFont(false, 9, INK)
    let yy = col.y
    for (const ln of doc.splitTextToSize(text, col.w - 16) as string[]) {
      doc.text(ln, colX + 16, yy)
      yy += 12
    }
    col.y = yy + 1
  }
  col.y = labelY + 20
  const web = [profile.links.website, profile.links.linkedin, profile.links.github, profile.links.portfolio]
    .filter(Boolean)
    .join('   ')
  iconRow(ic.pin, id.location)
  iconRow(ic.phone, id.phone)
  iconRow(ic.mail, id.email)
  iconRow(ic.globe, web)
  // Personal-detail line (Date of birth / Nationality) at the photo's bottom edge.
  const detailY = Math.max(col.y + 2, photoBottom)
  if (id.dateOfBirth || id.nationality) {
    let x = colX
    const seg = (label: string, val: string) => {
      p.setFont(false, 8.5, accent)
      doc.text(label + ' ', x, detailY)
      x += doc.getTextWidth(label + ' ')
      p.setFont(false, 9, INK)
      doc.text(val, x, detailY)
      x += doc.getTextWidth(val) + 12
    }
    if (id.dateOfBirth) seg('Date of birth', id.dateOfBirth)
    if (id.nationality) seg('Nationality', id.nationality)
  }
  col.y = detailY + 6

  // ---- Position ----
  if (variant.headline) {
    section('Position')
    p.text(col, variant.headline, 12, { bold: true, color: INK, gap: 2 })
  }

  // ---- About me ----
  if (variant.summary) {
    section('About me')
    p.text(col, variant.summary, 9.5, { gap: 2 })
  }

  // ---- Work experience ----
  const workById = new Map(profile.work.map((w) => [w.id, w]))
  const works = variant.work.map((v) => ({ v, w: workById.get(v.sourceId) })).filter((e) => e.w)
  if (works.length) {
    section('Work experience')
    for (const { v, w } of works) {
      const s = w!
      entry(euRange(s.startYear, s.startMonth, s.endYear, s.endMonth, s.isCurrent), (r) => {
        p.text(r, s.title, 10, { bold: true, color: accent })
        p.text(r, [s.company, s.location].filter(Boolean).join(', '), 9, { color: SOFT, gap: 1 })
        const bullets = v.bullets.length ? v.bullets : s.highlights
        for (const b of bullets) p.bullet(r, b, 9, accent)
      })
    }
  }

  // ---- Education and training ----
  const eduById = new Map(profile.education.map((e) => [e.id, e]))
  const edus = variant.educationIds.map((i) => eduById.get(i)).filter(Boolean)
  if (edus.length) {
    section('Education and training')
    for (const e of edus) {
      const ed = e!
      entry(euRange(ed.startYear, undefined, ed.endYear, undefined, ed.isCurrent), (r) => {
        p.text(r, [ed.degree, ed.fieldOfStudy].filter(Boolean).join(', '), 10, { bold: true, color: accent })
        p.text(r, ed.school, 9, { color: SOFT, gap: 1 })
        if (ed.description) p.text(r, ed.description, 8.5, { color: SOFT, gap: 1 })
      })
    }
  }

  // ---- Language skills ----
  if (profile.languages.length) {
    const mother = profile.languages.filter((l) => isMotherTongue(l.proficiency))
    const others = profile.languages.filter((l) => !isMotherTongue(l.proficiency))
    if (mother.length) {
      section('Mother tongue(s)')
      p.text(col, mother.map((l) => l.name).join(', '), 9.5, { gap: 2 })
    }
    if (others.length) {
      section('Other language(s)')
      drawCefrGrid(doc, p, col, accent, others.map((l) => ({ name: l.name, level: toCefr(l.proficiency) })))
      p.text(col, 'Levels: A1/A2 Basic user · B1/B2 Independent user · C1/C2 Proficient user', 7, { color: accent, gap: 2 })
    }
  }

  // ---- Digital skills ----
  if (variant.skills.length) {
    section('Digital skills')
    p.text(col, variant.skills.join('   ·   '), 9.5, { gap: 2 })
  }

  // ---- Footer (on every page), like the official Europass ----
  const pages = doc.getNumberOfPages()
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    p.setFont(false, 7.5, SOFT)
    doc.setDrawColor(LINE)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, PAGE_H - 34, PAGE_W - MARGIN, PAGE_H - 34)
    doc.text('© European Union | europass.europa.eu', MARGIN, PAGE_H - 24)
    doc.text(`Page ${pg} / ${pages}`, PAGE_W - MARGIN, PAGE_H - 24, { align: 'right' })
  }

  return toBase64(doc)
}

/** The Europass self-assessment grid, sized to the content column: a two-row
 *  header (Understanding / Speaking / Writing over the five skills) and one row
 *  per language with the CEFR level in each cell. */
function drawCefrGrid(
  doc: jsPDF,
  p: ReturnType<typeof painter>,
  c: Cursor,
  accent: string,
  langs: { name: string; level: string }[],
) {
  // Match the real Europass grid: NO header fill (white throughout), blue header
  // text, thin light-blue borders, a blank top-left cell, right-aligned language
  // names. Only cell borders — no background tint.
  const GRID = '#c6d0e2' // light blue-grey rule, like the official grid
  const LANG_W = 80
  const cellW = (c.w - LANG_W) / 5
  const GH = 13
  const SH = 27
  const DH = 15
  p.ensure(c, GH + SH + langs.length * DH + 6)
  const x0 = c.x
  const xs = [x0 + LANG_W, x0 + LANG_W + cellW, x0 + LANG_W + cellW * 2, x0 + LANG_W + cellW * 3, x0 + LANG_W + cellW * 4]
  const right = x0 + c.w
  const y = c.y

  const cell = (x: number, yy: number, w: number, h: number, txt: string, o: { bold?: boolean; size?: number; color?: string; align?: 'center' | 'right' } = {}) => {
    doc.setDrawColor(GRID)
    doc.setLineWidth(0.5)
    doc.rect(x, yy, w, h)
    if (!txt) return
    const size = o.size ?? 7
    p.setFont(o.bold ?? false, size, o.color ?? INK)
    const lines = doc.splitTextToSize(txt, w - 5) as string[]
    const lh = size * 1.12
    let ty = yy + h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.35
    for (const ln of lines) {
      if (o.align === 'right') doc.text(ln, x + w - 4, ty, { align: 'right' })
      else doc.text(ln, x + w / 2, ty, { align: 'center' })
      ty += lh
    }
  }

  // Header — blue text, unfilled.
  cell(x0, y, LANG_W, GH + SH, '') // blank top-left, spans both header rows
  cell(xs[0], y, cellW * 2, GH, 'Understanding', { size: 7, color: accent })
  cell(xs[2], y, cellW * 2, GH, 'Speaking', { size: 7, color: accent })
  cell(xs[4], y, right - xs[4], GH, 'Writing', { size: 7, color: accent })
  const yy = y + GH
  cell(xs[0], yy, cellW, SH, 'Listening', { size: 6.5, color: accent })
  cell(xs[1], yy, cellW, SH, 'Reading', { size: 6.5, color: accent })
  cell(xs[2], yy, cellW, SH, 'Spoken interaction', { size: 6.5, color: accent })
  cell(xs[3], yy, cellW, SH, 'Spoken production', { size: 6.5, color: accent })
  cell(xs[4], yy, right - xs[4], SH, 'Writing', { size: 6.5, color: accent })
  // Data rows — language name right-aligned, levels centred, black text.
  let ry = y + GH + SH
  for (const l of langs) {
    cell(x0, ry, LANG_W, DH, l.name, { size: 8, align: 'right' })
    cell(xs[0], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[1], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[2], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[3], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[4], ry, right - xs[4], DH, l.level, { size: 8 })
    ry += DH
  }
  c.y = ry + 4
}
