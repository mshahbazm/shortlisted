// Europass — the EU's official standardized CV. Fixed structure (the standard
// dictates it), so this renderer largely ignores visual tokens and follows the
// canonical section order:
//   Personal information → About me → Work experience → Education and training
//   → Language skills (with the CEFR self-assessment grid) → Digital skills
// Ref: europass.europa.eu. Photo/date-of-birth/nationality are optional.

import { jsPDF } from 'jspdf'
import { Profile, TailoredResume, workPeriodLabel } from '../../lib/types'
import { ResumeTemplate } from '../templates'
import { Cursor, INK, LINE, MARGIN, PAGE_W, SOFT, isMotherTongue, painter, toBase64, toCefr } from './shared'

const ACCENT = '#003399' // EU blue

export function renderEuropass(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  const accent = tpl.accent ?? ACCENT
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica')
  const CONTENT_W = PAGE_W - MARGIN * 2
  const id = profile.identity
  const c: Cursor = { x: MARGIN, w: CONTENT_W, y: MARGIN }

  // ---- Photo (optional, top-right) ----
  let photoBottom = MARGIN
  const PW = 74
  const PH = 95
  if (id.photo) {
    try {
      const fmt = id.photo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(id.photo, fmt, PAGE_W - MARGIN - PW, MARGIN, PW, PH)
      photoBottom = MARGIN + PH
    } catch {
      // A broken image must never break the CV — just skip it.
    }
  }

  // ---- Name + headline (narrowed if a photo sits to the right) ----
  const name = `${id.firstName} ${id.lastName}`.trim()
  const head: Cursor = { x: MARGIN, w: id.photo ? CONTENT_W - PW - 16 : CONTENT_W, y: MARGIN + 8 }
  p.text(head, name || ' ', 20, { bold: true, color: accent, gap: 2 })
  if (variant.headline) p.text(head, variant.headline, 11.5, { color: SOFT, gap: 2 })
  c.y = Math.max(head.y, photoBottom) + 8

  // ---- Personal information (labelled two-column rows) ----
  const infoRow = (label: string, value?: string) => {
    if (!value) return
    p.ensure(c, 14)
    p.setFont(false, 8.5, SOFT)
    doc.text(label, c.x, c.y)
    p.setFont(false, 9.5, INK)
    const lines = doc.splitTextToSize(value, c.w - 96) as string[]
    doc.text(lines[0] ?? '', c.x + 96, c.y)
    c.y += 14
  }
  const web = [profile.links.website, profile.links.linkedin, profile.links.github, profile.links.portfolio]
    .filter(Boolean)
    .join('   ')
  infoRow('Address', id.location)
  infoRow('Phone', id.phone)
  infoRow('Email', id.email)
  infoRow('Website', web)
  infoRow('Date of birth', id.dateOfBirth)
  infoRow('Nationality', id.nationality)

  // ---- Section heading (accent caps + full-width rule) ----
  const heading = (title: string) => {
    c.y += 12
    p.ensure(c, 24)
    p.setFont(true, 10.5, accent)
    doc.text(title.toUpperCase(), c.x, c.y, { charSpace: 0.4 })
    c.y += 5
    doc.setDrawColor(accent)
    doc.setLineWidth(1)
    doc.line(c.x, c.y, c.x + c.w, c.y)
    c.y += 12
  }

  // ---- About me ----
  if (variant.summary) {
    heading('About me')
    p.text(c, variant.summary, 9.5, { gap: 2 })
  }

  // ---- Work experience ----
  const workById = new Map(profile.work.map((w) => [w.id, w]))
  const workEntries = variant.work.map((v) => ({ v, w: workById.get(v.sourceId) })).filter((e) => e.w)
  if (workEntries.length) {
    heading('Work experience')
    for (const { v, w } of workEntries) {
      const src = w!
      p.ensure(c, 30)
      p.text(c, workPeriodLabel(src), 9, { color: SOFT })
      p.text(c, src.title, 10.5, { bold: true })
      p.text(c, [src.company, src.location].filter(Boolean).join(' — '), 9.5, { color: SOFT, gap: 2 })
      const bullets = v.bullets.length ? v.bullets : src.highlights
      for (const b of bullets) p.bullet(c, b, 9.5, accent)
      c.y += 4
    }
  }

  // ---- Education and training ----
  const eduById = new Map(profile.education.map((e) => [e.id, e]))
  const edus = variant.educationIds.map((eid) => eduById.get(eid)).filter(Boolean)
  if (edus.length) {
    heading('Education and training')
    for (const e of edus) {
      const ed = e!
      p.ensure(c, 26)
      const dates = [ed.startYear, ed.isCurrent ? 'Present' : ed.endYear].filter(Boolean).join(' — ')
      if (dates) p.text(c, dates, 9, { color: SOFT })
      p.text(c, [ed.degree, ed.fieldOfStudy].filter(Boolean).join(', '), 10.5, { bold: true })
      p.text(c, ed.school, 9.5, { color: SOFT, gap: 2 })
      if (ed.description) p.text(c, ed.description, 9, { color: SOFT, gap: 2 })
    }
  }

  // ---- Language skills (mother tongue line + CEFR self-assessment grid) ----
  if (profile.languages.length) {
    heading('Language skills')
    const mother = profile.languages.filter((l) => isMotherTongue(l.proficiency))
    const others = profile.languages.filter((l) => !isMotherTongue(l.proficiency))
    if (mother.length) {
      infoRow('Mother tongue(s)', mother.map((l) => l.name).join(', '))
      c.y += 4
    }
    if (others.length) drawCefrGrid(doc, p, c, others.map((l) => ({ name: l.name, level: toCefr(l.proficiency) })))
  }

  // ---- Skills ----
  if (variant.skills.length) {
    heading('Skills')
    p.text(c, variant.skills.join('   ·   '), 9.5, { gap: 2 })
  }

  return toBase64(doc)
}

/** The Europass self-assessment grid: a two-row header (Understanding / Speaking
 *  / Writing grouping over Listening, Reading, Spoken interaction, Spoken
 *  production, Writing) and one row per language, each cell holding the CEFR level. */
function drawCefrGrid(
  doc: jsPDF,
  p: ReturnType<typeof painter>,
  c: Cursor,
  langs: { name: string; level: string }[],
) {
  const LANG_W = 116
  const cellW = (c.w - LANG_W) / 5
  const GH = 13 // group header height
  const SH = 24 // skill header height (labels wrap)
  const DH = 15 // data row height

  p.ensure(c, GH + SH + langs.length * DH + 6)
  const x0 = c.x
  const xs = [x0 + LANG_W, x0 + LANG_W + cellW, x0 + LANG_W + cellW * 2, x0 + LANG_W + cellW * 3, x0 + LANG_W + cellW * 4]
  const right = x0 + c.w
  let y = c.y

  const cell = (x: number, yy: number, w: number, h: number, txt: string, o: { bold?: boolean; size?: number; fill?: string } = {}) => {
    if (o.fill) {
      doc.setFillColor(o.fill)
      doc.rect(x, yy, w, h, 'F')
    }
    doc.setDrawColor(LINE)
    doc.setLineWidth(0.5)
    doc.rect(x, yy, w, h)
    if (!txt) return
    const size = o.size ?? 7.5
    p.setFont(o.bold ?? false, size, INK)
    const lines = doc.splitTextToSize(txt, w - 4) as string[]
    const lh = size * 1.12
    let ty = yy + h / 2 - ((lines.length - 1) * lh) / 2 + size * 0.35
    for (const ln of lines) {
      doc.text(ln, x + w / 2, ty, { align: 'center' })
      ty += lh
    }
  }

  const soft = '#eef2fb'
  // Group header row: language cell spans both header rows.
  cell(x0, y, LANG_W, GH + SH, 'Language', { bold: true, size: 8, fill: soft })
  cell(xs[0], y, cellW * 2, GH, 'Understanding', { bold: true, size: 7.5, fill: soft })
  cell(xs[2], y, cellW * 2, GH, 'Speaking', { bold: true, size: 7.5, fill: soft })
  cell(xs[4], y, right - xs[4], GH, 'Writing', { bold: true, size: 7.5, fill: soft })
  // Skill header row.
  const yy = y + GH
  cell(xs[0], yy, cellW, SH, 'Listening', { size: 7, fill: soft })
  cell(xs[1], yy, cellW, SH, 'Reading', { size: 7, fill: soft })
  cell(xs[2], yy, cellW, SH, 'Spoken interaction', { size: 7, fill: soft })
  cell(xs[3], yy, cellW, SH, 'Spoken production', { size: 7, fill: soft })
  cell(xs[4], yy, right - xs[4], SH, 'Writing', { size: 7, fill: soft })
  // Data rows: the mapped CEFR level fills every skill column.
  let ry = y + GH + SH
  for (const l of langs) {
    cell(x0, ry, LANG_W, DH, l.name, { bold: true, size: 8 })
    cell(xs[0], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[1], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[2], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[3], ry, cellW, DH, l.level, { size: 8 })
    cell(xs[4], ry, right - xs[4], DH, l.level, { size: 8 })
    ry += DH
  }
  c.y = ry + 4
}
