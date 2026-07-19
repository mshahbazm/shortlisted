// Additive-only profile merging for intake facts (CV uploads, tailor notes).
// Nothing is ever overwritten: skills/languages/certifications are added when
// missing, link slots fill only if empty. Pure — callers persist the result.

import { IntakeNewFacts } from '../ai/capabilities/resume-intake'
import { Profile } from './types'

// Best-effort ISO codes for languages a candidate plausibly names.
const LANG_CODES: Record<string, string> = {
  english: 'en', dutch: 'nl', german: 'de', french: 'fr', spanish: 'es', italian: 'it',
  portuguese: 'pt', polish: 'pl', urdu: 'ur', hindi: 'hi', arabic: 'ar', chinese: 'zh',
  mandarin: 'zh', japanese: 'ja', korean: 'ko', russian: 'ru', turkish: 'tr', punjabi: 'pa',
}
const PROFICIENCIES = ['elementary', 'limited_working', 'professional_working', 'full_professional', 'native_bilingual']

export function applyIntakeFacts(p: Profile, facts: IntakeNewFacts): Profile {
  const has = (list: { name: string }[], name: string) =>
    list.some((x) => x.name.toLowerCase() === name.toLowerCase())
  return {
    ...p,
    skills: [
      ...p.skills,
      ...facts.newSkills.filter((n) => n.trim() && !has(p.skills, n)).map((name) => ({ name: name.trim() })),
    ],
    links: {
      ...p.links,
      website: p.links.website || facts.newLinks.website || undefined,
      github: p.links.github || facts.newLinks.github || undefined,
      linkedin: p.links.linkedin || facts.newLinks.linkedin || undefined,
      portfolio: p.links.portfolio || facts.newLinks.portfolio || undefined,
    },
    languages: [
      ...p.languages,
      ...facts.newLanguages
        .filter((l) => l.name.trim() && !has(p.languages, l.name))
        .map((l) => ({
          langCode: LANG_CODES[l.name.trim().toLowerCase()] ?? '',
          name: l.name.trim(),
          proficiency: (PROFICIENCIES.includes(l.proficiency ?? '')
            ? l.proficiency
            : 'professional_working') as Profile['languages'][number]['proficiency'],
        })),
    ],
    certifications: [
      ...p.certifications,
      ...facts.newCertifications
        .filter((c) => c.name.trim() && !has(p.certifications, c.name))
        .map((c) => ({ name: c.name.trim(), issuingOrganization: c.issuingOrganization, year: c.year })),
    ],
    work: p.work.map((w) => {
      const fresh = facts.newWorkHighlights
        .filter((h) => h.workId === w.id && h.bullet.trim())
        .map((h) => h.bullet.trim())
        .filter((b) => !w.highlights.some((x) => x.toLowerCase() === b.toLowerCase()))
      return fresh.length ? { ...w, highlights: [...w.highlights, ...fresh] } : w
    }),
  }
}

/** How many facts a merge would add — for user-facing confirmations. */
export function countIntakeFacts(facts: IntakeNewFacts): number {
  return (
    facts.newSkills.length +
    facts.newLanguages.length +
    facts.newCertifications.length +
    facts.newWorkHighlights.length +
    Object.values(facts.newLinks).filter(Boolean).length
  )
}
