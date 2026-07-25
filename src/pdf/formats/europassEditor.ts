// Europass — the SIX designs the post-2020 europa.eu editor generates
// (Classic, Accent, Elegant, Modern, Timeline, Progress). One renderer, one
// shared set of primitives (logo, circular photo, mixed-style detail flow,
// section rules); each design is a layout function selected by template id.
// Built to match real editor output (data extracted from official exports).

import { jsPDF } from 'jspdf'
import { Profile, TailoredResume, WorkEntry, EducationEntry } from '../../lib/types'
import { ResumeTemplate } from '../templates'
import { Cursor, MARGIN, PAGE_H, PAGE_W, painter } from './shared'
import { EUROPASS_LOGO_NEW } from './europassLogoNew'

const INK = '#2b2b2b'
const META = '#6a6a6a' // dates / secondary
const RULE = '#c2c2c2'
const BAND = '#f2f2f2'
const LINK = '#1a5fb4'

const pad2 = (n: number) => String(n).padStart(2, '0')
/** Editor date: DD/MM/YYYY (day defaults to 01 — we store month precision). */
const fmtMY = (y?: number, m?: number) => (y ? `${pad2(1)}/${m ? pad2(m) : '01'}/${y}` : '')
const fmtY = (y?: number) => (y ? String(y) : '')
function workRange(w: WorkEntry): string {
  const s = fmtMY(w.startYear, w.startMonth)
  const e = w.isCurrent ? 'Current' : fmtMY(w.endYear, w.endMonth)
  return [s, e].filter(Boolean).join(' - ')
}
function eduRange(e: EducationEntry): string {
  const s = fmtY(e.startYear)
  const en = e.isCurrent ? 'Current' : fmtY(e.endYear)
  return [s, en].filter(Boolean).join(' - ')
}

/** Render a circular photo. jsPDF's clip() isn't honoured by many PDF viewers,
 *  so instead we draw the square image then paint a thick `bg`-coloured annulus
 *  over the four corners (the surrounding area is a solid fill), leaving a clean
 *  circle. Robust in every viewer. `bg` MUST match the area behind the photo. */
function circleImage(doc: jsPDF, url: string, cx: number, cy: number, r: number, bg: string) {
  const fmt = url.startsWith('data:image/png') ? 'PNG' : 'JPEG'
  try {
    doc.addImage(url, fmt, cx - r, cy - r, r * 2, r * 2)
  } catch {
    return // a broken image must never break the CV
  }
  // Corner of the square sits at r·√2 ≈ 1.414r from centre; a ring from r→1.5r
  // covers it. Stroke width = 0.5r, centred at 1.25r, nudged in to avoid a seam.
  const rw = r * 0.52
  doc.setDrawColor(bg)
  doc.setLineWidth(rw)
  doc.circle(cx, cy, r + rw / 2 - 0.4, 'S')
}

/** The Europass CEFR self-assessment table (the real Classic language grid):
 *  Understanding (Listening, Reading) · Speaking (Spoken production, Spoken
 *  interaction) · Writing; one row per language, light-gray data rows, thin
 *  column dividers, no outer box. Levels in CefrSkills order remapped to the
 *  official column order (production before interaction). */
function drawLangTable(doc: jsPDF, p: ReturnType<typeof painter>, c: Cursor, langs: { name: string; l: string[] }[]) {
  const DIV = '#d7d7d7'
  const ROW = '#f5f5f5'
  const HTX = '#4a4a4a'
  const nameW = Math.max(90, c.w * 0.2)
  const cw = (c.w - nameW) / 5
  const GH = 15 // group header
  const SH = 17 // sub header
  const DH = 22 // data row
  p.ensure(c, GH + SH + langs.length * DH + 4)
  const x0 = c.x
  const xs = [x0 + nameW, x0 + nameW + cw, x0 + nameW + cw * 2, x0 + nameW + cw * 3, x0 + nameW + cw * 4, x0 + c.w]
  let y = c.y
  const centre = (txt: string, x: number, w: number, yy: number, size: number, bold = false, color = HTX) => {
    p.setFont(bold, size, color)
    for (const ln of doc.splitTextToSize(txt, w - 4) as string[]) {
      doc.text(ln, x + w / 2, yy, { align: 'center' })
    }
  }
  // Group header (Understanding / Speaking / Writing)
  centre('Understanding', xs[0], cw * 2, y + 10, 8.5, true)
  centre('Speaking', xs[2], cw * 2, y + 10, 8.5, true)
  centre('Writing', xs[4], cw, y + 10, 8.5, true)
  y += GH
  // Sub header
  const subs = ['Listening', 'Reading', 'Spoken production', 'Spoken interaction', 'Writing']
  subs.forEach((s, i) => centre(s, xs[i], cw, y + 11, 6.8))
  y += SH
  // Data rows
  langs.forEach((lang) => {
    doc.setFillColor(ROW)
    doc.rect(x0, y, c.w, DH, 'F')
    p.setFont(true, 9.5, INK)
    doc.text(lang.name, x0 + 4, y + DH / 2 + 3)
    lang.l.forEach((lv, i) => centre(lv, xs[i], cw, y + DH / 2 + 3, 9.5, false, INK))
    y += DH
  })
  // Thin vertical dividers at each skill-column boundary (below the group row).
  doc.setDrawColor(DIV)
  doc.setLineWidth(0.5)
  const top = c.y + GH
  for (const bx of [xs[0], xs[1], xs[2], xs[3], xs[4]]) doc.line(bx, top, bx, y)
  c.y = y + 4
}

type Seg = { t: string; bold?: boolean; color?: string; underline?: boolean }
/** Word-wrapped flow of mixed-style segments (labels, values, underlined links),
 *  separated by " | ". `size` sets the type size. Returns the y after the last
 *  line. */
function flowSegments(doc: jsPDF, p: ReturnType<typeof painter>, segs: Seg[], x: number, y: number, maxW: number, lh: number, size = 9, sepColor = META): number {
  let cx = x
  let cy = y
  const space = () => {
    p.setFont(false, size, INK)
    return doc.getTextWidth(' ')
  }
  segs.forEach((seg, i) => {
    if (i > 0) {
      p.setFont(false, size, sepColor)
      const sw = doc.getTextWidth('  |  ')
      if (cx + sw > x + maxW) {
        cx = x
        cy += lh
      }
      doc.text('  |  ', cx, cy)
      cx += sw
    }
    const words = seg.t.split(/(\s+)/).filter((w) => w.length)
    for (const w of words) {
      p.setFont(seg.bold ?? false, size, seg.color ?? INK)
      const ww = doc.getTextWidth(w)
      if (w.trim() && cx + ww > x + maxW) {
        cx = x
        cy += lh
      }
      doc.text(w, cx, cy)
      if (seg.underline && w.trim()) {
        doc.setDrawColor(seg.color ?? INK)
        doc.setLineWidth(0.4)
        doc.line(cx, cy + 1.3, cx + ww, cy + 1.3)
      }
      cx += w.trim() ? ww : space()
    }
  })
  return cy
}

/** Header personal-detail segments. Classic uses bold labels; Modern uses
 *  regular labels with "Mobile phone"/"Home address" wording. Links are blue and
 *  underlined in both. */
function detailSegs(profile: Profile, style: 'classic' | 'modern' = 'classic'): Seg[] {
  const id = profile.identity
  const b = style === 'classic'
  const phoneLabel = b ? 'Phone: ' : 'Mobile phone: '
  const addrLabel = b ? 'Address: ' : 'Home address: '
  const segs: Seg[] = []
  const lbl = (t: string): Seg => ({ t, bold: b })
  if (id.dateOfBirth) segs.push(lbl('Date of birth: '), { t: id.dateOfBirth })
  if (id.sex) segs.push(lbl('Gender: '), { t: id.sex })
  if (id.nationality) segs.push(lbl('Nationality: '), { t: id.nationality })
  if (id.phone) segs.push(lbl(phoneLabel), { t: id.phone })
  if (id.email) segs.push(lbl('Email address: '), { t: id.email, color: LINK, underline: true })
  if (profile.links.website) segs.push(lbl('Website: '), { t: profile.links.website, color: LINK, underline: true })
  if (profile.links.linkedin) segs.push(lbl('LinkedIn: '), { t: profile.links.linkedin, color: LINK, underline: true })
  if (id.location) segs.push(lbl(addrLabel), { t: id.location })
  return segs
}

// Resolve the tailored work/education entries against the profile source rows.
function resolveWork(profile: Profile, variant: TailoredResume) {
  const byId = new Map(profile.work.map((w) => [w.id, w]))
  return variant.work.map((v) => ({ v, w: byId.get(v.sourceId) })).filter((e) => e.w) as { v: TailoredResume['work'][number]; w: WorkEntry }[]
}
function resolveEdu(profile: Profile, variant: TailoredResume) {
  const byId = new Map(profile.education.map((e) => [e.id, e]))
  return variant.educationIds.map((i) => byId.get(i)).filter(Boolean) as EducationEntry[]
}

export function renderEuropassEditor(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  // Only Classic is implemented so far; the others fall back to it until built.
  switch (tpl.id) {
    case 'europass-modern':
      return modern(profile, variant, tpl)
    case 'europass-timeline':
      return timeline(profile, variant, tpl)
    case 'europass-classic':
    default:
      return classic(profile, variant, tpl)
  }
}

// ------------------------------------------------------------------ CLASSIC --
// Single column. Gray photo-header band (circular photo + name + wrapped detail
// flow), sections as a bold label followed by a hairline rule to the right
// margin, entries as a mixed-style meta line + bullets, europass logo in the
// footer.
function classic(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  const accent = tpl.accent ?? '#004494'
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica', MARGIN + 8)
  const id = profile.identity
  const left = MARGIN
  const right = PAGE_W - MARGIN
  const name = `${id.firstName} ${id.lastName}`.trim()

  // ---- Header band ----
  // Taller band → more top/bottom padding (matches the official); the photo +
  // its corner-mask sit fully inside it, so nothing bulges below the band.
  const bandH = 154
  doc.setFillColor(BAND)
  doc.rect(0, 0, PAGE_W, bandH, 'F')
  const r = 47
  const cx = left + r
  const cy = bandH / 2
  if (id.photo) circleImage(doc, id.photo, cx, cy, r, BAND)
  const tx = left + r * 2 + 24
  const tw = right - tx
  p.setFont(true, 19, INK)
  doc.text(name || ' ', tx, cy - 12)
  flowSegments(doc, p, detailSegs(profile), tx, cy + 6, tw, 13)

  const col: Cursor = { x: left, w: right - left, y: bandH + 26 }

  // ---- Section: bold label + hairline rule to the right margin ----
  const section = (label: string) => {
    col.y += 14
    p.ensure(col, 24)
    p.setFont(true, 10, INK)
    doc.text(label, left, col.y, { charSpace: 0.2 })
    const lw = doc.getTextWidth(label) + 0.2 * label.length
    doc.setDrawColor(RULE)
    doc.setLineWidth(0.6)
    doc.line(left + lw + 8, col.y - 3, right, col.y - 3)
    col.y += 16
  }

  // ---- About me ----
  if (variant.summary) {
    section('About me')
    p.text(col, variant.summary, 9.5, { color: INK, gap: 2 })
  }

  // ---- Education & Training ----
  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training')
    for (const e of edus) {
      p.ensure(col, 20)
      flowSegments(
        doc,
        p,
        [{ t: e.degree, bold: true }, { t: e.school }, ...(eduRange(e) ? [{ t: eduRange(e), color: META }] : []), ...(e.description ? [{ t: e.description }] : [])],
        left,
        col.y,
        col.w,
        13,
      )
      col.y += 18
    }
  }

  // ---- Work experience ----
  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience')
    for (const { w } of works) {
      p.ensure(col, 28)
      flowSegments(
        doc,
        p,
        [{ t: w.title, bold: true }, ...(w.company ? [{ t: w.company }] : []), ...(workRange(w) ? [{ t: workRange(w), color: META }] : []), ...(w.location ? [{ t: w.location }] : [])],
        left,
        col.y,
        col.w,
        13,
      )
      col.y += 16
      for (const b of w.highlights) p.bullet(col, b, 9.5, accent)
      col.y += 10
    }
  }

  // ---- Skills ----
  if (variant.skills.length) {
    section('Skills')
    p.text(col, variant.skills.join('   |   '), 9.5, { color: INK, gap: 2 })
  }

  // ---- Language Skills ----
  const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
  const others = profile.languages.filter((l) => l.proficiency !== 'native_bilingual')
  if (profile.languages.length) {
    section('Language Skills')
    if (mother.length) {
      p.setFont(true, 9.5, INK)
      doc.text('Mother tongue(s): ', left, col.y)
      const w0 = doc.getTextWidth('Mother tongue(s): ')
      p.setFont(false, 9.5, INK)
      doc.text(mother.map((l) => l.name).join(', '), left + w0, col.y)
      col.y += 18
    }
    const graded = others.filter((l) => l.cefr)
    if (graded.length) {
      drawLangTable(
        doc,
        p,
        col,
        graded.map((l) => ({ name: l.name, l: [l.cefr!.listening, l.cefr!.reading, l.cefr!.spokenProduction, l.cefr!.spokenInteraction, l.cefr!.writing] })),
      )
      p.setFont(false, 7.5, META)
      col.y += 12 // breathing room between the table and the levels legend
      doc.text('Levels: A1 and A2: Basic user - B1 and B2: Independent user - C1 and C2: Proficient user', left, col.y)
      col.y += 10
    }
  }

  // ---- Footer: europass logo (bottom-right, bigger) + page number ----
  const pages = doc.getNumberOfPages()
  const lw = 86
  const lh = lw * (92 / 360)
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    try {
      doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', right - lw - 52, PAGE_H - 34, lw, lh)
    } catch {
      /* logo optional */
    }
    p.setFont(false, 8, META)
    doc.text(`Page ${pg} / ${pages}`, right, PAGE_H - 24, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}

// Filled dark section glyphs (jsPDF standard fonts lack icon glyphs), matching
// the solid silhouettes the Europass editor uses. Drawn in a ~12pt box at (x,y).
function fillPoly(doc: jsPDF, pts: [number, number][]) {
  const deltas = pts.slice(1).map((pt, i) => [pt[0] - pts[i][0], pt[1] - pts[i][1]]) as [number, number][]
  doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], 'F', true)
}
// Each icon is a light-gray DISC with a dark glyph centred on it (the real
// Europass section markers). Drawn in a ~15pt box: (x,y) is the box's top-left,
// the disc centre is (x+7, y+7). `c` = glyph colour, `bg` = disc colour.
const ICON_R = 6.3 // disc radius (smaller, matches the official markers)
function sectionIcons(doc: jsPDF) {
  const disc = (cx: number, cy: number, bg: string) => {
    doc.setFillColor(bg)
    doc.circle(cx, cy, ICON_R, 'F')
  }
  const glyph = (c: string) => {
    doc.setFillColor(c)
    doc.setDrawColor(c)
  }
  const C = ICON_R // box centre offset
  return {
    star: (x: number, y: number, c: string, bg: string) => {
      const cx = x + C
      const cy = y + C
      disc(cx, cy, bg)
      glyph(c)
      const pts: [number, number][] = []
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 === 0 ? 3.8 : 1.55
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr])
      }
      fillPoly(doc, pts)
    },
    chat: (x: number, y: number, c: string, bg: string) => {
      const cx = x + C
      const cy = y + C
      disc(cx, cy, bg)
      glyph(c)
      doc.roundedRect(cx - 3.5, cy - 2.7, 7, 5, 1.3, 1.3, 'F')
      fillPoly(doc, [
        [cx - 1.2, cy + 1.7],
        [cx - 1.2, cy + 3.7],
        [cx + 1.2, cy + 2],
      ])
    },
    person: (x: number, y: number, c: string, bg: string) => {
      const cx = x + C
      const cy = y + C
      disc(cx, cy, bg)
      glyph(c)
      doc.circle(cx, cy - 1.5, 1.7, 'F')
      doc.ellipse(cx, cy + 2.8, 2.9, 2.2, 'F')
    },
    cap: (x: number, y: number, c: string, bg: string) => {
      const cx = x + C
      const cy = y + C
      disc(cx, cy, bg)
      glyph(c)
      fillPoly(doc, [
        [cx, cy - 2.8],
        [cx + 3.8, cy - 0.7],
        [cx, cy + 1.3],
        [cx - 3.8, cy - 0.7],
      ])
      fillPoly(doc, [
        [cx - 2.4, cy - 0.2],
        [cx + 2.4, cy - 0.2],
        [cx + 1.9, cy + 2.3],
        [cx - 1.9, cy + 2.3],
      ])
      doc.setLineWidth(0.45)
      doc.line(cx + 3.4, cy - 0.5, cx + 3.4, cy + 2.1)
      doc.circle(cx + 3.4, cy + 2.4, 0.5, 'F')
    },
    briefcase: (x: number, y: number, c: string, bg: string) => {
      const cx = x + C
      const cy = y + C
      disc(cx, cy, bg)
      glyph(c)
      doc.roundedRect(cx - 3.6, cy - 1.3, 7.2, 5, 0.8, 0.8, 'F')
      doc.setLineWidth(0.9)
      doc.line(cx - 1.6, cy - 1.3, cx - 1.6, cy - 2.6)
      doc.line(cx - 1.6, cy - 2.6, cx + 1.6, cy - 2.6)
      doc.line(cx + 1.6, cy - 2.6, cx + 1.6, cy - 1.3)
      doc.setDrawColor(bg)
      doc.setLineWidth(0.6)
      doc.line(cx - 3.6, cy + 0.9, cx + 3.6, cy + 0.9)
    },
  }
}

// ------------------------------------------------------------------- MODERN --
// Two columns. LEFT: circular photo, Skills (bulleted), Language Skills (per
// language with CEFR sub-bullets). RIGHT: europass logo, name, detail flow, and
// About me / Education / Work sections — each an icon + bold title (no rule),
// with the date range right-aligned on the entry's first line.
function modern(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  const NAME = '#1a1a1a' // name / entry titles (near-black)
  const TITLE = '#333333' // section headings (dark gray)
  const BODY = '#5f6368' // body + detail text (gray, like the official)
  const ICON = '#4a4a4a' // section glyphs
  const ICONBG = '#eceef1' // light disc behind each glyph
  const DOT = '#8a8d91' // bullet dots
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const RIGHT_TOP = MARGIN + 4
  const p = painter(doc, 'helvetica', RIGHT_TOP)
  const icons = sectionIcons(doc)
  const id = profile.identity
  const name = `${id.firstName} ${id.lastName}`.trim()

  const railW = 132
  const lx = MARGIN
  const rx = MARGIN + railW + 18 // tighter gutter → wider body column
  const right = PAGE_W - MARGIN
  const rw = right - rx

  // ---- LEFT rail (drawn first; short enough to fit page 1) ----
  const rail: Cursor = { x: lx, w: railW, y: MARGIN }
  // Photo left-aligned to the column, no ring/circle behind it.
  const r = 44
  const pcx = lx + r
  const pcy = MARGIN + r
  if (id.photo) circleImage(doc, id.photo, pcx, pcy, r, '#ffffff')
  rail.y = pcy + r + 26

  const railHeading = (label: string, icon: (x: number, y: number, c: string, bg: string) => void) => {
    rail.y += 14 // gap before the heading (separates sections)
    icon(lx, rail.y - 10, ICON, ICONBG)
    p.setFont(true, 11.5, TITLE)
    doc.text(label, lx + 17, rail.y)
    rail.y += 19 // breathing room after the heading
  }
  const railBullet = (txt: string, size: number, bold: boolean, indent = 0) => {
    p.setFont(bold, size, BODY)
    doc.setFillColor(DOT)
    doc.circle(lx + 3 + indent, rail.y - 2.6, 1.1, 'F')
    let yy = rail.y
    for (const ln of doc.splitTextToSize(txt, railW - 12 - indent) as string[]) {
      doc.text(ln, lx + 10 + indent, yy)
      yy += size * 1.32
    }
    rail.y = yy + 3.5 // space between list items
  }

  if (variant.skills.length) {
    railHeading('Skills', icons.star)
    for (const s of variant.skills) railBullet(s, 10, false)
    rail.y += 10
  }
  if (profile.languages.length) {
    railHeading('Language Skills', icons.chat)
    const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
    const others = profile.languages.filter((l) => l.proficiency !== 'native_bilingual')
    for (const m of mother) {
      doc.setFillColor(DOT)
      doc.circle(lx + 3, rail.y - 2.6, 1.1, 'F')
      p.setFont(true, 10, NAME)
      doc.text(m.name, lx + 10, rail.y)
      const w0 = doc.getTextWidth(m.name)
      p.setFont(false, 10, BODY)
      doc.text(': Mother tongue', lx + 10 + w0, rail.y)
      rail.y += 15
    }
    for (const l of others) {
      doc.setFillColor(DOT)
      doc.circle(lx + 3, rail.y - 2.6, 1.1, 'F')
      p.setFont(true, 10, NAME)
      doc.text(l.name, lx + 10, rail.y)
      rail.y += 14
      const c = l.cefr
      if (c) {
        const pairs: [string, string][] = [
          ['Listening', c.listening], ['Reading', c.reading], ['Spoken production', c.spokenProduction], ['Spoken interaction', c.spokenInteraction], ['Writing', c.writing],
        ]
        for (const [k, v] of pairs) railBullet(`${k}: ${v}`, 9.5, false, 10)
      }
      rail.y += 6
    }
  }

  // ---- RIGHT column ----
  const col: Cursor = { x: rx, w: rw, y: RIGHT_TOP }
  // Logo bigger, at the very top-right ABOVE the name.
  const logoW = 104
  const logoH = logoW * (92 / 360)
  try {
    doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', right - logoW, MARGIN - 2, logoW, logoH)
  } catch {
    /* logo optional */
  }
  col.y = MARGIN + logoH + 18
  p.setFont(true, 20, NAME)
  for (const ln of doc.splitTextToSize(name || ' ', rw) as string[]) {
    doc.text(ln, rx, col.y)
    col.y += 23
  }
  col.y += 3
  col.y = flowSegments(doc, p, detailSegs(profile, 'modern'), rx, col.y, rw, 13.5, 9, BODY) + 15

  const section = (label: string, icon: (x: number, y: number, c: string, bg: string) => void) => {
    col.y += 22 // gap BEFORE the heading — separates sections
    p.ensure(col, 28)
    icon(rx, col.y - 10, ICON, ICONBG)
    p.setFont(true, 11.5, TITLE)
    doc.text(label, rx + 17, col.y)
    col.y += 21 // breathing room AFTER the heading
  }
  // Entry with a right-aligned date range on the title line.
  const META2 = '#77797d'
  const titleWithDate = (title: string, date: string) => {
    p.ensure(col, 17)
    if (date) {
      p.setFont(false, 9.5, META2)
      doc.text(date, right, col.y, { align: 'right' })
    }
    p.setFont(true, 12.5, NAME)
    const dateW = date ? doc.getTextWidth(date) + 12 : 0
    for (const ln of doc.splitTextToSize(title, rw - dateW) as string[]) {
      doc.text(ln, rx, col.y)
      col.y += 14.5
    }
  }
  // Gray bullet (the shared painter bullet forces black text).
  const grayBullet = (txt: string) => {
    p.ensure(col, 13)
    doc.setFillColor(DOT)
    doc.circle(rx + 2.6, col.y - 2.6, 1.1, 'F')
    p.setFont(false, 9.5, BODY)
    let yy = col.y
    for (const ln of doc.splitTextToSize(txt, rw - 12) as string[]) {
      doc.text(ln, rx + 10, yy)
      yy += 12.6
    }
    col.y = yy + 4 // space between list items
  }

  if (variant.summary) {
    section('About me', icons.person)
    p.text(col, variant.summary, 9.5, { color: BODY, gap: 2 })
  }

  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training', icons.cap)
    for (const e of edus) {
      titleWithDate(e.degree, eduRange(e))
      p.text(col, [e.school, e.description].filter(Boolean).join('   ·   '), 9.5, { color: META2, gap: 3 })
      col.y += 8
    }
  }

  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience', icons.briefcase)
    for (const { w } of works) {
      titleWithDate(w.title, workRange(w))
      p.text(col, [w.company, w.location].filter(Boolean).join('   ·   '), 9.5, { color: META2, gap: 3 })
      for (const b of w.highlights) grayBullet(b)
      col.y += 11
    }
  }

  // ---- Footer: page number (logo already lives in the header) ----
  const pages = doc.getNumberOfPages()
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    p.setFont(false, 8, DOT)
    doc.text(`Page ${pg} / ${pages}`, right, PAGE_H - 22, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}

// Small outline contact icons for the Timeline sidebar (~11pt box).
function contactIcons(doc: jsPDF) {
  const set = (c: string) => {
    doc.setDrawColor(c)
    doc.setFillColor(c)
    doc.setLineWidth(0.9)
  }
  return {
    pin: (x: number, y: number, c: string) => {
      set(c)
      doc.circle(x + 5, y + 4, 3, 'S')
      doc.line(x + 2.4, y + 5.4, x + 5, y + 10)
      doc.line(x + 7.6, y + 5.4, x + 5, y + 10)
      doc.circle(x + 5, y + 4, 0.9, 'F')
    },
    mail: (x: number, y: number, c: string) => {
      set(c)
      doc.rect(x + 0.5, y + 1.6, 9.5, 7, 'S')
      doc.line(x + 0.5, y + 1.6, x + 5.25, y + 5.4)
      doc.line(x + 10, y + 1.6, x + 5.25, y + 5.4)
    },
    phone: (x: number, y: number, c: string) => {
      set(c)
      doc.roundedRect(x + 2.6, y, 5, 10.5, 1.1, 1.1, 'S')
      doc.line(x + 3.9, y + 8.7, x + 6.7, y + 8.7)
    },
    globe: (x: number, y: number, c: string) => {
      set(c)
      doc.circle(x + 5, y + 5, 4.4, 'S')
      doc.ellipse(x + 5, y + 5, 1.9, 4.4, 'S')
      doc.line(x + 0.6, y + 5, x + 9.4, y + 5)
    },
    linkedin: (x: number, y: number, c: string) => {
      set(c)
      doc.roundedRect(x + 0.5, y + 0.5, 10, 10, 1.6, 1.6, 'S')
      doc.setFillColor(c)
      doc.circle(x + 3, y + 3, 0.9, 'F')
      doc.rect(x + 2.3, y + 4.6, 1.4, 4.2, 'F')
      doc.rect(x + 5, y + 4.6, 1.4, 4.2, 'F')
      doc.line(x + 5.7, y + 6, x + 8.2, y + 6)
      doc.rect(x + 7.4, y + 6, 1.4, 2.8, 'F')
    },
  }
}

// ----------------------------------------------------------------- TIMELINE --
// Gray left sidebar (photo, name, personal details, Contact with icons). Right
// column runs a vertical timeline: a hairline with a dot at each section and
// each entry, blue date ranges, bold titles, org, bullets.
function timeline(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  const accent = tpl.accent ?? '#004494'
  const NAME = '#1a1a1a'
  const BODY = '#333333'
  const HEAD = '#6a6a6a' // gray uppercase section titles
  const DOT = '#5f5f5f'
  const SIDEBG = '#eef0f2'
  const LINEC = '#cdd4dc'
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const id = profile.identity
  const name = `${id.firstName} ${id.lastName}`.trim()

  const railW = 138
  const bgW = MARGIN + railW + 12
  // Sidebar background band, full height.
  doc.setFillColor(SIDEBG)
  doc.rect(0, 0, bgW, PAGE_H, 'F')

  const rx = bgW + 24
  const right = PAGE_W - MARGIN
  const tlx = rx // timeline line x
  const cx0 = rx + 20 // content x (right of the dots)
  const cw = right - cx0
  const RIGHT_TOP = MARGIN + 6
  const p = painter(doc, 'helvetica', RIGHT_TOP)
  const ci = contactIcons(doc)

  // ---- europass logo, top-right of the content column ----
  const logoW = 100
  const logoH = logoW * (92 / 360)
  try {
    doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', right - logoW, MARGIN - 2, logoW, logoH)
  } catch {
    /* logo optional */
  }

  // ---- LEFT sidebar ----
  const lx = MARGIN
  const r = 40
  const pcx = bgW / 2
  const pcy = MARGIN + r
  if (id.photo) circleImage(doc, id.photo, pcx, pcy, r, SIDEBG)
  doc.setDrawColor('#ffffff')
  doc.setLineWidth(1)
  doc.circle(pcx, pcy, r, 'S')
  let sy = pcy + r + 22
  // Name centred
  p.setFont(true, 15, NAME)
  for (const ln of doc.splitTextToSize(name || ' ', railW) as string[]) {
    doc.text(ln, pcx, sy, { align: 'center' })
    sy += 19
  }
  sy += 10
  const sideDetail = (label: string, val: string) => {
    if (!val) return
    p.setFont(true, 9.5, NAME)
    doc.text(label, lx, sy)
    const w0 = doc.getTextWidth(label)
    p.setFont(false, 9.5, BODY)
    for (const ln of doc.splitTextToSize(val, railW - w0) as string[]) {
      doc.text(ln, lx + w0, sy)
      sy += 13
    }
    sy += 3
  }
  sideDetail('Date of birth: ', id.dateOfBirth || '')
  sideDetail('Nationality: ', id.nationality || '')
  sideDetail('Gender: ', id.sex || '')
  sy += 8
  p.setFont(true, 13, NAME)
  doc.text('Contact', lx, sy)
  sy += 16
  const contactRow = (icon: (x: number, y: number, c: string) => void, text: string, link = false) => {
    if (!text) return
    icon(lx, sy - 8, accent)
    p.setFont(false, 9.5, link ? LINK : BODY)
    let yy = sy
    for (const ln of doc.splitTextToSize(text, railW - 16) as string[]) {
      doc.text(ln, lx + 16, yy)
      if (link) {
        doc.setDrawColor(LINK)
        doc.setLineWidth(0.4)
        doc.line(lx + 16, yy + 1.3, lx + 16 + doc.getTextWidth(ln), yy + 1.3)
      }
      yy += 13
    }
    sy = yy + 5
  }
  contactRow(ci.pin, id.location || '')
  contactRow(ci.mail, id.email || '', true)
  contactRow(ci.phone, id.phone || '')
  if (profile.links.website) contactRow(ci.globe, profile.links.website, true)
  if (profile.links.linkedin) contactRow(ci.linkedin, profile.links.linkedin, true)

  // ---- RIGHT timeline column (starts below the logo on page 1) ----
  const col: Cursor = { x: cx0, w: cw, y: MARGIN + logoH + 16 }
  // Draw the connecting hairline segment-by-segment (skips across page breaks),
  // then the dot on top.
  let prevDotY = -1
  const dot = (yy: number, color: string, rr = 3) => {
    if (prevDotY >= 0 && yy > prevDotY) {
      doc.setDrawColor(LINEC)
      doc.setLineWidth(1)
      doc.line(tlx, prevDotY, tlx, yy)
    }
    doc.setFillColor(color)
    doc.circle(tlx, yy, rr, 'F')
    prevDotY = yy
  }
  const section = (label: string) => {
    col.y += 16
    p.ensure(col, 24)
    dot(col.y - 3.5, HEAD, 3.4)
    p.setFont(true, 12, HEAD)
    doc.text(label.toUpperCase(), cx0, col.y, { charSpace: 0.4 })
    col.y += 17
  }
  const entry = (title: string, date: string, meta: string, bullets: string[], desc?: string) => {
    p.ensure(col, 26)
    dot(col.y - 3.5, accent, 2.6)
    if (date) {
      p.setFont(false, 9.5, accent)
      doc.text(date, cx0, col.y)
      col.y += 13
    }
    p.setFont(true, 12, NAME)
    for (const ln of doc.splitTextToSize(title, cw) as string[]) {
      doc.text(ln, cx0, col.y)
      col.y += 14
    }
    if (meta) p.text(col, meta, 9.5, { color: DOT, gap: 2 })
    if (desc) p.text(col, desc, 10, { color: BODY, gap: 2 })
    for (const b of bullets) p.bullet(col, b, 10, DOT)
    col.y += 10
  }

  if (variant.summary) {
    section('About me')
    p.text(col, variant.summary, 10, { color: BODY, gap: 2 })
  }
  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training')
    for (const e of edus) entry(e.degree, eduRange(e), [e.school, e.description].filter(Boolean).join('   ·   '), [])
  }
  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience')
    for (const { w } of works) entry(w.title, workRange(w), [w.company, w.location].filter(Boolean).join('   ·   '), w.highlights)
  }

  const pages = doc.getNumberOfPages()
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    p.setFont(false, 8, DOT)
    doc.text(`Page ${pg} / ${pages}`, right, PAGE_H - 22, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}
