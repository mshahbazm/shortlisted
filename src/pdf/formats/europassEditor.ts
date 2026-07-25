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
import { addDmSans } from '../fonts/dmSans'

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
    case 'europass-progress':
      return progress(profile, variant, tpl)
    case 'europass-accent':
      return accent(profile, variant, tpl)
    case 'europass-classic':
    default:
      return classic(profile, variant, tpl)
  }
}

// A mixed-SIZE inline flow: groups separated by " | " (at sepSize/sepColor);
// pieces within a group render contiguously. Word-wraps to maxW. Returns the y
// of the last baseline. Used to match the official Classic's per-run type.
type Piece = { t: string; size?: number; bold?: boolean; color?: string; underline?: boolean }
function inlineGroups(
  doc: jsPDF,
  p: ReturnType<typeof painter>,
  groups: Piece[][],
  x: number,
  y: number,
  maxW: number,
  lh: number,
  sepSize: number,
  sepColor: string,
  defColor = '#000000',
): number {
  let cx = x
  let cy = y
  const put = (t: string, size: number, bold: boolean, color: string, underline?: boolean) => {
    for (const tok of t.split(/(\s+)/).filter((s) => s.length)) {
      p.setFont(bold, size, color)
      const w = doc.getTextWidth(tok)
      if (tok.trim() && cx + w > x + maxW) {
        cx = x
        cy += lh
      }
      if (tok.trim()) {
        doc.text(tok, cx, cy)
        if (underline) {
          doc.setDrawColor(color)
          doc.setLineWidth(0.5)
          doc.line(cx, cy + 1.6, cx + w, cy + 1.6)
        }
      }
      cx += w
    }
  }
  groups.forEach((g, i) => {
    if (i > 0) {
      p.setFont(false, sepSize, sepColor)
      const sw = doc.getTextWidth(' | ')
      if (cx + sw > x + maxW) {
        cx = x
        cy += lh
      }
      doc.text(' | ', cx, cy)
      cx += sw
    }
    for (const pc of g) put(pc.t, pc.size ?? 10, pc.bold ?? false, pc.color ?? defColor, pc.underline)
  })
  return cy
}

/** Header personal-detail groups for Classic (labels regular black, links blue
 *  underlined), matching the official SVG. */
function detailGroups(profile: Profile, link: string): Piece[][] {
  const id = profile.identity
  const g: Piece[][] = []
  if (id.dateOfBirth) g.push([{ t: `Date of birth: ${id.dateOfBirth}` }])
  if (id.sex) g.push([{ t: `Gender: ${id.sex}` }])
  if (id.nationality) g.push([{ t: `Nationality: ${id.nationality}` }])
  if (id.phone) g.push([{ t: `Phone: ${id.phone}` }])
  if (id.email) g.push([{ t: 'Email address: ' }, { t: id.email, color: link, underline: true }])
  if (profile.links.website) g.push([{ t: 'Website: ' }, { t: profile.links.website, color: link, underline: true }])
  if (profile.links.linkedin) g.push([{ t: 'LinkedIn: ' }, { t: profile.links.linkedin, color: link, underline: true }])
  if (id.location) g.push([{ t: `Address: ${id.location}` }])
  return g
}

/** The official Classic CEFR table: name + five 86pt columns, un-filled header
 *  (Understanding/Speaking/Writing over the five skills), #F5F5F5 data rows,
 *  three thin 0.2pt group dividers. */
function classicLangTable(doc: jsPDF, p: ReturnType<typeof painter>, c: Cursor, langs: { name: string; l: string[] }[], L: number, R: number) {
  const GRAY = '#5A5959'
  const cellW = (R - L) / 6
  const xs = [0, 1, 2, 3, 4, 5, 6].map((k) => L + k * cellW)
  const GH = 25
  const SH = 19
  const RH = 30
  p.ensure(c, GH + SH + langs.length * RH + 6)
  const top = c.y
  const ctr = (t: string, x0: number, x1: number, yy: number, size: number, bold: boolean, color: string) => {
    p.setFont(bold, size, color)
    doc.text(t, (x0 + x1) / 2, yy, { align: 'center' })
  }
  ctr('Understanding', xs[1], xs[3], top + 11, 10, true, GRAY)
  ctr('Speaking', xs[3], xs[5], top + 11, 10, true, GRAY)
  ctr('Writing', xs[5], xs[6], top + 11, 10, true, GRAY)
  ;[
    ['Listening', xs[1], xs[2]],
    ['Reading', xs[2], xs[3]],
    ['Spoken production', xs[3], xs[4]],
    ['Spoken interaction', xs[4], xs[5]],
  ].forEach(([s, a, b]) => ctr(s as string, a as number, b as number, top + GH + 12, 8, false, GRAY))
  let ry = top + GH + SH
  for (const lang of langs) {
    doc.setFillColor('#F5F5F5')
    doc.rect(L, ry, R - L, 24, 'F')
    p.setFont(true, 10, '#000000')
    doc.text(lang.name, L, ry + 15.5)
    for (let i = 0; i < 5; i++) ctr(lang.l[i] ?? '', xs[i + 1], xs[i + 2] ?? R, ry + 15.5, 10, false, '#000000')
    ry += RH
  }
  doc.setDrawColor('#000000')
  doc.setLineWidth(0.2)
  for (const bx of [xs[1], xs[3], xs[5]]) doc.line(bx, top, bx, ry - (RH - 24))
  c.y = ry
}

// ------------------------------------------------------------------ CLASSIC --
// Pixel-matched to the official europa.eu editor's "Classic" SVG export: 39pt
// margins, a 148pt #F5F5F5 header band (circular photo + 18pt gray name +
// wrapped detail flow), 8pt bold section labels over a hairline rule, entry
// lines as mixed-size inline runs, tight bullets, and the CEFR table. Arial ≈
// Helvetica so the type matches too.
function classic(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  void tpl
  const BLACK = '#000000'
  const GRAY = '#4F4F4F' // name, entry titles, separators
  const SOFT2 = '#5A5959' // body, bullets, sub-labels
  const LINKC = '#004494'
  const BANDC = '#F5F5F5'
  const LH = 13
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica', 46)
  const id = profile.identity
  const L = 39
  const R = PAGE_W - 39
  const name = `${id.firstName} ${id.lastName}`.trim()

  // ---- Header band (148pt), photo centred at (89,83) with a thin black ring ----
  doc.setFillColor(BANDC)
  doc.rect(0, 0, PAGE_W, 148, 'F')
  if (id.photo) circleImage(doc, id.photo, 89, 83, 50, BANDC)
  // erase any mask overspill below the band, then draw the ring
  doc.setFillColor('#ffffff')
  doc.rect(0, 148, PAGE_W, PAGE_H - 148, 'F')
  doc.setDrawColor(BLACK)
  doc.setLineWidth(1)
  doc.circle(89, 83, 51, 'S')
  p.setFont(true, 18, GRAY)
  doc.text(name || ' ', 157, 56.4)
  inlineGroups(doc, p, detailGroups(profile, LINKC), 157, 74.4, R - 157, LH, 10, GRAY, BLACK)

  const col: Cursor = { x: L, w: R - L, y: 148 }

  const para = (t: string, size: number, color: string, x = L, w = R - L) => {
    p.setFont(false, size, color)
    const lines = doc.splitTextToSize(t, w) as string[]
    lines.forEach((ln, i) => {
      if (i > 0) col.y += LH
      doc.text(ln, x, col.y)
    })
  }
  const bullet = (b: string) => {
    p.setFont(false, 10, SOFT2)
    const lines = doc.splitTextToSize(b, R - 64) as string[]
    lines.forEach((ln, j) => {
      if (j > 0) col.y += LH
      if (j === 0) doc.text('•  ' + ln, 54, col.y)
      else doc.text(ln, 64, col.y)
    })
  }
  const section = (label: string) => {
    col.y += 24
    p.ensure(col, 22)
    p.setFont(true, 8, BLACK)
    doc.text(label, L, col.y)
    const lw = doc.getTextWidth(label)
    doc.setDrawColor(BLACK)
    doc.setLineWidth(0.5)
    doc.line(L + lw + 4, col.y - 1, R, col.y - 1)
    col.y += 18
  }

  if (variant.summary) {
    section('About me')
    para(variant.summary, 10, SOFT2)
  }

  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training')
    edus.forEach((e, i) => {
      if (i > 0) col.y += LH + 5
      col.y = inlineGroups(
        doc,
        p,
        [[{ t: e.degree, bold: true, color: GRAY }], [{ t: e.school, color: GRAY }], ...(eduRange(e) ? [[{ t: eduRange(e), color: GRAY }]] : []), ...(e.description ? [[{ t: e.description, color: GRAY }]] : [])],
        L,
        col.y,
        R - L,
        LH,
        12,
        GRAY,
        GRAY,
      )
    })
  }

  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience')
    works.forEach(({ w }, i) => {
      if (i > 0) col.y += LH + 6
      col.y = inlineGroups(
        doc,
        p,
        [[{ t: w.title, bold: true, color: GRAY }], [{ t: w.company, color: GRAY }], ...(workRange(w) ? [[{ t: workRange(w), size: 8, color: SOFT2 }]] : []), ...(w.location ? [[{ t: w.location, size: 8, color: SOFT2 }]] : [])],
        L,
        col.y,
        R - L,
        LH,
        12,
        GRAY,
        GRAY,
      )
      for (const b of w.highlights) {
        col.y += LH
        bullet(b)
      }
    })
  }

  if (variant.skills.length) {
    section('Skills')
    col.y = inlineGroups(doc, p, variant.skills.map((s) => [{ t: s, color: GRAY }]), L, col.y, R - L, LH, 12, GRAY, GRAY)
  }

  const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
  const graded = profile.languages.filter((l) => l.cefr && l.proficiency !== 'native_bilingual')
  if (profile.languages.length) {
    section('Language Skills')
    if (mother.length) {
      p.setFont(false, 10, GRAY)
      doc.text('Mother tongue(s): ', L, col.y)
      const w0 = doc.getTextWidth('Mother tongue(s): ')
      p.setFont(true, 10, GRAY)
      doc.text(mother.map((l) => l.name).join(', '), L + w0, col.y)
    }
    if (graded.length) {
      col.y += 22
      classicLangTable(doc, p, col, graded.map((l) => ({ name: l.name, l: [l.cefr!.listening, l.cefr!.reading, l.cefr!.spokenProduction, l.cefr!.spokenInteraction, l.cefr!.writing] })), L, R)
    }
  }

  // ---- Footer: page number + europass brand mark, on every page ----
  const pages = doc.getNumberOfPages()
  const lgW = 61
  const lgH = lgW * (92 / 360)
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    try {
      doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', R - 46 - lgW, PAGE_H - 42, lgW, lgH)
    } catch {
      /* logo optional */
    }
    p.setFont(false, 10, SOFT2)
    doc.text(`Page ${pg}/${pages}`, R, PAGE_H - 31, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}

// Filled dark section glyphs (jsPDF standard fonts lack icon glyphs), matching
// the solid silhouettes the Europass editor uses. Drawn in a ~12pt box at (x,y).
// The exact glyph paths lifted from the official editor SVG (each drawn in a
// 14×14 box). Rendered via jsPDF's canvas context so the section markers are
// pixel-identical, not approximations.
const ICON_STAR = [
  'M9.15633 10.5002C9.10371 10.5004 9.05236 10.484 9.00961 10.4534L7.00008 8.99649L4.99054 10.4534C4.94761 10.4845 4.89589 10.5012 4.84285 10.501C4.78982 10.5008 4.73822 10.4837 4.69551 10.4523C4.65281 10.4208 4.62121 10.3766 4.60529 10.326C4.58937 10.2754 4.58995 10.2211 4.60695 10.1709L5.3907 7.84946L3.35945 6.45649C3.31545 6.42635 3.28224 6.38293 3.26468 6.33258C3.24712 6.28222 3.24611 6.22757 3.26182 6.1766C3.27753 6.12564 3.30913 6.08103 3.35199 6.0493C3.39486 6.01757 3.44674 6.00038 3.50008 6.00024H6.00601L6.76226 3.67289C6.77855 3.62265 6.81034 3.57885 6.85307 3.54779C6.89579 3.51673 6.94725 3.5 7.00008 3.5C7.0529 3.5 7.10436 3.51673 7.14709 3.54779C7.18981 3.57885 7.2216 3.62265 7.23789 3.67289L7.99414 6.00102H10.5001C10.5535 6.00099 10.6055 6.01807 10.6485 6.04973C10.6915 6.0814 10.7232 6.12601 10.739 6.17701C10.7548 6.22801 10.7539 6.28274 10.7363 6.33317C10.7188 6.3836 10.6855 6.42709 10.6415 6.45727L8.60945 7.84946L9.39273 10.1702C9.40542 10.2078 9.40899 10.2479 9.40315 10.2871C9.3973 10.3263 9.38221 10.3636 9.35911 10.3958C9.33601 10.4281 9.30558 10.4544 9.27032 10.4725C9.23506 10.4907 9.19599 10.5002 9.15633 10.5002Z',
]
const ICON_LANG = [
  'M10.4739 9.77507L9.06765 6.36882C9.04168 6.30591 8.99762 6.25213 8.94106 6.21429C8.88449 6.17645 8.81797 6.15625 8.74991 6.15625C8.68186 6.15625 8.61534 6.17645 8.55877 6.21429C8.50221 6.25213 8.45815 6.30591 8.43218 6.36882L7.02593 9.77507C7.00844 9.81684 6.99938 9.86165 6.99927 9.90694C6.99915 9.95222 7.00799 9.99708 7.02526 10.0389C7.04254 10.0808 7.06792 10.1188 7.09994 10.1509C7.13196 10.1829 7.16999 10.2083 7.21184 10.2255C7.2537 10.2428 7.29856 10.2517 7.34385 10.2516C7.38913 10.2514 7.43395 10.2424 7.47572 10.2249C7.51749 10.2074 7.5554 10.1819 7.58727 10.1497C7.61913 10.1175 7.64432 10.0794 7.6614 10.0374L7.9478 9.34382H9.55202L9.83843 10.0374C9.86439 10.1003 9.90846 10.1542 9.96504 10.192C10.0216 10.2299 10.0882 10.2501 10.1562 10.2501C10.2127 10.25 10.2683 10.2361 10.3181 10.2094C10.368 10.1828 10.4104 10.1443 10.4418 10.0973C10.4732 10.0504 10.4925 9.99641 10.4981 9.9402C10.5037 9.88399 10.4953 9.82727 10.4737 9.77507H10.4739ZM8.23171 8.65632L8.74999 7.40085L9.26827 8.65632H8.23171Z',
  'M7.185 8.35813C7.2384 8.28436 7.26035 8.19241 7.24603 8.10248C7.2317 8.01254 7.18227 7.93196 7.10859 7.87844C7.10547 7.87609 6.87422 7.70453 6.53844 7.33578C7.15797 6.49703 7.50891 5.54281 7.65203 5.09375H8.15625C8.24742 5.09375 8.33485 5.05753 8.39932 4.99307C8.46378 4.9286 8.5 4.84117 8.5 4.75C8.5 4.65883 8.46378 4.5714 8.39932 4.50693C8.33485 4.44247 8.24742 4.40625 8.15625 4.40625H6.34375V4.09375C6.34375 4.00258 6.30753 3.91515 6.24307 3.85068C6.1786 3.78622 6.09117 3.75 6 3.75C5.90883 3.75 5.8214 3.78622 5.75693 3.85068C5.69247 3.91515 5.65625 4.00258 5.65625 4.09375V4.40625H3.84375C3.75258 4.40625 3.66515 4.44247 3.60068 4.50693C3.53622 4.5714 3.5 4.65883 3.5 4.75C3.5 4.84117 3.53622 4.9286 3.60068 4.99307C3.66515 5.05753 3.75258 5.09375 3.84375 5.09375H6.92578C6.77703 5.51484 6.50313 6.17969 6.08531 6.78688C5.59453 6.13562 5.41219 5.71422 5.41078 5.71078C5.37485 5.62775 5.30764 5.56223 5.22371 5.52843C5.13979 5.49463 5.04593 5.49528 4.96248 5.53024C4.87903 5.5652 4.81273 5.63165 4.77796 5.71517C4.74318 5.79869 4.74274 5.89256 4.77672 5.97641C4.78578 5.99797 5.00406 6.51125 5.60266 7.28781C5.61703 7.30641 5.63125 7.32453 5.64547 7.34266C5.03234 8.03562 4.43078 8.46547 4.17906 8.60422C4.09902 8.64788 4.0396 8.72154 4.01387 8.80901C3.98815 8.89648 3.99822 8.99058 4.04188 9.07062C4.08553 9.15067 4.1592 9.21009 4.24667 9.23581C4.33413 9.26154 4.42824 9.25147 4.50828 9.20781C4.54203 9.18937 5.26766 8.78766 6.09625 7.87047C6.44813 8.24672 6.69 8.42422 6.70453 8.43453C6.74109 8.46109 6.78253 8.48018 6.82648 8.4907C6.87042 8.50123 6.91601 8.50298 6.96064 8.49587C7.00527 8.48876 7.04805 8.47292 7.08655 8.44926C7.12505 8.4256 7.1585 8.39457 7.185 8.35797V8.35813Z',
]
const ICON_PERSON = [
  'M8.49689 3.26133C8.11682 2.85098 7.58596 2.625 7.00002 2.625C6.41096 2.625 5.87834 2.84961 5.50002 3.25742C5.1176 3.66973 4.93127 4.23008 4.97502 4.83516C5.06174 6.02891 5.97014 7 7.00002 7C8.0299 7 8.93674 6.0291 9.02482 4.83555C9.06916 4.23594 8.88166 3.67676 8.49689 3.26133Z',
  'M10.4376 11.375H3.56261C3.47262 11.3762 3.38351 11.3573 3.30175 11.3197C3.21998 11.2821 3.14763 11.2267 3.08996 11.1576C2.963 11.0059 2.91183 10.7986 2.94972 10.5891C3.11456 9.67461 3.62902 8.90645 4.43761 8.36719C5.15597 7.88848 6.06593 7.625 7.00011 7.625C7.93429 7.625 8.84425 7.88867 9.56261 8.36719C10.3712 8.90625 10.8857 9.67441 11.0505 10.5889C11.0884 10.7984 11.0372 11.0057 10.9103 11.1574C10.8526 11.2265 10.7803 11.2819 10.6985 11.3196C10.6167 11.3572 10.5276 11.3761 10.4376 11.375Z',
]
const ICON_CAP = [
  'M7 8.7502C6.95648 8.7502 6.91372 8.73884 6.87594 8.71724L4.6875 7.46645C4.66848 7.45548 4.64691 7.4497 4.62495 7.44971C4.603 7.44972 4.58143 7.45551 4.56242 7.4665C4.54341 7.47749 4.52764 7.4933 4.51668 7.51233C4.50572 7.53136 4.49997 7.55293 4.5 7.57489V8.7502C4.49996 8.79482 4.51187 8.83864 4.53448 8.87711C4.55709 8.91557 4.58959 8.94729 4.62859 8.96895L6.87859 10.219C6.91573 10.2396 6.95752 10.2504 7 10.2504C7.04248 10.2504 7.08427 10.2396 7.12141 10.219L9.37141 8.96895C9.41041 8.94729 9.44291 8.91557 9.46552 8.87711C9.48813 8.83864 9.50004 8.79482 9.5 8.7502V7.57489C9.50003 7.55293 9.49428 7.53136 9.48332 7.51233C9.47236 7.4933 9.45659 7.47749 9.43758 7.4665C9.41857 7.45551 9.397 7.44972 9.37505 7.44971C9.35309 7.4497 9.33152 7.45548 9.3125 7.46645L7.12406 8.71724C7.08628 8.73884 7.04352 8.7502 7 8.7502Z',
  'M10.7488 5.97655C10.7488 5.97655 10.7488 5.9753 10.7488 5.97483C10.7448 5.9352 10.7313 5.89711 10.7096 5.86374C10.6878 5.83036 10.6584 5.80267 10.6238 5.78296L7.12379 3.78296C7.08601 3.76136 7.04325 3.75 6.99973 3.75C6.95621 3.75 6.91345 3.76136 6.87567 3.78296L3.37567 5.78296C3.33742 5.80483 3.30563 5.83642 3.28351 5.87453C3.2614 5.91264 3.24976 5.95592 3.24976 5.99999C3.24976 6.04405 3.2614 6.08733 3.28351 6.12544C3.30563 6.16356 3.33742 6.19515 3.37567 6.21702L6.87567 8.21702C6.91345 8.23861 6.95621 8.24997 6.99973 8.24997C7.04325 8.24997 7.08601 8.23861 7.12379 8.21702L10.2032 6.45749C10.2079 6.45474 10.2133 6.45329 10.2188 6.4533C10.2243 6.45331 10.2297 6.45476 10.2345 6.45752C10.2392 6.46028 10.2432 6.46424 10.2459 6.46901C10.2486 6.47377 10.2501 6.47918 10.25 6.48467V8.74296C10.25 8.87749 10.3535 8.99296 10.488 8.99967C10.5218 9.0013 10.5556 8.99605 10.5873 8.98424C10.619 8.97243 10.648 8.9543 10.6725 8.93095C10.697 8.90761 10.7165 8.87953 10.7298 8.84842C10.7432 8.81732 10.75 8.78383 10.75 8.74999V5.99999C10.75 5.99216 10.7496 5.98434 10.7488 5.97655Z',
]
const ICON_WORK = [
  'M10.75 5.75C10.7497 5.48487 10.6443 5.23069 10.4568 5.04321C10.2693 4.85574 10.0151 4.75029 9.75 4.75H9V4.5C8.99979 4.30115 8.92071 4.11051 8.7801 3.9699C8.63949 3.82929 8.44885 3.75021 8.25 3.75H5.75C5.55115 3.75021 5.36051 3.82929 5.2199 3.9699C5.07929 4.11051 5.00021 4.30115 5 4.5V4.75H4.25C3.98487 4.75029 3.73069 4.85574 3.54321 5.04321C3.35574 5.23069 3.25029 5.48487 3.25 5.75V6.5H10.75V5.75ZM8.5 4.75H5.5V4.5C5.5 4.4337 5.52634 4.37011 5.57322 4.32322C5.62011 4.27634 5.6837 4.25 5.75 4.25H8.25C8.3163 4.25 8.37989 4.27634 8.42678 4.32322C8.47366 4.37011 8.5 4.4337 8.5 4.5V4.75Z',
  'M8.25 7.125C8.25 7.22446 8.21049 7.31984 8.14016 7.39016C8.06984 7.46049 7.97446 7.5 7.875 7.5H6.125C6.02554 7.5 5.93016 7.46049 5.85983 7.39016C5.78951 7.31984 5.75 7.22446 5.75 7.125V7.0625C5.75 7.04592 5.74342 7.03003 5.73169 7.01831C5.71997 7.00658 5.70408 7 5.6875 7H3.25V9.25C3.25 9.51522 3.35536 9.76957 3.54289 9.95711C3.73043 10.1446 3.98478 10.25 4.25 10.25H9.75C10.0152 10.25 10.2696 10.1446 10.4571 9.95711C10.6446 9.76957 10.75 9.51522 10.75 9.25V7H8.3125C8.29592 7 8.28003 7.00658 8.26831 7.01831C8.25658 7.03003 8.25 7.04592 8.25 7.0625V7.125Z',
]

/* eslint-disable @typescript-eslint/no-explicit-any */
// Parse an SVG path 'd' string, emitting canvas ops onto `ctx` (no beginPath/fill).
function drawSvgPath(ctx: any, d: string) {
  const toks = d.match(/[MmLlHhVvCcSsQqTtZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g)
  if (!toks) return
  let i = 0
  let x = 0
  let y = 0
  let sx = 0
  let sy = 0
  let pcx = 0
  let pcy = 0
  let cmd = ''
  let prev = ''
  const num = () => parseFloat(toks[i++])
  while (i < toks.length) {
    if (/[A-Za-z]/.test(toks[i])) cmd = toks[i++]
    else if (cmd === 'M') cmd = 'L'
    else if (cmd === 'm') cmd = 'l'
    const rel = cmd >= 'a'
    const C = cmd.toUpperCase()
    if (C === 'M') {
      let nx = num()
      let ny = num()
      if (rel) { nx += x; ny += y }
      x = nx; y = ny; sx = x; sy = y
      ctx.moveTo(x, y)
    } else if (C === 'L') {
      let nx = num()
      let ny = num()
      if (rel) { nx += x; ny += y }
      x = nx; y = ny
      ctx.lineTo(x, y)
    } else if (C === 'H') {
      let nx = num()
      if (rel) nx += x
      x = nx
      ctx.lineTo(x, y)
    } else if (C === 'V') {
      let ny = num()
      if (rel) ny += y
      y = ny
      ctx.lineTo(x, y)
    } else if (C === 'C') {
      let a = num(), b = num(), c2 = num(), d2 = num(), nx = num(), ny = num()
      if (rel) { a += x; b += y; c2 += x; d2 += y; nx += x; ny += y }
      ctx.bezierCurveTo(a, b, c2, d2, nx, ny)
      pcx = c2; pcy = d2; x = nx; y = ny
    } else if (C === 'S') {
      let c2 = num(), d2 = num(), nx = num(), ny = num()
      if (rel) { c2 += x; d2 += y; nx += x; ny += y }
      const smooth = prev.toUpperCase() === 'C' || prev.toUpperCase() === 'S'
      ctx.bezierCurveTo(smooth ? 2 * x - pcx : x, smooth ? 2 * y - pcy : y, c2, d2, nx, ny)
      pcx = c2; pcy = d2; x = nx; y = ny
    } else if (C === 'Q') {
      let a = num(), b = num(), nx = num(), ny = num()
      if (rel) { a += x; b += y; nx += x; ny += y }
      ctx.quadraticCurveTo(a, b, nx, ny)
      pcx = a; pcy = b; x = nx; y = ny
    } else if (C === 'Z') {
      ctx.closePath()
      x = sx; y = sy
    }
    prev = cmd
  }
}

// Section markers: a #F5F5F5 disc + the exact SVG glyph, scaled to a 12pt box.
// (x,y) = box top-left; `c` = glyph colour, `bg` = disc colour.
function sectionIcons(doc: jsPDF) {
  const ctx = (doc as any).context2d as any
  const draw = (paths: string[], x: number, y: number, glyph: string, bg: string) => {
    doc.setFillColor(bg)
    doc.circle(x + 6, y + 6, 6, 'F')
    if (!ctx) return
    ctx.save()
    ctx.fillStyle = glyph
    ctx.translate(x, y)
    ctx.scale(12 / 14, 12 / 14)
    ctx.beginPath()
    for (const d of paths) drawSvgPath(ctx, d)
    ctx.fill()
    ctx.restore()
  }
  return {
    star: (x: number, y: number, c: string, bg: string) => draw(ICON_STAR, x, y, c, bg),
    chat: (x: number, y: number, c: string, bg: string) => draw(ICON_LANG, x, y, c, bg),
    person: (x: number, y: number, c: string, bg: string) => draw(ICON_PERSON, x, y, c, bg),
    cap: (x: number, y: number, c: string, bg: string) => draw(ICON_CAP, x, y, c, bg),
    briefcase: (x: number, y: number, c: string, bg: string) => draw(ICON_WORK, x, y, c, bg),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ------------------------------------------------------------------- MODERN --
// Pixel-matched to the official editor's "Modern" SVG: a LEFT sidebar (a #F5F5F5
// blob behind a round photo, Skills, Language Skills with CEFR sub-bullets) and
// a RIGHT column (europass logo top-right, name, gray detail flow with
// underlined links, then About me / Education / Work — each a #F5F5F5 disc +
// dark glyph + gray title, with the date right-aligned). All text #5A5959 except
// the black name. Official font is DM Sans (Helvetica stands in until embedded).
function modern(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  void tpl
  const BLACK = '#000000'
  const GRAY = '#5A5959'
  const SEP = '#4F4F4F'
  const LINK = '#004494'
  const DISC = '#F5F5F5'
  const GLYPH = '#2B2B2B'
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const fam = addDmSans(doc) // the official editor's font
  const p = painter(doc, fam, 44)
  const icons = sectionIcons(doc)
  const id = profile.identity
  const name = `${id.firstName} ${id.lastName}`.trim()
  const LX = 32 // sidebar icon x
  const SBX = 47 // sidebar text x
  const RX = 197 // right column x
  const RIGHT = 549
  const rw = RIGHT - RX

  // ---- Photo: #F5F5F5 blob behind a round photo (r=35) at (92,94), no ring ----
  doc.setFillColor(DISC)
  doc.ellipse(95, 92, 50, 48, 'F')
  if (id.photo) circleImage(doc, id.photo, 92, 94, 35, DISC)

  // ---- LEFT sidebar ----
  let sy = 168 // Skills heading baseline
  const sbHeading = (label: string, icon: (x: number, y: number, c: string, bg: string) => void) => {
    icon(LX, sy - 10, GLYPH, DISC)
    p.setFont(true, 12, GRAY)
    doc.text(label, LX + 16, sy)
    sy += 18
  }
  const sbLine = (pieces: { t: string; bold?: boolean }[], x = SBX) => {
    let cx = x
    for (const s of pieces) {
      p.setFont(s.bold ?? false, 10, GRAY)
      doc.text(s.t, cx, sy)
      cx += doc.getTextWidth(s.t)
    }
    sy += 16
  }
  if (variant.skills.length) {
    sbHeading('Skills', icons.star)
    for (const s of variant.skills) sbLine([{ t: '• ' + s }])
    sy += 8
  }
  if (profile.languages.length) {
    sbHeading('Language Skills', icons.chat)
    const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
    const others = profile.languages.filter((l) => l.cefr && l.proficiency !== 'native_bilingual')
    for (const m of mother) sbLine([{ t: '• ' + m.name, bold: true }, { t: ': Mother tongue' }])
    for (const l of others) {
      sbLine([{ t: '• ' + l.name, bold: true }])
      const c = l.cefr!
      const pairs: [string, string][] = [
        ['Listening', c.listening], ['Reading', c.reading], ['Spoken production', c.spokenProduction], ['Spoken interaction', c.spokenInteraction], ['Writing', c.writing],
      ]
      for (const [k, v] of pairs) sbLine([{ t: `• ${k}: ${v}` }], 62)
    }
  }

  // ---- RIGHT column ----
  const logoW = 112
  const logoH = logoW * (92 / 360)
  try {
    doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', RIGHT - logoW, 36, logoW, logoH)
  } catch {
    /* logo optional */
  }
  const col: Cursor = { x: RX, w: rw, y: 92.4 }
  p.setFont(true, 18, BLACK)
  const nameLines = doc.splitTextToSize(name || ' ', rw) as string[]
  nameLines.forEach((ln, i) => {
    doc.text(ln, RX, col.y)
    if (i < nameLines.length - 1) col.y += 22
  })
  col.y += 18 // to first detail baseline
  // Detail flow — regular labels, gray underlined links (matches the SVG).
  const detail: Piece[][] = []
  if (id.dateOfBirth) detail.push([{ t: `Date of birth: ${id.dateOfBirth}`, color: GRAY }])
  if (id.sex) detail.push([{ t: `Gender: ${id.sex}`, color: GRAY }])
  if (id.nationality) detail.push([{ t: `Nationality: ${id.nationality}`, color: GRAY }])
  if (id.phone) detail.push([{ t: `Mobile phone:  ${id.phone}`, color: GRAY }])
  if (id.email) detail.push([{ t: 'Email address: ', color: GRAY }, { t: id.email, color: GRAY, underline: true }])
  if (profile.links.website) detail.push([{ t: 'Website: ', color: GRAY }, { t: profile.links.website, color: GRAY, underline: true }])
  if (profile.links.linkedin) detail.push([{ t: 'LinkedIn: ', color: GRAY }, { t: profile.links.linkedin, color: GRAY, underline: true }])
  if (id.location) detail.push([{ t: `Home address: ${id.location}`, color: GRAY }])
  col.y = inlineGroups(doc, p, detail, RX, col.y, rw, 17, 10, SEP, GRAY)
  col.y += 12 // extra breathing room before the first section

  const section = (label: string, icon: (x: number, y: number, c: string, bg: string) => void) => {
    col.y += 20
    p.ensure(col, 30)
    icon(RX, col.y, GLYPH, DISC)
    p.setFont(true, 12, GRAY)
    doc.text(label, RX + 16, col.y + 10)
    col.y += 28
  }
  const titleWithDate = (title: string, date: string) => {
    p.ensure(col, 16)
    if (date) {
      p.setFont(false, 10, GRAY)
      doc.text(date, RIGHT, col.y, { align: 'right' })
    }
    p.setFont(true, 12, GRAY)
    const dw = date ? doc.getTextWidth(date) + 12 : 0
    for (const ln of doc.splitTextToSize(title, rw - dw) as string[]) {
      doc.text(ln, RX, col.y)
      col.y += 15.5
    }
  }
  const paraGray = (t: string) => {
    p.setFont(false, 10, GRAY)
    for (const ln of doc.splitTextToSize(t, rw) as string[]) {
      doc.text(ln, RX, col.y)
      col.y += 13
    }
  }
  const bullet = (b: string) => {
    p.setFont(false, 10, GRAY)
    const lines = doc.splitTextToSize(b, rw - 18) as string[]
    lines.forEach((ln, j) => {
      if (j > 0) col.y += 13
      doc.text((j === 0 ? '•  ' : '') + ln, j === 0 ? RX + 15 : RX + 25, col.y)
    })
    col.y += 13
  }

  if (variant.summary) {
    section('About me', icons.person)
    paraGray(variant.summary)
  }
  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training', icons.cap)
    edus.forEach((e, i) => {
      if (i > 0) col.y += 14
      titleWithDate(e.degree, eduRange(e))
      paraGray([e.school, e.description].filter(Boolean).join('  |  '))
    })
  }
  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience', icons.briefcase)
    works.forEach(({ w }, i) => {
      if (i > 0) col.y += 20
      titleWithDate(w.title, workRange(w))
      paraGray([w.company, w.location].filter(Boolean).join('  |  '))
      col.y += 3
      for (const b of w.highlights) bullet(b)
    })
  }

  // ---- Footer: page number bottom-left, matching the SVG ----
  const pages = doc.getNumberOfPages()
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    p.setFont(false, 10, GRAY)
    doc.text(`Page ${pg}/${pages}`, LX, PAGE_H - 39)
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
// Pixel-matched to the official editor's "Timeline" SVG: a page-1 LEFT sidebar
// (#F5F5F5 band, round photo with a light-gray ring, centred name, bold-label
// personal details, a Contact block with blue icons) and a RIGHT column that
// runs a blue vertical spine with a filled dot at every entry. Section titles
// are 14pt gray uppercase; education leads with a blue bold date then the
// degree; work leads with the bold company (dot here) then title, blue date,
// bullets. Languages list each language's CEFR skills in two columns.
function timeline(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  void tpl
  const BAND = '#F5F5F5'
  const RING = '#C6C6C6'
  const SIDE = '#4F4F4F' // name + sidebar labels
  const BLUE = '#214493' // spine, dots, dates, icons
  const LINKC = '#004494' // hyperlinks
  const HEAD = '#565656' // section titles + body
  const TITLE = '#616161' // entry titles / company
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica', 40)
  const ci = contactIcons(doc)
  const id = profile.identity
  const name = `${id.firstName} ${id.lastName}`.trim()

  const bandW = 188
  const RX = 216 // right-column content x
  const LINEX = 202 // spine x
  const RIGHT = PAGE_W - 39
  const rw = RIGHT - RX

  // ---- Page-1 sidebar band + round photo (light-gray ring) ----
  doc.setFillColor(BAND)
  doc.rect(0, 0, bandW, PAGE_H, 'F')
  const pcx = 94
  const pcy = 78
  const r = 48
  if (id.photo) circleImage(doc, id.photo, pcx, pcy, r, BAND)
  doc.setDrawColor(RING)
  doc.setLineWidth(2)
  doc.circle(pcx, pcy, r + 1, 'S')

  let sy = 148.8
  p.setFont(true, 16, SIDE)
  for (const ln of doc.splitTextToSize(name || ' ', bandW - 20) as string[]) {
    doc.text(ln, bandW / 2, sy, { align: 'center' })
    sy += 20.8
  }
  sy += 24
  const sideDetail = (label: string, val: string) => {
    if (!val) return
    p.setFont(true, 10, SIDE)
    doc.text(label, 14, sy)
    const w0 = doc.getTextWidth(label)
    p.setFont(false, 10, SIDE)
    doc.text(val, 14 + w0, sy)
    sy += 22
  }
  sideDetail('Date of birth: ', id.dateOfBirth || '')
  sideDetail('Nationality: ', id.nationality || '')
  sideDetail('Gender: ', id.sex || '')

  sy += 18
  p.setFont(true, 16, SIDE)
  doc.text('Contact', 14, sy)
  sy += 22
  const contactRow = (icon: (x: number, y: number, c: string) => void, text: string, link = false) => {
    if (!text) return
    icon(14, sy - 8, BLUE)
    p.setFont(false, 10, link ? LINKC : SIDE)
    for (const ln of doc.splitTextToSize(text, bandW - 34) as string[]) {
      doc.text(ln, 34, sy)
      if (link) {
        doc.setDrawColor(LINKC)
        doc.setLineWidth(0.4)
        doc.line(34, sy + 1.3, 34 + doc.getTextWidth(ln), sy + 1.3)
      }
      sy += 14
    }
    sy += 6
  }
  contactRow(ci.pin, id.location || '')
  contactRow(ci.mail, id.email || '', true)
  contactRow(ci.phone, id.phone || '')
  if (profile.links.website) contactRow(ci.globe, profile.links.website, true)
  if (profile.links.linkedin) contactRow(ci.linkedin, profile.links.linkedin, true)

  // ---- RIGHT timeline column ----
  const col: Cursor = { x: RX, w: rw, y: 85.2 }
  let prevDotY = -1
  const dot = (yy: number) => {
    if (prevDotY >= 0 && yy > prevDotY) {
      doc.setDrawColor(BLUE)
      doc.setLineWidth(1)
      doc.line(LINEX, prevDotY, LINEX, yy)
    }
    doc.setFillColor(BLUE)
    doc.circle(LINEX, yy, 3.5, 'F')
    prevDotY = yy
  }
  const section = (label: string) => {
    col.y += 22
    p.ensure(col, 26)
    p.setFont(false, 14, HEAD)
    doc.text(label.toUpperCase(), RX, col.y)
    col.y += 23
  }
  const para = (t: string, x = RX) => {
    p.setFont(false, 10, HEAD)
    for (const ln of doc.splitTextToSize(t, RIGHT - x) as string[]) {
      p.ensure(col, 13)
      doc.text(ln, x, col.y)
      col.y += 13
    }
  }
  const bullet = (b: string) => {
    p.setFont(false, 10, HEAD)
    const lines = doc.splitTextToSize(b, RIGHT - 241) as string[]
    lines.forEach((ln, j) => {
      if (j > 0) col.y += 13
      p.ensure(col, 13)
      doc.text((j === 0 ? '•  ' : '') + ln, j === 0 ? 231 : 241, col.y)
    })
    col.y += 13
  }
  // A bold segment followed by a normal segment on one baseline.
  const boldThenNormal = (a: string, aColor: string, aSize: number, b: string, bColor: string, bSize: number) => {
    p.ensure(col, 16)
    p.setFont(true, aSize, aColor)
    doc.text(a, RX, col.y)
    if (b) {
      const w0 = doc.getTextWidth(a)
      p.setFont(false, bSize, bColor)
      doc.text(b, RX + w0, col.y)
    }
  }

  if (variant.summary) {
    section('About me')
    para(variant.summary)
  }
  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training')
    edus.forEach((e, i) => {
      if (i > 0) col.y += 14
      const dl = eduRange(e)
      if (dl) {
        boldThenNormal(dl + ' ', BLUE, 11, '', BLUE, 11)
        col.y += 17
      }
      dot(col.y - 3.5)
      boldThenNormal(e.degree + ' ', TITLE, 11, e.school, TITLE, 11)
      col.y += 15
      if (e.description) para(e.description)
    })
  }
  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience')
    works.forEach(({ w }, i) => {
      if (i > 0) col.y += 14
      dot(col.y - 3.5)
      boldThenNormal(w.company + ' ', TITLE, 11, w.location || '', '#4F4F4F', 9)
      col.y += 17
      p.setFont(true, 11, TITLE)
      p.ensure(col, 15)
      doc.text(w.title, RX, col.y)
      col.y += 14
      const dl = workRange(w)
      if (dl) {
        p.setFont(false, 9, BLUE)
        p.ensure(col, 13)
        doc.text(dl, RX, col.y)
        col.y += 14
      }
      for (const b of w.highlights) bullet(b)
    })
  }

  if (variant.skills.length) {
    section('Skills')
    col.y = inlineGroups(
      doc,
      p,
      variant.skills.map((s) => [{ t: s, color: HEAD }]),
      RX,
      col.y,
      RIGHT - RX,
      13,
      9,
      '#4F4F4F',
      HEAD,
    )
  }

  const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
  const graded = profile.languages.filter((l) => l.cefr && l.proficiency !== 'native_bilingual')
  if (profile.languages.length) {
    section('Language Skills')
    if (mother.length) {
      boldThenNormal('Mother tongue(s): ', HEAD, 10, mother.map((l) => l.name).join(', '), HEAD, 10)
      col.y += 16
    }
    if (graded.length) {
      p.setFont(true, 10, HEAD)
      doc.text('Other language(s):', RX, col.y)
      col.y += 16
      const pair = (label: string, lvl: string, x: number, yy: number) => {
        p.setFont(true, 10, HEAD)
        doc.text(label + ' ', x, yy)
        const w0 = doc.getTextWidth(label + ' ')
        p.setFont(false, 10, HEAD)
        doc.text(lvl, x + w0, yy)
      }
      for (const l of graded) {
        p.ensure(col, 66)
        p.setFont(true, 10, HEAD)
        doc.text(l.name, RX, col.y)
        col.y += 16
        const c = l.cefr!
        const left: [string, string][] = [
          ['Listening', c.listening],
          ['Reading', c.reading],
          ['Writing', c.writing],
        ]
        const rightC: [string, string][] = [
          ['Spoken production', c.spokenProduction],
          ['Spoken interaction', c.spokenInteraction],
        ]
        const rowY = col.y
        for (let k = 0; k < 3; k++) {
          const yy = rowY + k * 16
          pair(left[k][0], left[k][1], RX + 10, yy)
          if (rightC[k]) pair(rightC[k][0], rightC[k][1], RX + 100, yy)
        }
        col.y = rowY + 3 * 16 + 4
        doc.setDrawColor('#9D9D9D')
        doc.setLineWidth(0.5)
        doc.line(RX, col.y, RIGHT, col.y)
        col.y += 14
      }
    }
  }

  // ---- Footer: europass mark top-right on page 1, page number bottom-right ----
  const pages = doc.getNumberOfPages()
  const lgW = 140
  const lgH = lgW * (92 / 360)
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    if (pg === 1) {
      try {
        doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', RIGHT - lgW, 30, lgW, lgH)
      } catch {
        /* logo optional */
      }
    }
    p.setFont(false, 10, HEAD)
    doc.text(`Page ${pg}/${pages}`, RIGHT, PAGE_H - 30, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}

// ----------------------------------------------------------------- PROGRESS --
// Pixel-matched to the official editor's "Progress" SVG. Single column: a 194pt
// #F5F5F5 header band (photo top-left with a thin black ring, 16pt gray name,
// bold-label detail flow), the europass mark top-right on page 1, then sections
// each marked by a small filled dot in the left margin + an UPPERCASE bold title
// over a full-width rule. Entries carry an uppercase date/location line, an
// uppercase bold title + org over a short underline, gray body/bullets. Languages
// use the CEFR grid with alternating shaded rows and full horizontal borders.

/** Progress header detail groups — bold black labels, blue underlined links. */
function progressDetail(profile: Profile, link: string): Piece[][] {
  const id = profile.identity
  const g: Piece[][] = []
  const lbl = (t: string): Piece => ({ t, bold: true })
  if (id.dateOfBirth) g.push([lbl('Date of birth: '), { t: id.dateOfBirth }])
  if (id.nationality) g.push([lbl('Nationality: '), { t: id.nationality }])
  if (id.sex) g.push([lbl('Gender: '), { t: id.sex }])
  if (id.phone) g.push([lbl('Phone: '), { t: id.phone }])
  if (id.email) g.push([lbl('Email address: '), { t: id.email, color: link, underline: true }])
  if (profile.links.website) g.push([lbl('Website: '), { t: profile.links.website, color: link, underline: true }])
  if (profile.links.linkedin) g.push([lbl('LinkedIn: '), { t: profile.links.linkedin, color: link, underline: true }])
  if (id.location) g.push([lbl('Address: '), { t: id.location }])
  return g
}

/** The Progress CEFR table: name + five 86pt columns, UNDERSTANDING/SPEAKING over
 *  their two skills and WRITING over its own, uppercase bold headers, alternating
 *  #F6F6F6 data rows, and a full horizontal rule at every row boundary. */
function progressLangTable(doc: jsPDF, p: ReturnType<typeof painter>, c: Cursor, langs: { name: string; l: string[] }[], L: number, R: number) {
  const BLACK = '#000000'
  const SHADE = '#F6F6F6' // #d3d3d3 @ 0.2 over white
  const BORDER = '#A7A7A7' // #4F4F4F @ 0.5 over white
  const cellW = (R - L) / 6
  const xs = [0, 1, 2, 3, 4, 5, 6].map((k) => L + k * cellW)
  const GH = 30 // group-header row
  const SH = 30 // sub-header row
  const RH = 30 // data rows
  p.ensure(c, GH + SH + langs.length * RH + 6)
  const top = c.y
  const ctr = (t: string, x0: number, x1: number, yy: number, size: number, bold: boolean) => {
    p.setFont(bold, size, BLACK)
    doc.text(t, (x0 + x1) / 2, yy, { align: 'center' })
  }
  const rule = (yy: number) => {
    doc.setDrawColor(BORDER)
    doc.setLineWidth(0.5)
    doc.line(L, yy, R, yy)
  }
  rule(top)
  ctr('UNDERSTANDING', xs[1], xs[3], top + 17.25, 10, true)
  ctr('SPEAKING', xs[3], xs[5], top + 17.25, 10, true)
  ctr('WRITING', xs[5], xs[6], top + 17.25, 10, true)
  rule(top + GH)
  ;(
    [
      ['Listening', xs[1], xs[2]],
      ['Reading', xs[2], xs[3]],
      ['Spoken production', xs[3], xs[4]],
      ['Spoken interaction', xs[4], xs[5]],
    ] as [string, number, number][]
  ).forEach(([s, a, b]) => ctr(s, a, b, top + GH + 18.3, 9, false))
  rule(top + GH + SH)
  let ry = top + GH + SH
  langs.forEach((lang, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(SHADE)
      doc.rect(L, ry, R - L, RH, 'F')
    }
    ctr(lang.name.toUpperCase(), xs[0], xs[1], ry + 17.25, 10, true)
    for (let i = 0; i < 5; i++) ctr(lang.l[i] ?? '', xs[i + 1], xs[i + 2] ?? R, ry + 17.25, 10, false)
    rule(ry)
    ry += RH
  })
  rule(ry)
  c.y = ry + 6
}

function progress(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  void tpl
  const BLACK = '#000000'
  const GRAY = '#4F4F4F' // name, entry titles, separators
  const SOFT = '#5A5959' // body, bullets
  const LINKC = '#004494'
  const BANDC = '#F5F5F5'
  const RULE1 = '#A7A7A7' // section rule (#4F4F4F @ 0.5 over white)
  const DOTC = '#B9B9B9' // progress dot (#4F4F4F @ 0.4 over white)
  const LH = 13
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica', 46)
  const id = profile.identity
  const L = 39
  const R = PAGE_W - 39
  const name = `${id.firstName} ${id.lastName}`.trim()

  // ---- Header band (194pt): photo centred at (74,98) with a thin black ring ----
  doc.setFillColor(BANDC)
  doc.rect(0, 0, PAGE_W, 194, 'F')
  if (id.photo) circleImage(doc, id.photo, 74, 98, 35, BANDC)
  doc.setFillColor('#ffffff')
  doc.rect(0, 194, PAGE_W, PAGE_H - 194, 'F')
  doc.setDrawColor(BLACK)
  doc.setLineWidth(1)
  doc.circle(74, 98, 36, 'S')
  // europass mark, top-right (page 1 only — added in the footer pass)
  p.setFont(true, 16, GRAY)
  doc.text(name || ' ', 127, 79)
  doc.setDrawColor(GRAY)
  doc.setLineWidth(0.8)
  doc.line(127, 92, R, 92)
  inlineGroups(doc, p, progressDetail(profile, LINKC), 127, 111, R - 127, 20, 10, GRAY, BLACK)

  const col: Cursor = { x: L, w: R - L, y: 194 }

  const para = (t: string, size: number, color: string) => {
    p.setFont(false, size, color)
    doc.splitTextToSize(t, R - L).forEach((ln: string, i: number) => {
      if (i > 0) col.y += LH
      p.ensure(col, LH)
      doc.text(ln, L, col.y)
    })
  }
  const bullet = (b: string) => {
    p.setFont(false, 10, SOFT)
    const lines = doc.splitTextToSize(b, R - 64) as string[]
    lines.forEach((ln, j) => {
      if (j > 0) col.y += LH
      p.ensure(col, LH)
      if (j === 0) doc.text('•  ' + ln, 54, col.y)
      else doc.text(ln, 64, col.y)
    })
  }
  const section = (label: string) => {
    col.y += 26
    p.ensure(col, 34)
    doc.setFillColor(DOTC)
    doc.circle(29, col.y - 3, 2.5, 'F')
    p.setFont(true, 11, BLACK)
    doc.text(label.toUpperCase(), L, col.y)
    doc.setDrawColor(RULE1)
    doc.setLineWidth(1.4)
    doc.line(L, col.y + 4.3, R, col.y + 4.3)
    col.y += 27
  }
  // Uppercase date/location line + bold title with normal org, over a short rule.
  const entryHead = (dateLoc: string, title: string, org: string) => {
    p.ensure(col, 40)
    if (dateLoc) {
      p.setFont(false, 9, GRAY)
      doc.text(dateLoc.toUpperCase(), L, col.y)
      col.y += 17
    }
    p.setFont(true, 11, GRAY)
    const tw = doc.getTextWidth(title.toUpperCase())
    doc.text(title.toUpperCase(), L, col.y)
    let ow = 0
    if (org) {
      p.setFont(false, 11, GRAY)
      const ot = ' ' + org.toUpperCase()
      doc.text(ot, L + tw, col.y)
      ow = doc.getTextWidth(ot)
    }
    doc.setDrawColor(GRAY)
    doc.setLineWidth(0.4)
    doc.line(L, col.y + 6, Math.min(L + tw + ow, R), col.y + 6)
    col.y += 20
  }

  if (variant.summary) {
    section('About me')
    para(variant.summary, 10, SOFT)
  }

  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training')
    edus.forEach((e, i) => {
      if (i > 0) col.y += 16
      entryHead(eduRange(e), e.degree, e.school)
      if (e.description) para(e.description, 10, SOFT)
    })
  }

  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience')
    works.forEach(({ w }, i) => {
      if (i > 0) col.y += 18
      entryHead([workRange(w), w.location].filter(Boolean).join('  -  '), w.title, w.company)
      for (const b of w.highlights) {
        col.y += LH
        bullet(b)
      }
    })
  }

  if (variant.skills.length) {
    section('Skills')
    col.y = inlineGroups(
      doc,
      p,
      variant.skills.map((s) => [{ t: s, color: SOFT }]),
      L,
      col.y,
      R - L,
      LH,
      9,
      GRAY,
      SOFT,
    )
  }

  const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
  const graded = profile.languages.filter((l) => l.cefr && l.proficiency !== 'native_bilingual')
  if (profile.languages.length) {
    section('Language Skills')
    if (mother.length) {
      p.setFont(false, 10, SOFT)
      doc.text('Mother tongue(s): ', L, col.y)
      const w0 = doc.getTextWidth('Mother tongue(s): ')
      p.setFont(true, 11, GRAY)
      doc.text(mother.map((l) => l.name.toUpperCase()).join(', '), L + w0, col.y)
    }
    if (graded.length) {
      col.y += mother.length ? 16 : 0
      progressLangTable(
        doc,
        p,
        col,
        graded.map((l) => ({ name: l.name, l: [l.cefr!.listening, l.cefr!.reading, l.cefr!.spokenProduction, l.cefr!.spokenInteraction, l.cefr!.writing] })),
        L,
        R,
      )
    }
  }

  // ---- Footer: europass mark top-right on page 1, page number bottom-right ----
  const pages = doc.getNumberOfPages()
  const lgW = 112
  const lgH = lgW * (92 / 360)
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    if (pg === 1) {
      try {
        doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', R - lgW, 33, lgW, lgH)
      } catch {
        /* logo optional */
      }
    }
    p.setFont(false, 10, SOFT)
    doc.text(`Page ${pg}/${pages}`, R, PAGE_H - 33, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}

// ------------------------------------------------------------------- ACCENT --
// Pixel-matched to the official editor's "Accent" SVG. Single column framed by
// light-blue corner brackets (#82ACD9). Blue name, blue UPPERCASE section titles
// over gray hairline rules, italic-bold org names with bracketed date ranges,
// blue entry titles, and a two-column language block (bold UPPERCASE skill
// labels). Photo top-left with a blue ring; europass mark top-right on page 1.

/** Accent header details as one contiguous run (bold labels, blue links). */
function accentDetail(profile: Profile, label: string, val: string, link: string): Piece[] {
  const id = profile.identity
  const pc: Piece[] = []
  const lbl = (t: string): Piece => ({ t, bold: true, color: label })
  const v = (t: string): Piece => ({ t: t + '  ', color: val })
  const lnk = (t: string): Piece[] => [{ t, color: link, underline: true }, { t: '  ' }]
  if (id.nationality) pc.push(lbl('Nationality: '), v(id.nationality))
  if (id.dateOfBirth) pc.push(lbl('Date of birth: '), v(id.dateOfBirth))
  if (id.sex) pc.push(lbl('Gender: '), v(id.sex))
  if (id.phone) pc.push(lbl('Phone: '), v(id.phone))
  if (id.email) pc.push(lbl('Email address: '), ...lnk(id.email))
  if (profile.links.linkedin) pc.push(lbl('LinkedIn: '), ...lnk(profile.links.linkedin))
  if (profile.links.website) pc.push(lbl('Website: '), ...lnk(profile.links.website))
  if (id.location) pc.push(lbl('Address: '), v(id.location))
  return pc
}

function accent(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  void tpl
  const FRAME = '#82ACD9'
  const ACCENT = '#0C56A5' // name, section + entry titles
  const ACCENT2 = '#214493' // language names
  const RULEG = '#CBCBCB' // section hairline
  const LABEL = '#404040'
  const VAL = '#565656'
  const ORG = '#000000'
  const DATE = '#6B6B6B'
  const LINKC = '#004494'
  const LH = 13
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica', 44)
  const id = profile.identity
  const L = 38
  const R = PAGE_W - 38
  const name = `${id.firstName} ${id.lastName}`.trim()

  // ---- Header: photo top-left (blue ring), blue name, contact run ----
  const pcx = 86
  const pcy = 120
  const r = 48
  if (id.photo) circleImage(doc, id.photo, pcx, pcy, r, '#ffffff')
  doc.setDrawColor(ACCENT2)
  doc.setLineWidth(2)
  doc.circle(pcx, pcy, r + 1, 'S')
  p.setFont(true, 16, ACCENT)
  doc.text(name || ' ', 152, 88)

  const col: Cursor = { x: L, w: R - L, y: 110 }
  const cy = inlineGroups(doc, p, [accentDetail(profile, LABEL, VAL, LINKC)], 152, 110, R - 152, 20, 10, VAL, VAL)
  col.y = Math.max(cy, 194)

  const section = (labelT: string) => {
    col.y += 26
    p.ensure(col, 30)
    p.setFont(true, 11, ACCENT)
    doc.text(labelT.toUpperCase(), L, col.y)
    doc.setDrawColor(RULEG)
    doc.setLineWidth(0.5)
    doc.line(L, col.y + 6.5, R, col.y + 6.5)
    col.y += 23
  }
  const para = (t: string) => {
    p.setFont(false, 10, VAL)
    for (const ln of doc.splitTextToSize(t, R - L) as string[]) {
      p.ensure(col, LH)
      doc.text(ln, L, col.y)
      col.y += LH
    }
  }
  const bullet = (b: string) => {
    p.setFont(false, 10, VAL)
    const lines = doc.splitTextToSize(b, R - 63) as string[]
    lines.forEach((ln, j) => {
      if (j > 0) col.y += LH
      p.ensure(col, LH)
      doc.text((j === 0 ? '•  ' : '') + ln, j === 0 ? 53 : 63, col.y)
    })
    col.y += LH
  }
  // italic-bold org name followed by a normal run on one baseline
  const orgLine = (nameT: string, tail: string) => {
    p.ensure(col, 15)
    doc.setFont('helvetica', 'bolditalic')
    doc.setFontSize(11)
    doc.setTextColor(ORG)
    doc.text(nameT, L, col.y)
    if (tail) {
      const w0 = doc.getTextWidth(nameT + ' ')
      p.setFont(false, 11, ORG)
      doc.text(tail, L + w0, col.y)
    }
    col.y += 17
  }

  if (variant.summary) {
    section('About me')
    para(variant.summary)
  }

  const edus = resolveEdu(profile, variant)
  if (edus.length) {
    section('Education & Training')
    edus.forEach((e, i) => {
      if (i > 0) col.y += 10
      p.setFont(true, 11, ACCENT)
      p.ensure(col, 15)
      doc.text(e.degree, L, col.y)
      col.y += 17
      orgLine(e.school, eduRange(e) ? `[ ${eduRange(e)} ]` : '')
      if (e.description) para(e.description)
    })
  }

  const works = resolveWork(profile, variant)
  if (works.length) {
    section('Work experience')
    works.forEach(({ w }, i) => {
      if (i > 0) col.y += 12
      orgLine(w.company, w.location ? `- ${w.location}` : '')
      p.setFont(true, 11, ACCENT)
      p.ensure(col, 15)
      doc.text(w.title, L, col.y)
      col.y += 17
      if (workRange(w)) {
        p.setFont(false, 10, DATE)
        doc.text(`[ ${workRange(w)} ]`, L, col.y)
        col.y += 15
      }
      for (const b of w.highlights) {
        col.y += 1
        bullet(b)
      }
    })
  }

  if (variant.skills.length) {
    section('Skills')
    col.y = inlineGroups(
      doc,
      p,
      variant.skills.map((s) => [{ t: s, color: VAL }]),
      L,
      col.y,
      R - L,
      LH,
      9,
      VAL,
      VAL,
    )
  }

  const mother = profile.languages.filter((l) => l.proficiency === 'native_bilingual')
  const graded = profile.languages.filter((l) => l.cefr && l.proficiency !== 'native_bilingual')
  if (profile.languages.length) {
    section('Language Skills')
    if (mother.length) {
      p.setFont(true, 11, ACCENT)
      doc.text('Mother tongue(s): ', L, col.y)
      const w0 = doc.getTextWidth('Mother tongue(s): ')
      p.setFont(false, 11, ORG)
      doc.text(mother.map((l) => l.name).join(', '), L + w0, col.y)
      col.y += 22
    }
    if (graded.length) {
      const drawPairs = (x: number, yy: number, pairs: [string, string][]) => {
        let cx = x
        for (const [lab, lv] of pairs) {
          p.setFont(true, 10, LABEL)
          doc.text(lab + ': ', cx, yy)
          cx += doc.getTextWidth(lab + ': ')
          p.setFont(false, 10, VAL)
          doc.text(lv + '  ', cx, yy)
          cx += doc.getTextWidth(lv + '  ')
        }
      }
      const block = (l: (typeof graded)[number], x: number, y0: number) => {
        const c = l.cefr!
        p.setFont(true, 10, ACCENT2)
        doc.text(l.name, x, y0)
        drawPairs(x, y0 + 16, [
          ['LISTENING', c.listening],
          ['READING', c.reading],
          ['WRITING', c.writing],
        ])
        drawPairs(x, y0 + 32, [['SPOKEN PRODUCTION', c.spokenProduction]])
        drawPairs(x, y0 + 48, [['SPOKEN INTERACTION', c.spokenInteraction]])
      }
      const colW = 259
      for (let i = 0; i < graded.length; i += 2) {
        p.ensure(col, 64)
        const y0 = col.y
        block(graded[i], L, y0)
        if (graded[i + 1]) block(graded[i + 1], L + colW, y0)
        col.y = y0 + 64
      }
    }
  }

  // ---- Frame (every page) + europass mark (page 1) + page number ----
  const pages = doc.getNumberOfPages()
  const lgW = 122
  const lgH = lgW * (92 / 360)
  for (let pg = 1; pg <= pages; pg++) {
    doc.setPage(pg)
    doc.setFillColor(FRAME)
    doc.rect(0, 0, PAGE_W, 25, 'F')
    doc.rect(0, PAGE_H - 25, PAGE_W, 25, 'F')
    doc.rect(0, 0, 25, 68, 'F')
    doc.rect(PAGE_W - 25, 0, 25, 68, 'F')
    doc.rect(0, PAGE_H - 68, 25, 68, 'F')
    doc.rect(PAGE_W - 25, PAGE_H - 68, 25, 68, 'F')
    if (pg === 1) {
      try {
        doc.addImage(EUROPASS_LOGO_NEW, 'JPEG', R - lgW, 40, lgW, lgH)
      } catch {
        /* logo optional */
      }
    }
    p.setFont(false, 10, VAL)
    doc.text(`Page ${pg}/${pages}`, R - 12, PAGE_H - 42, { align: 'right' })
  }

  return doc.output('datauristring').split(',')[1]
}
