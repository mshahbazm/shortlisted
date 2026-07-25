// Additive-only profile merging for enrichment facts (CV uploads, tailor notes).
// Nothing is ever overwritten: skills/languages/certifications are added when
// missing, link slots fill only if empty. Pure — callers persist the result.

import { ProfileEnrichment } from '../ai/contract'
import {
  CertificationEntry,
  EducationEntry,
  LanguageEntry,
  Profile,
  ProfileLinks,
  SkillEntry,
  WorkEntry,
  uid,
} from './types'

// Best-effort ISO codes for languages a candidate plausibly names.
const LANG_CODES: Record<string, string> = {
  english: 'en', dutch: 'nl', german: 'de', french: 'fr', spanish: 'es', italian: 'it',
  portuguese: 'pt', polish: 'pl', urdu: 'ur', hindi: 'hi', arabic: 'ar', chinese: 'zh',
  mandarin: 'zh', japanese: 'ja', korean: 'ko', russian: 'ru', turkish: 'tr', punjabi: 'pa',
}
const PROFICIENCIES = ['elementary', 'limited_working', 'professional_working', 'full_professional', 'native_bilingual']

export interface EnrichmentMergeResult {
  profile: Profile
  /** Facts that actually landed. Never the count the model proposed. */
  applied: number
  /**
   * Highlights the model tied to a job that isn't on file. There is no way to
   * store these — a highlight needs an existing work entry to hang from — so
   * before, they vanished while the UI still reported them as saved.
   */
  unplacedHighlights: number
  /** Companies added as new work entries, for telling the user what happened. */
  addedWork: string[]
  /** Of those, the ones missing a title or a start date (see needsCompletion). */
  incompleteWork: string[]
}

export function mergeEnrichment(p: Profile, facts: ProfileEnrichment): EnrichmentMergeResult {
  const has = (list: { name: string }[], name: string) =>
    list.some((x) => x.name.toLowerCase() === name.toLowerCase())

  const freshSkills = facts.newSkills.filter((n) => n.trim() && !has(p.skills, n))
  const freshLanguages = facts.newLanguages.filter((l) => l.name.trim() && !has(p.languages, l.name))
  const freshCertifications = facts.newCertifications.filter((c) => c.name.trim() && !has(p.certifications, c.name))

  const linkKeys = ['website', 'github', 'linkedin', 'portfolio'] as const
  const filledLinks = linkKeys.filter((k) => !p.links[k] && facts.newLinks[k])

  const knownWorkIds = new Set(p.work.map((w) => w.id))
  const placeable = facts.newWorkHighlights.filter((h) => h.bullet.trim())
  const unplacedHighlights = placeable.filter((h) => !knownWorkIds.has(h.workId)).length

  // Employers the candidate named that aren't on file yet. Matched by company
  // name so a second mention lands on the same entry rather than duplicating,
  // and so a model that ignores the case-insensitive rule can't create "Acme"
  // alongside "acme".
  const byCompany = new Map(p.work.map((w) => [w.company.toLowerCase().trim(), w]))
  const freshWork: WorkEntry[] = []
  const extraHighlights = new Map<string, string[]>()
  for (const nw of facts.newWork ?? []) {
    const company = (nw.company ?? '').trim()
    if (!company) continue
    const bullets = (nw.highlights ?? []).map((b) => b.trim()).filter(Boolean)
    const existing = byCompany.get(company.toLowerCase())
    if (existing) {
      // Already on file: treat it as highlights for that job, not a duplicate.
      if (bullets.length) extraHighlights.set(existing.id, [...(extraHighlights.get(existing.id) ?? []), ...bullets])
      continue
    }
    const entry: WorkEntry = {
      id: uid(),
      company,
      title: (nw.title ?? '').trim(),
      startYear: nw.startYear,
      startMonth: nw.startMonth,
      endYear: nw.endYear,
      endMonth: nw.endMonth,
      isCurrent: nw.isCurrent === true,
      skills: [],
      highlights: bullets,
    }
    freshWork.push(entry)
    byCompany.set(company.toLowerCase(), entry)
  }

  let mergedHighlights = 0
  const work = [
    ...p.work.map((w) => {
      const fresh = [
        ...placeable.filter((h) => h.workId === w.id).map((h) => h.bullet.trim()),
        ...(extraHighlights.get(w.id) ?? []),
      ].filter((b) => !w.highlights.some((x) => x.toLowerCase() === b.toLowerCase()))
      if (!fresh.length) return w
      mergedHighlights += fresh.length
      return { ...w, highlights: [...w.highlights, ...fresh] }
    }),
    ...freshWork,
  ]

  const profile: Profile = {
    ...p,
    skills: [...p.skills, ...freshSkills.map((name) => ({ name: name.trim() }))],
    links: {
      ...p.links,
      website: p.links.website || facts.newLinks.website || undefined,
      github: p.links.github || facts.newLinks.github || undefined,
      linkedin: p.links.linkedin || facts.newLinks.linkedin || undefined,
      portfolio: p.links.portfolio || facts.newLinks.portfolio || undefined,
    },
    languages: [
      ...p.languages,
      ...freshLanguages.map((l) => ({
        langCode: LANG_CODES[l.name.trim().toLowerCase()] ?? '',
        name: l.name.trim(),
        proficiency: (PROFICIENCIES.includes(l.proficiency ?? '')
          ? l.proficiency
          : 'professional_working') as Profile['languages'][number]['proficiency'],
      })),
    ],
    certifications: [
      ...p.certifications,
      ...freshCertifications.map((c) => ({
        name: c.name.trim(),
        issuingOrganization: c.issuingOrganization,
        year: c.year,
      })),
    ],
    work,
  }

  return {
    profile,
    applied:
      freshSkills.length +
      freshLanguages.length +
      freshCertifications.length +
      filledLinks.length +
      mergedHighlights +
      freshWork.length,
    unplacedHighlights,
    addedWork: freshWork.map((w) => w.company),
    incompleteWork: freshWork.filter(needsCompletion).map((w) => w.company),
  }
}

/**
 * A job we created from a sentence rather than a CV: the candidate said where
 * they worked but not as what, or when. Derived, never stored — the entry
 * stops being incomplete the moment the missing fields are filled in, with no
 * flag to keep in step.
 *
 * This matters beyond tidiness: a role with no dates and no title reads as a
 * gap on a tailored CV, so it has to be visible in the Work list rather than
 * sitting there looking finished.
 */
export function needsCompletion(w: WorkEntry): boolean {
  return !w.title.trim() || (!w.startYear && !w.isCurrent)
}

/** Merge and keep only the profile — for callers that don't report back. */
export function applyEnrichment(p: Profile, facts: ProfileEnrichment): Profile {
  return mergeEnrichment(p, facts).profile
}

// ---------- re-import "learn more about me": itemized additive delta ----------
//
// The merge door parses a whole fresh Profile from the uploaded CV, then diffs it
// against what's on file to surface ONLY what's new — grouped by category, each
// item individually removable in the review screen. Identity, facts and the
// curated scalar fields (headline / summary / aboutCandidate / profile-level
// highlights) are deliberately NOT part of this: "learn more" adds things the
// user doesn't have, it never rewrites what they set themselves.

/** New highlights the CV adds to a role the profile ALREADY has (matched by
 *  company), kept apart from brand-new roles so the review can show them as
 *  "more about a job you already listed" rather than a duplicate role. */
export interface WorkHighlightAddition {
  workId: string
  company: string
  highlights: string[]
}

/** Everything new a re-imported CV offers, per category. Each entry carries a
 *  stable key (work/education `id`, name, or link slot) so the review screen can
 *  remove one item without disturbing the rest. */
export interface ProfileDelta {
  work: WorkEntry[]
  workHighlights: WorkHighlightAddition[]
  education: EducationEntry[]
  skills: SkillEntry[]
  languages: LanguageEntry[]
  certifications: CertificationEntry[]
  links: Partial<ProfileLinks>
  industries: string[]
}

const LINK_SLOTS = ['website', 'github', 'linkedin', 'portfolio', 'other'] as const

/** Total new items across every category — the true count for the review header
 *  (0 means the CV held nothing the profile didn't already have). */
export function deltaCount(d: ProfileDelta): number {
  return (
    d.work.length +
    d.workHighlights.reduce((n, h) => n + h.highlights.length, 0) +
    d.education.length +
    d.skills.length +
    d.languages.length +
    d.certifications.length +
    Object.keys(d.links).length +
    d.industries.length
  )
}

/** Only what `extracted` adds over `existing`, deduped case-insensitively both
 *  against the profile and within the extracted list itself. Pure. */
export function diffProfile(existing: Profile, extracted: Profile): ProfileDelta {
  // Name-keyed categories: skip anything already on file or seen earlier in the
  // extracted list (an extractor can repeat a skill/cert/language).
  const dedupByName = <X extends { name: string }>(items: X[], have: { name: string }[]): X[] => {
    const seen = new Set(have.map((x) => x.name.toLowerCase().trim()))
    const out: X[] = []
    for (const it of items) {
      const key = it.name.toLowerCase().trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(it)
    }
    return out
  }

  const skills = dedupByName(extracted.skills, existing.skills)
  const languages = dedupByName(extracted.languages, existing.languages)
  const certifications = dedupByName(extracted.certifications, existing.certifications)

  // Industries are bare strings.
  const seenInd = new Set(existing.industries.map((i) => i.toLowerCase().trim()))
  const industries: string[] = []
  for (const raw of extracted.industries) {
    const key = raw.toLowerCase().trim()
    if (!key || seenInd.has(key)) continue
    seenInd.add(key)
    industries.push(raw.trim())
  }

  // Work: match by company (case-insensitive). A known company folds its new
  // bullets into that role rather than duplicating it; an unknown one becomes a
  // new role — and is added to the map so a second mention of the same new
  // company lands on it too (mirrors mergeEnrichment).
  const byCompany = new Map(existing.work.map((w) => [w.company.toLowerCase().trim(), w]))
  const newIds = new Set<string>()
  const work: WorkEntry[] = []
  const hlMap = new Map<string, { company: string; highlights: string[] }>()
  for (const w of extracted.work) {
    const key = w.company.toLowerCase().trim()
    const match = key ? byCompany.get(key) : undefined
    const bullets = (w.highlights ?? []).map((b) => b.trim()).filter(Boolean)
    if (match) {
      const fresh = bullets.filter((b) => !match.highlights.some((x) => x.toLowerCase() === b.toLowerCase()))
      if (!fresh.length) continue
      if (newIds.has(match.id)) {
        // The "existing" role is one we just created this pass — append directly
        // (`fresh` is already deduped against its current highlights).
        match.highlights.push(...fresh)
      } else {
        const cur = hlMap.get(match.id) ?? { company: match.company, highlights: [] }
        for (const b of fresh) if (!cur.highlights.some((x) => x.toLowerCase() === b.toLowerCase())) cur.highlights.push(b)
        hlMap.set(match.id, cur)
      }
      continue
    }
    if (!key && !w.title.trim()) continue // nothing to identify this role by
    const entry: WorkEntry = { ...w, id: uid(), highlights: bullets }
    work.push(entry)
    newIds.add(entry.id)
    if (key) byCompany.set(key, entry)
  }
  const workHighlights: WorkHighlightAddition[] = [...hlMap.entries()].map(([workId, v]) => ({
    workId,
    company: v.company,
    highlights: v.highlights,
  }))

  // Education: match on school + degree together (either alone is too coarse).
  const eduKey = (e: { school: string; degree: string }) =>
    `${e.school.toLowerCase().trim()}|${e.degree.toLowerCase().trim()}`
  const seenEdu = new Set(existing.education.map(eduKey))
  const education: EducationEntry[] = []
  for (const e of extracted.education) {
    if (!e.school.trim() && !e.degree.trim()) continue
    const key = eduKey(e)
    if (seenEdu.has(key)) continue
    seenEdu.add(key)
    education.push({ ...e, id: uid() })
  }

  // Links: fill an empty slot only — never overwrite a link the user set.
  const links: Partial<ProfileLinks> = {}
  for (const slot of LINK_SLOTS) {
    const val = extracted.links[slot]?.trim()
    if (val && !existing.links[slot]) links[slot] = val
  }

  return { work, workHighlights, education, skills, languages, certifications, links, industries }
}

/** Fold a (user-trimmed) delta into the profile, additively. Never touches
 *  identity, facts, or the curated scalar fields. Pure — the caller persists. */
export function applyProfileDelta(p: Profile, d: ProfileDelta): Profile {
  const hlByWork = new Map<string, string[]>()
  for (const h of d.workHighlights) hlByWork.set(h.workId, [...(hlByWork.get(h.workId) ?? []), ...h.highlights])

  // The delta was diffed against the profile the SERVER loaded; by apply time the
  // client profile can differ (a role added since, not yet synced). Re-check each
  // new role against the CURRENT profile by company, so a race can't create a
  // duplicate role — fold its highlights into the existing one instead.
  const byCompany = new Map(p.work.map((w) => [w.company.toLowerCase().trim(), w]))
  const freshWork: WorkEntry[] = []
  for (const nw of d.work) {
    const key = nw.company.toLowerCase().trim()
    const match = key ? byCompany.get(key) : undefined
    if (match) {
      hlByWork.set(match.id, [...(hlByWork.get(match.id) ?? []), ...nw.highlights])
    } else {
      freshWork.push(nw)
      if (key) byCompany.set(key, nw)
    }
  }

  const work = p.work.map((w) => {
    const add = hlByWork.get(w.id)
    if (!add?.length) return w
    const fresh = add.filter((b) => !w.highlights.some((x) => x.toLowerCase() === b.toLowerCase()))
    return fresh.length ? { ...w, highlights: [...w.highlights, ...fresh] } : w
  })

  return {
    ...p,
    skills: [...p.skills, ...d.skills],
    languages: [...p.languages, ...d.languages],
    certifications: [...p.certifications, ...d.certifications],
    education: [...p.education, ...d.education],
    industries: [...p.industries, ...d.industries],
    links: { ...p.links, ...d.links },
    work: [...work, ...freshWork],
  }
}

