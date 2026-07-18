import { Profile } from '../lib/types'

// Deterministic label -> profile value mapping. This covers ~80% of every ATS
// form with zero AI. Order matters: first match wins.

interface Rule {
  test: RegExp
  value: (p: Profile) => string | undefined
}

const RULES: Rule[] = [
  { test: /first\s*name|given\s*name/i, value: (p) => p.identity.firstName },
  { test: /last\s*name|family\s*name|surname/i, value: (p) => p.identity.lastName },
  {
    test: /full\s*name|^name\b|your\s*name|legal\s*name/i,
    value: (p) => [p.identity.firstName, p.identity.lastName].filter(Boolean).join(' ') || undefined,
  },
  { test: /e-?mail/i, value: (p) => p.identity.email },
  { test: /phone|mobile|contact\s*number/i, value: (p) => p.identity.phone },
  { test: /linked\s*in/i, value: (p) => p.links.linkedin },
  { test: /git\s*hub/i, value: (p) => p.links.github },
  { test: /portfolio|work\s*samples/i, value: (p) => p.links.portfolio ?? p.links.website },
  { test: /website|personal\s*site|blog|url/i, value: (p) => p.links.website ?? p.links.portfolio },
  { test: /current\s*(city|location)|city\b/i, value: (p) => p.identity.city ?? p.identity.location },
  { test: /country/i, value: (p) => p.identity.country },
  { test: /location|where.*(based|located|live)/i, value: (p) => p.identity.location },
  { test: /pronoun/i, value: (p) => p.identity.pronouns },
  { test: /current\s*(title|role|position)|job\s*title/i, value: (p) => p.headline },
  { test: /current\s*(company|employer)/i, value: (p) => p.work[0]?.company },
  {
    test: /salary|compensation|rate\s*expectation|expected\s*(pay|ctc)|desired\s*(pay|salary)/i,
    value: (p) => p.facts.salaryExpectation,
  },
  { test: /notice\s*period|how\s*soon|earliest.*start|start\s*date|available|availability/i, value: (p) => p.facts.noticePeriod },
  { test: /time\s*zone/i, value: (p) => p.facts.timezone },
  { test: /years?\s*(of)?\s*experience|how\s*long.*(working|experience)/i, value: (p) => p.facts.yearsOfExperience },
  { test: /sponsor(ship)?|visa/i, value: (p) => p.facts.needsSponsorship },
  { test: /authori[sz]ed?\s*to\s*work|work\s*authori[sz]ation|legally\s*(able|entitled)/i, value: (p) => p.facts.authorizedCountries },
  { test: /relocat/i, value: (p) => p.facts.relocation },
  { test: /overlap|working\s*hours/i, value: (p) => p.facts.hoursOverlap },
  { test: /english/i, value: (p) => p.facts.englishLevel },
  { test: /skills|technologies|tech\s*stack/i, value: (p) => (p.skills.length ? p.skills.join(', ') : undefined) },
  { test: /how\s*did\s*you\s*(hear|find)|referral\s*source|source\b/i, value: () => undefined }, // let bank handle it
]

export function profileValueFor(label: string, profile: Profile): string | undefined {
  if (!label) return undefined
  for (const rule of RULES) {
    if (rule.test.test(label)) {
      const v = rule.value(profile)
      if (v && v.trim()) return v.trim()
      return undefined // matched a known field but profile has no value -> don't fall through
    }
  }
  return undefined
}

// Labels that identify the resume/CV upload field.
export const RESUME_FILE_RE = /resume|\bcv\b|curriculum/i
export const COVER_LETTER_FILE_RE = /cover\s*letter/i

// Fields we should never auto-answer (legal/demographic surveys). Captured as
// questions instead so the user decides once.
export const DEMOGRAPHIC_RE = /gender|race|ethnic|veteran|disabilit|orientation|hispanic|latin/i
