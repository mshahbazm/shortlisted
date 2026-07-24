// Continental / German "tabellarischer Lebenslauf" — the tabular CV expected in
// Germany/Austria and photo markets. Structurally distinct from Anglo/ATS:
//   - two-column rows: date range (left) | content (right)
//   - a "Persönliche Daten" block with photo, date of birth, nationality
//   - German section headings (the document is a German-market artefact)
//   - a place/date + signature line at the foot
// Ref: tabellarischer Lebenslauf convention. Photo/DOB/nationality expected.

import { jsPDF } from 'jspdf'
import { Profile, TailoredResume } from '../../lib/types'
import { ResumeTemplate } from '../templates'
import { Cursor, INK, LINE, MARGIN, PAGE_W, SOFT, painter, toBase64, toCefr } from './shared'

const ACCENT = '#334155' // sober slate — German CVs are understated

// MM/YYYY date range, the Lebenslauf convention.
const mmYYYY = (y?: number, m?: number) => (y ? `${m ? String(m).padStart(2, '0') + '/' : ''}${y}` : '')

// Language proficiency → German level wording (with CEFR where it adds signal).
function germanLevel(p: Profile['languages'][number]['proficiency']): string {
  switch (p) {
    case 'native_bilingual':
      return 'Muttersprache'
    case 'full_professional':
      return `Verhandlungssicher (${toCefr(p)})`
    case 'professional_working':
      return `Fließend (${toCefr(p)})`
    case 'limited_working':
      return `Gut (${toCefr(p)})`
    case 'elementary':
      return `Grundkenntnisse (${toCefr(p)})`
  }
}

export function renderLebenslauf(profile: Profile, variant: TailoredResume, tpl: ResumeTemplate): string {
  const accent = tpl.accent ?? ACCENT
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const p = painter(doc, 'helvetica')
  const CONTENT_W = PAGE_W - MARGIN * 2
  const id = profile.identity
  const c: Cursor = { x: MARGIN, w: CONTENT_W, y: MARGIN }
  const DATECOL = 100

  // ---- Photo (optional, top-right) ----
  const PW = 74
  const PH = 95
  if (id.photo) {
    try {
      const fmt = id.photo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      doc.addImage(id.photo, fmt, PAGE_W - MARGIN - PW, MARGIN, PW, PH)
    } catch {
      // A broken image must never break the CV.
    }
  }

  // ---- Title + name ----
  p.setFont(false, 9, SOFT)
  doc.text('LEBENSLAUF', c.x, c.y + 2, { charSpace: 1.5 })
  c.y += 18
  const name = `${id.firstName} ${id.lastName}`.trim()
  p.text({ x: c.x, w: id.photo ? c.w - PW - 16 : c.w, y: c.y }, name || ' ', 19, { bold: true, color: INK })
  c.y += 26
  if (variant.headline) {
    p.text({ x: c.x, w: id.photo ? c.w - PW - 16 : c.w, y: c.y }, variant.headline, 11, { color: SOFT })
    c.y += 18
  }
  c.y = Math.max(c.y, MARGIN + PH) + 6

  // ---- Section heading (bold + thin accent rule) ----
  const heading = (title: string) => {
    c.y += 14
    p.ensure(c, 24)
    p.setFont(true, 11, INK)
    doc.text(title, c.x, c.y)
    c.y += 5
    doc.setDrawColor(accent)
    doc.setLineWidth(0.8)
    doc.line(c.x, c.y, c.x + c.w, c.y)
    c.y += 12
  }

  // ---- Row: left column (date/label) | right column (content) ----
  const row = (left: string, render: (r: Cursor) => void, leftOpts: { bold?: boolean } = {}) => {
    p.ensure(c, 22)
    const startY = c.y
    p.setFont(leftOpts.bold ?? false, 9, SOFT)
    let ly = startY
    for (const ln of doc.splitTextToSize(left, DATECOL - 10) as string[]) {
      doc.text(ln, c.x, ly)
      ly += 9 * 1.3
    }
    const r: Cursor = { x: c.x + DATECOL, w: c.w - DATECOL, y: startY }
    render(r)
    c.y = Math.max(r.y, ly)
  }

  // ---- Persönliche Daten ----
  heading('Persönliche Daten')
  const persRow = (label: string, value?: string) => {
    if (!value) return
    row(label, (r) => p.text(r, value, 9.5))
  }
  persRow('Adresse', id.location)
  persRow('Telefon', id.phone)
  persRow('E-Mail', id.email)
  persRow('Geburtsdatum', id.dateOfBirth)
  persRow('Staatsangehörigkeit', id.nationality)

  // ---- Berufserfahrung ----
  const workById = new Map(profile.work.map((w) => [w.id, w]))
  const workEntries = variant.work.map((v) => ({ v, w: workById.get(v.sourceId) })).filter((e) => e.w)
  if (workEntries.length) {
    heading('Berufserfahrung')
    for (const { v, w } of workEntries) {
      const src = w!
      const start = mmYYYY(src.startYear, src.startMonth)
      const end = src.isCurrent || !src.endYear ? 'heute' : mmYYYY(src.endYear, src.endMonth)
      row(
        [start, end].filter(Boolean).join(' – '),
        (r) => {
          p.text(r, src.title, 10.5, { bold: true })
          p.text(r, [src.company, src.location].filter(Boolean).join(', '), 9.5, { color: SOFT, gap: 2 })
          const bullets = v.bullets.length ? v.bullets : src.highlights
          for (const b of bullets) p.bullet(r, b, 9.5, accent)
        },
      )
      c.y += 5
    }
  }

  // ---- Ausbildung ----
  const eduById = new Map(profile.education.map((e) => [e.id, e]))
  const edus = variant.educationIds.map((eid) => eduById.get(eid)).filter(Boolean)
  if (edus.length) {
    heading('Ausbildung')
    for (const e of edus) {
      const ed = e!
      const end = ed.isCurrent ? 'heute' : ed.endYear ? String(ed.endYear) : ''
      row(
        [ed.startYear ? String(ed.startYear) : '', end].filter(Boolean).join(' – '),
        (r) => {
          p.text(r, [ed.degree, ed.fieldOfStudy].filter(Boolean).join(', '), 10.5, { bold: true })
          p.text(r, ed.school, 9.5, { color: SOFT, gap: 2 })
          if (ed.description) p.text(r, ed.description, 9, { color: SOFT, gap: 2 })
        },
      )
      c.y += 5
    }
  }

  // ---- Kenntnisse (skills) ----
  if (variant.skills.length) {
    heading('Kenntnisse')
    p.text(c, variant.skills.join('   ·   '), 9.5, { gap: 2 })
  }

  // ---- Sprachen ----
  if (profile.languages.length) {
    heading('Sprachen')
    for (const l of profile.languages) {
      row(l.name, (r) => p.text(r, germanLevel(l.proficiency), 9.5), { bold: true })
    }
  }

  // ---- Ort, Datum + Unterschrift ----
  c.y += 26
  p.ensure(c, 52)
  const now = new Date()
  const today = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`
  const place = id.city || id.location?.split(',')[0]?.trim() || ''
  p.text(c, [place, today].filter(Boolean).join(', '), 9, { color: SOFT })
  c.y += 30
  doc.setDrawColor(INK)
  doc.setLineWidth(0.5)
  doc.line(c.x, c.y, c.x + 180, c.y)
  c.y += 12
  p.text(c, name, 9, { color: SOFT })

  return toBase64(doc)
}
