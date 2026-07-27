// Identity-blind view of the profile for scoring — cuee's contentRedacted
// idea, done deterministically since our profile is already structured:
// no name/email/phone/photo, no exact dates (duration buckets instead,
// so age can't be inferred), no institution names (type only).

import { Profile, durationInMonths } from '../../../lib/types'

function durationBucket(months: number | null): string {
  if (months === null) return 'unknown duration'
  if (months < 12) return '<1 year'
  if (months < 24) return '1-2 years'
  if (months < 48) return '2-4 years'
  if (months < 84) return '4-7 years'
  return '7+ years'
}

export function redactedProfileForScoring(p: Profile) {
  return {
    headline: p.headline,
    summary: p.summary,
    highlights: p.highlights,
    industries: p.industries,
    skills: p.skills,
    experiences: p.work.map((w) => ({
      title: w.title,
      // company kept — it signals domain, not identity
      company: w.company,
      contractType: w.contractType,
      duration: durationBucket(durationInMonths(w)),
      isCurrent: w.isCurrent,
      skills: w.skills,
      highlights: w.highlights,
    })),
    education: p.education.map((e) => ({
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      // institution name dropped on purpose (prestige bias)
      description: e.description,
    })),
    certifications: p.certifications.map((c) => ({ name: c.name, issuingOrganization: c.issuingOrganization })),
    languages: p.languages,
  }
}
