// Additive-only profile merging for enrichment facts (CV uploads, tailor notes).
// Nothing is ever overwritten: skills/languages/certifications are added when
// missing, link slots fill only if empty. Pure — callers persist the result.

import { ProfileEnrichment } from '../ai/capabilities/enrich-profile'
import { Profile, WorkEntry, uid } from './types'

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

