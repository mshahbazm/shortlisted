// Profile/tailored JSON -> an ATS-friendly PDF in the chosen template.
// Deterministic: no AI here. One renderer interprets template design tokens
// (font, accent, header/section style, single vs sidebar layout, density) —
// always real text, standard fonts, no tables, no graphics.

import { jsPDF } from 'jspdf'
import { Profile, TailoredResume, workPeriodLabel } from '../lib/types'
import { ResumeTemplate, getTemplate } from './templates'

const PAGE_W = 595.28 // A4 points
const PAGE_H = 841.89
const MARGIN = 48

const INK = '#111827'
const SOFT = '#4b5563'
const LINE = '#d1d5db'

/** Mix a hex color toward white — the sidebar's soft background tint. */
function pale(hex: string, f = 0.93): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v + (255 - v) * f)
  const r = ch((n >> 16) & 255)
  const g = ch((n >> 8) & 255)
  const b = ch(n & 255)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** A text column with its own cursor. Page breaks only when `breaks` is on. */
interface Col {
  x: number
  w: number
  y: number
  breaks: boolean
}

export function renderResumePdf(profile: Profile, variant: TailoredResume, templateId?: string): string {
  const tpl = getTemplate(templateId)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const base = tpl.density === 'compact' ? 8.8 : 9.5
  const lh = tpl.density === 'compact' ? 1.28 : 1.35
  const accent = tpl.accent ?? INK

  const font = (bold: boolean) => doc.setFont(tpl.font, bold ? 'bold' : 'normal')

  const ensure = (col: Col, needed: number): boolean => {
    if (col.y + needed <= PAGE_H - MARGIN) return true
    if (!col.breaks) return false // sidebar: stop instead of spilling onto page 2
    doc.addPage()
    col.y = MARGIN
    return true
  }

  const text = (
    col: Col,
    str: string,
    size: number,
    opts: { bold?: boolean; color?: string; gapAfter?: number; indent?: number; align?: 'left' | 'center' } = {},
  ) => {
    if (!str) return
    font(opts.bold ?? false)
    doc.setFontSize(size)
    doc.setTextColor(opts.color ?? INK)
    const width = col.w - (opts.indent ?? 0)
    const lines: string[] = doc.splitTextToSize(str, width)
    const lineH = size * lh
    for (const line of lines) {
      if (!ensure(col, lineH)) return
      if (opts.align === 'center') doc.text(line, col.x + col.w / 2, col.y, { align: 'center' })
      else doc.text(line, col.x + (opts.indent ?? 0), col.y)
      col.y += lineH
    }
    col.y += opts.gapAfter ?? 0
  }

  const bullet = (col: Col, str: string, size = base) => {
    if (!str) return
    font(false)
    doc.setFontSize(size)
    const lines: string[] = doc.splitTextToSize(str, col.w - 14)
    const lineH = size * lh
    if (!ensure(col, lineH)) return
    doc.setTextColor(tpl.accent ?? INK)
    doc.text('•', col.x + 2, col.y)
    doc.setTextColor(INK)
    for (const line of lines) {
      if (!ensure(col, lineH)) return
      doc.text(line, col.x + 14, col.y)
      col.y += lineH
    }
    col.y += tpl.density === 'compact' ? 1 : 1.5
  }

  const sectionTitle = (col: Col, title: string, small = false) => {
    if (!ensure(col, 34)) return
    col.y += small ? 6 : 8
    font(true)
    doc.setFontSize(small ? 9 : 10.5)
    switch (tpl.sectionStyle) {
      case 'rule':
        doc.setTextColor(INK)
        doc.text(title.toUpperCase(), col.x, col.y, { charSpace: 0.6 })
        col.y += 5
        doc.setDrawColor(LINE)
        doc.setLineWidth(0.7)
        doc.line(col.x, col.y, col.x + col.w, col.y)
        col.y += small ? 11 : 13
        break
      case 'caps':
        doc.setTextColor(INK)
        doc.text(title.toUpperCase(), col.x, col.y, { charSpace: 1.1 })
        col.y += small ? 13 : 16
        break
      case 'accentRule':
        doc.setTextColor(INK)
        doc.text(title.toUpperCase(), col.x, col.y, { charSpace: 0.6 })
        col.y += 4
        doc.setDrawColor(accent)
        doc.setLineWidth(2)
        doc.line(col.x, col.y, col.x + 26, col.y)
        col.y += small ? 11 : 13
        break
      case 'sideRule':
        doc.setFillColor(accent)
        doc.rect(col.x, col.y - 8, 3, 10, 'F')
        doc.setTextColor(INK)
        doc.text(title.toUpperCase(), col.x + 9, col.y, { charSpace: 0.6 })
        col.y += small ? 13 : 16
        break
    }
  }

  // ---- Header (full width, both layouts) ----
  const name = `${profile.identity.firstName} ${profile.identity.lastName}`.trim()
  const contact = [profile.identity.email, profile.identity.phone, profile.identity.location]
    .filter(Boolean)
    .join('  ·  ')
  const links = [profile.links.website, profile.links.github, profile.links.linkedin, profile.links.portfolio]
    .filter(Boolean)
    .join('  ·  ')
  const contactInHeader = tpl.layout === 'single'

  const full: Col = { x: MARGIN, w: PAGE_W - MARGIN * 2, y: MARGIN, breaks: true }

  if (tpl.headerStyle === 'bar') {
    const barH = 74
    doc.setFillColor(accent)
    doc.rect(0, 0, PAGE_W, barH, 'F')
    font(true)
    doc.setFontSize(21)
    doc.setTextColor('#ffffff')
    doc.text(name, MARGIN, 38)
    if (variant.headline) {
      font(false)
      doc.setFontSize(11)
      doc.text(variant.headline, MARGIN, 56)
    }
    full.y = barH + 20
    if (contactInHeader) {
      text(full, contact, 9, { color: SOFT, gapAfter: 1 })
      text(full, links, 9, { color: SOFT, gapAfter: 2 })
    }
  } else {
    const align = tpl.headerStyle === 'centered' ? 'center' : 'left'
    text(full, name, 22, { bold: true, gapAfter: 1, align, color: tpl.accent ?? INK })
    text(full, variant.headline, 11.5, { color: SOFT, gapAfter: 4, align })
    if (contactInHeader) {
      text(full, contact, 9, { color: SOFT, gapAfter: 1, align })
      text(full, links, 9, { color: SOFT, gapAfter: 2, align })
    }
    if (tpl.headerStyle === 'centered') {
      full.y += 2
      doc.setDrawColor(LINE)
      doc.setLineWidth(0.7)
      doc.line(MARGIN, full.y, PAGE_W - MARGIN, full.y)
      full.y += 6
    }
  }

  // ---- Columns ----
  const SIDEBAR_W = 150
  const GAP = 22
  const main: Col =
    tpl.layout === 'sidebar'
      ? { x: MARGIN + SIDEBAR_W + GAP, w: PAGE_W - MARGIN * 2 - SIDEBAR_W - GAP, y: full.y, breaks: true }
      : full
  const sidebarTop = full.y

  // ---- Content sections ----
  const skillsLine = variant.skills.join('  ·  ')
  const languagesLine = profile.languages
    .map((l) => `${l.name} (${l.proficiency.replaceAll('_', ' ')})`)
    .join('  ·  ')

  const summary = () => {
    if (!variant.summary) return
    sectionTitle(main, 'Summary')
    text(main, variant.summary, base, { gapAfter: 2 })
  }
  const highlights = () => {
    if (!variant.highlights.length) return
    sectionTitle(main, 'Highlights')
    for (const h of variant.highlights) bullet(main, h)
  }
  const skills = () => {
    if (!variant.skills.length) return
    sectionTitle(main, 'Skills')
    text(main, skillsLine, base, { gapAfter: 2 })
  }
  const experience = () => {
    const workById = new Map(profile.work.map((w) => [w.id, w]))
    const entries = variant.work.map((v) => ({ v, src: workById.get(v.sourceId) })).filter((e) => e.src)
    if (!entries.length) return
    sectionTitle(main, 'Experience')
    for (const { v, src } of entries) {
      const w = src!
      if (!ensure(main, 30)) return
      const dates = workPeriodLabel(w)
      // Bold role, soft company — two weights read faster than one bold blob.
      font(true)
      doc.setFontSize(base + 1)
      doc.setTextColor(INK)
      const roleLine: string = doc.splitTextToSize(w.title, main.w - 150)[0] ?? ''
      doc.text(roleLine, main.x, main.y)
      const roleW = doc.getTextWidth(roleLine)
      font(false)
      doc.setTextColor(SOFT)
      const companyLine: string = doc.splitTextToSize(` · ${w.company}`, main.w - 86 - roleW)[0] ?? ''
      doc.text(companyLine, main.x + roleW, main.y)
      doc.setFontSize(9)
      doc.text(dates, main.x + main.w, main.y, { align: 'right' })
      main.y += tpl.density === 'compact' ? 13 : 15
      const bullets = v.bullets.length ? v.bullets : w.highlights
      for (const b of bullets) bullet(main, b)
      main.y += tpl.density === 'compact' ? 3 : 5
    }
  }
  const education = () => {
    const eduById = new Map(profile.education.map((e) => [e.id, e]))
    const edus = variant.educationIds.map((id) => eduById.get(id)).filter(Boolean)
    if (!edus.length) return
    sectionTitle(main, 'Education')
    for (const e of edus) {
      if (!ensure(main, 16)) return
      const dates = [e!.startYear, e!.isCurrent ? 'Present' : e!.endYear].filter(Boolean).join(' — ')
      const degreeLine = [e!.degree, e!.fieldOfStudy].filter(Boolean).join(', ')
      font(true)
      doc.setFontSize(base + 0.5)
      doc.setTextColor(INK)
      const line = doc.splitTextToSize(`${degreeLine} · ${e!.school}`, main.w - 76)[0] ?? ''
      doc.text(line, main.x, main.y)
      if (dates) {
        font(false)
        doc.setFontSize(9)
        doc.setTextColor(SOFT)
        doc.text(dates, main.x + main.w, main.y, { align: 'right' })
      }
      main.y += 15
      if (e!.description) text(main, e!.description, 9, { color: SOFT, gapAfter: 3 })
    }
  }
  const certifications = () => {
    if (!profile.certifications.length) return
    sectionTitle(main, 'Certifications')
    for (const c of profile.certifications) {
      bullet(main, [c.name, c.issuingOrganization, c.year].filter(Boolean).join(' · '))
    }
  }
  const languages = () => {
    if (!profile.languages.length) return
    sectionTitle(main, 'Languages')
    text(main, languagesLine, base, { gapAfter: 2 })
  }

  if (tpl.layout === 'sidebar') {
    summary()
    highlights()
    experience()
    education()
  } else if (tpl.skillsFirst) {
    summary()
    skills()
    highlights()
    experience()
    education()
    certifications()
    languages()
  } else {
    summary()
    highlights()
    experience()
    education()
    skills()
    certifications()
    languages()
  }

  // ---- Sidebar (page 1 only, drawn after the main flow) ----
  if (tpl.layout === 'sidebar') {
    doc.setPage(1)
    // Soft tinted panel behind the sidebar — the touch that makes the
    // two-column read as designed rather than merely split.
    doc.setFillColor(pale(accent))
    doc.roundedRect(MARGIN - 12, sidebarTop - 14, SIDEBAR_W + 24, PAGE_H - MARGIN - sidebarTop + 20, 6, 6, 'F')
    const side: Col = { x: MARGIN, w: SIDEBAR_W, y: sidebarTop, breaks: false }
    const sideItem = (label: string, items: string[]) => {
      if (!items.length) return
      sectionTitle(side, label, true)
      for (const item of items) text(side, item, 8.8, { color: INK, gapAfter: 2 })
    }
    const present = (items: (string | undefined)[]): string[] => items.filter((s): s is string => Boolean(s))
    sideItem('Contact', present([profile.identity.email, profile.identity.phone, profile.identity.location]))
    sideItem(
      'Links',
      present([profile.links.website, profile.links.github, profile.links.linkedin, profile.links.portfolio]),
    )
    sideItem('Skills', variant.skills)
    sideItem(
      'Languages',
      profile.languages.map((l) => `${l.name} (${l.proficiency.replaceAll('_', ' ')})`),
    )
    sideItem(
      'Certifications',
      profile.certifications.map((c) => [c.name, c.year].filter(Boolean).join(' · ')),
    )
  }

  // Return base64 (without the data: prefix) for storage.
  const dataUri = doc.output('datauristring')
  return dataUri.split(',')[1]
}

// A full-profile variant (no AI): "everything, master CV".
export function masterVariant(profile: Profile): TailoredResume {
  return {
    label: 'Master CV',
    headline: profile.headline,
    summary: profile.summary,
    highlights: profile.highlights,
    skills: profile.skills.map((s) => s.name),
    work: profile.work.map((w) => ({ sourceId: w.id, bullets: w.highlights })),
    educationIds: profile.education.map((e) => e.id),
  }
}
