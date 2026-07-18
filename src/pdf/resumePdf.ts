// Profile/tailored JSON -> one simple, ATS-friendly, top-to-bottom PDF.
// Deterministic: no AI here. Single column, standard fonts, real text
// (parses cleanly in every ATS resume parser).

import { jsPDF } from 'jspdf'
import { Profile, TailoredResume } from '../lib/types'

const PAGE_W = 595.28 // A4 points
const PAGE_H = 841.89
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2

const COLORS = {
  ink: '#111827',
  soft: '#4b5563',
  line: '#d1d5db',
}

export function renderResumePdf(profile: Profile, variant: TailoredResume): string {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = MARGIN

  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
  }

  const text = (
    str: string,
    size: number,
    opts: { bold?: boolean; color?: string; gapAfter?: number; indent?: number } = {},
  ) => {
    if (!str) return
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(opts.color ?? COLORS.ink)
    const width = CONTENT_W - (opts.indent ?? 0)
    const lines: string[] = doc.splitTextToSize(str, width)
    const lineH = size * 1.35
    for (const line of lines) {
      ensure(lineH)
      doc.text(line, MARGIN + (opts.indent ?? 0), y)
      y += lineH
    }
    y += opts.gapAfter ?? 0
  }

  const bullet = (str: string, size = 9.5) => {
    if (!str) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(COLORS.ink)
    const lines: string[] = doc.splitTextToSize(str, CONTENT_W - 14)
    const lineH = size * 1.35
    ensure(lineH)
    doc.text('•', MARGIN + 2, y)
    for (const line of lines) {
      ensure(lineH)
      doc.text(line, MARGIN + 14, y)
      y += lineH
    }
    y += 1.5
  }

  const sectionTitle = (title: string) => {
    ensure(34)
    y += 8
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10.5)
    doc.setTextColor(COLORS.ink)
    doc.text(title.toUpperCase(), MARGIN, y)
    y += 5
    doc.setDrawColor(COLORS.line)
    doc.setLineWidth(0.7)
    doc.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 13
  }

  // ---- Header ----
  const name = `${profile.identity.firstName} ${profile.identity.lastName}`.trim()
  text(name, 21, { bold: true, gapAfter: 1 })
  text(variant.headline, 11.5, { color: COLORS.soft, gapAfter: 4 })

  const contact = [profile.identity.email, profile.identity.phone, profile.identity.location]
    .filter(Boolean)
    .join('  ·  ')
  text(contact, 9, { color: COLORS.soft, gapAfter: 1 })
  const links = [profile.links.website, profile.links.github, profile.links.linkedin, profile.links.portfolio]
    .filter(Boolean)
    .join('  ·  ')
  text(links, 9, { color: COLORS.soft, gapAfter: 2 })

  // ---- Summary ----
  if (variant.summary) {
    sectionTitle('Summary')
    text(variant.summary, 9.5, { gapAfter: 2 })
  }

  // ---- Highlights ----
  if (variant.highlights.length) {
    sectionTitle('Highlights')
    for (const h of variant.highlights) bullet(h)
  }

  // ---- Skills ----
  if (variant.skills.length) {
    sectionTitle('Skills')
    text(variant.skills.join('  ·  '), 9.5, { gapAfter: 2 })
  }

  // ---- Experience ----
  const workById = new Map(profile.work.map((w) => [w.id, w]))
  const entries = variant.work.map((v) => ({ v, src: workById.get(v.sourceId) })).filter((e) => e.src)
  if (entries.length) {
    sectionTitle('Experience')
    for (const { v, src } of entries) {
      const w = src!
      ensure(30)
      const dates = `${w.from} — ${w.to || 'Present'}`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(COLORS.ink)
      doc.text(`${w.title} · ${w.company}`, MARGIN, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(COLORS.soft)
      doc.text(dates, PAGE_W - MARGIN, y, { align: 'right' })
      y += 15
      const bullets = v.bullets.length ? v.bullets : w.highlights
      for (const b of bullets) bullet(b)
      y += 5
    }
  }

  // ---- Education ----
  const eduById = new Map(profile.education.map((e) => [e.id, e]))
  const edus = variant.educationIds.map((id) => eduById.get(id)).filter(Boolean)
  if (edus.length) {
    sectionTitle('Education')
    for (const e of edus) {
      ensure(16)
      const dates = [e!.from, e!.to].filter(Boolean).join(' — ')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(COLORS.ink)
      doc.text(`${e!.degree} · ${e!.school}`, MARGIN, y)
      if (dates) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(9)
        doc.setTextColor(COLORS.soft)
        doc.text(dates, PAGE_W - MARGIN, y, { align: 'right' })
      }
      y += 15
    }
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
    highlights: [],
    skills: profile.skills,
    work: profile.work.map((w) => ({ sourceId: w.id, bullets: w.highlights })),
    educationIds: profile.education.map((e) => e.id),
  }
}
