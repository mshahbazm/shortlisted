// Onboarding capability: CV text -> structured profile (v2).
// Schema and prompt patterns adopted from the cuee ATS production resume
// pipeline: isResume gate, split integer dates, enum coercion, per-experience
// skills, 3-highlight semantics, industries, aboutCandidate, the
// address-signals-only phone rule, and [SECTION:] markers. Durations are
// computed in code, never trusted from the model.

import {
  CertificationEntry,
  EducationEntry,
  LanguageEntry,
  Profile,
  SkillEntry,
  WorkEntry,
  emptyProfile,
  uid,
} from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'

interface XWork {
  title: string
  companyName: string
  companyUrl?: string | null
  location?: string | null
  contractType?: string | null
  startMonth?: number | null
  startYear?: number | null
  endMonth?: number | null
  endYear?: number | null
  isCurrentPosition?: boolean
  skills?: string[]
  highlights?: string[]
}

interface ExtractedProfile {
  isResume: boolean
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  city?: string | null
  country?: string | null
  headline: string
  summary: string
  aboutCandidate?: string | null
  highlights?: string[]
  industries?: string[]
  skills?: { name: string; proficiency?: string | null; category?: string | null }[]
  links?: { website?: string; github?: string; linkedin?: string; portfolio?: string }
  experiences?: XWork[]
  educations?: {
    degree: string
    institution: string
    fieldOfStudy?: string | null
    gpa?: string | null
    description?: string | null
    startYear?: number | null
    endYear?: number | null
    isCurrentlyStudying?: boolean
  }[]
  languages?: { langCode: string; name: string; proficiency: string }[]
  certifications?: { name: string; issuingOrganization?: string | null; year?: number | null }[]
}

const schema = {
  type: 'object',
  required: ['isResume', 'firstName', 'lastName', 'email', 'phone', 'location', 'headline', 'summary', 'experiences', 'educations', 'skills'],
  properties: {
    isResume: { type: 'boolean', description: 'false if this text is NOT a resume/CV — then leave everything else empty' },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    location: { type: 'string' },
    city: { type: 'string' },
    country: { type: 'string', description: '2-letter ISO code, only if stated or clearly implied by address' },
    headline: { type: 'string', description: 'current or most recent title' },
    summary: { type: 'string' },
    aboutCandidate: {
      type: 'string',
      description: 'one keyword-rich factual sentence for search, e.g. "backend engineer with fintech and LLM-agent experience" — facts only, no evaluation',
    },
    highlights: {
      type: 'array', items: { type: 'string' }, maxItems: 3,
      description: 'EXACTLY 3 recruiter-scannable bullets, each under 12 words: (1) core expertise, (2) seniority signal, (3) top measurable achievement',
    },
    industries: { type: 'array', items: { type: 'string' }, description: 'verticals inferred from company history: FinTech, Healthcare, SaaS…' },
    skills: {
      type: 'array',
      items: {
        type: 'object', required: ['name'],
        properties: {
          name: { type: 'string' },
          proficiency: { type: 'string', enum: ['basic', 'intermediate', 'advanced', 'expert'] },
          category: { type: 'string', enum: ['primary', 'secondary'] },
        },
      },
    },
    links: {
      type: 'object',
      properties: { website: { type: 'string' }, github: { type: 'string' }, linkedin: { type: 'string' }, portfolio: { type: 'string' } },
    },
    experiences: {
      type: 'array',
      items: {
        type: 'object', required: ['title', 'companyName'],
        properties: {
          title: { type: 'string' },
          companyName: { type: 'string' },
          companyUrl: { type: 'string' },
          location: { type: 'string' },
          contractType: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'freelance', 'internship', 'temporary'] },
          startMonth: { type: 'integer', minimum: 1, maximum: 12 },
          startYear: { type: 'integer' },
          endMonth: { type: 'integer', minimum: 1, maximum: 12 },
          endYear: { type: 'integer' },
          isCurrentPosition: { type: 'boolean' },
          skills: { type: 'array', items: { type: 'string' }, description: 'tech used in THIS role' },
          highlights: { type: 'array', items: { type: 'string' }, description: 'achievement bullets, copied faithfully' },
        },
      },
    },
    educations: {
      type: 'array',
      items: {
        type: 'object', required: ['degree', 'institution'],
        properties: {
          degree: { type: 'string' }, institution: { type: 'string' }, fieldOfStudy: { type: 'string' },
          gpa: { type: 'string' }, description: { type: 'string', description: 'honors, thesis, activities' },
          startYear: { type: 'integer' }, endYear: { type: 'integer' }, isCurrentlyStudying: { type: 'boolean' },
        },
      },
    },
    languages: {
      type: 'array',
      items: {
        type: 'object', required: ['langCode', 'name', 'proficiency'],
        properties: {
          langCode: { type: 'string', description: '2-letter ISO' },
          name: { type: 'string' },
          proficiency: { type: 'string', enum: ['elementary', 'limited_working', 'professional_working', 'full_professional', 'native_bilingual'] },
        },
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object', required: ['name'],
        properties: { name: { type: 'string' }, issuingOrganization: { type: 'string' }, year: { type: 'integer' } },
      },
    },
  },
} as const

const FEW_SHOT = `Example output for a short sample resume:
{"isResume":true,"firstName":"Alex","lastName":"Chen","email":"alex@chen.dev","phone":"+1 415 555 0100",
"location":"San Francisco, CA","city":"San Francisco","country":"US","headline":"Senior Backend Engineer",
"summary":"Backend engineer focused on payment infrastructure.",
"aboutCandidate":"senior backend engineer with payments, Go and Postgres experience at fintech scale",
"highlights":["8 years building payment infrastructure","Led a team of 5 engineers","Cut settlement latency 40%"],
"industries":["FinTech"],
"skills":[{"name":"Go","proficiency":"expert","category":"primary"},{"name":"Postgres","proficiency":"advanced","category":"primary"},{"name":"Docker","proficiency":"intermediate","category":"secondary"}],
"links":{"github":"https://github.com/alexchen"},
"experiences":[{"title":"Senior Backend Engineer","companyName":"Paylane","contractType":"full_time",
"startMonth":3,"startYear":2021,"isCurrentPosition":true,"skills":["Go","Postgres"],
"highlights":["Cut settlement latency 40% by rewriting the ledger pipeline","Led a team of 5"]}],
"educations":[{"degree":"BSc","institution":"UC Davis","fieldOfStudy":"Computer Science","startYear":2012,"endYear":2016}],
"languages":[{"langCode":"en","name":"English","proficiency":"native_bilingual"}],
"certifications":[{"name":"AWS Solutions Architect","issuingOrganization":"AWS","year":2022}]}`

const SYSTEM_PROMPT =
  `You are Shortlisted's resume parser. Transform raw CV/resume text into strictly structured JSON.\n` +
  `First decide: is this actually a resume/CV? If not, set isResume=false and leave everything else empty.\n` +
  `Rules:\n` +
  `- TRUTH ONLY: copy facts as written; never embellish or invent. Missing optional data -> omit or null. ` +
  `Required strings with no data -> "Unknown".\n` +
  `- Dates: split into integer month (1-12) and year. "Jan 2020" -> startMonth:1, startYear:2020. ` +
  `Year-only dates: omit the month. Never output Date objects or date strings.\n` +
  `- Enums exactly as listed: "full_time", NOT "Full-Time". Seniority adjectives map to proficiency ` +
  `(Senior/Lead usage implies advanced/expert).\n` +
  `- skills: the global list with proficiency + category (primary = core to their profession). ` +
  `ALSO list per-experience skills on each role where the text supports it.\n` +
  `- highlights: EXACTLY 3 bullets, each under 12 words: core expertise / seniority signal / top measurable achievement.\n` +
  `- Phone: keep the country prefix if written. If there is NO prefix, infer the country ONLY from explicit ` +
  `address/location text. Do NOT infer from the resume's language, the person's name, or where they studied — ` +
  `these are unreliable. No confident address signal -> keep the number exactly as written.\n` +
  `- The text may contain [SECTION: …] markers we injected to help segmentation — never copy them into output.\n\n` +
  FEW_SHOT

export async function extractProfile(client: LlmClient, cvText: string): Promise<Profile> {
  const pass = await runJsonPass<ExtractedProfile>(
    {
      client,
      systemPrompt: SYSTEM_PROMPT,
      input: prepareCvText(cvText),
      schema,
      schemaName: 'ExtractedProfile',
      maxTokens: 8000,
    },
    (p) => {
      if (typeof p.isResume !== 'boolean') return 'isResume must be a boolean.'
      if (p.isResume && !Array.isArray(p.experiences)) return 'experiences must be an array.'
      return null
    },
  )
  if (!pass.value) throw new Error('Could not read that CV text. Try pasting the plain text of your resume.')
  const x = pass.value
  if (!x.isResume) {
    throw new Error("That text doesn't look like a resume/CV. Paste your actual resume and try again.")
  }

  const CONTRACT = new Set(['full_time', 'part_time', 'contract', 'freelance', 'internship', 'temporary'])
  const SKILL_PROF = new Set(['basic', 'intermediate', 'advanced', 'expert'])
  const LANG_PROF = new Set(['elementary', 'limited_working', 'professional_working', 'full_professional', 'native_bilingual'])

  const profile = emptyProfile()
  profile.identity = {
    firstName: x.firstName ?? '',
    lastName: x.lastName ?? '',
    email: (x.email ?? '').toLowerCase().trim(),
    phone: x.phone ?? '',
    location: x.location ?? '',
    city: x.city ?? undefined,
    country: x.country ?? undefined,
  }
  profile.headline = x.headline ?? ''
  profile.summary = x.summary ?? ''
  profile.aboutCandidate = x.aboutCandidate ?? undefined
  profile.highlights = (x.highlights ?? []).slice(0, 3)
  profile.industries = x.industries ?? []
  profile.links = x.links ?? {}
  profile.skills = (x.skills ?? [])
    .filter((s) => s?.name)
    .map(
      (s): SkillEntry => ({
        name: s.name,
        proficiency: SKILL_PROF.has(s.proficiency ?? '') ? (s.proficiency as SkillEntry['proficiency']) : undefined,
        category: s.category === 'primary' || s.category === 'secondary' ? s.category : undefined,
      }),
    )
  profile.work = (x.experiences ?? []).map(
    (w): WorkEntry => ({
      id: uid(),
      company: w.companyName ?? 'Unknown',
      companyUrl: w.companyUrl ?? undefined,
      title: w.title ?? 'Unknown',
      location: w.location ?? undefined,
      contractType: CONTRACT.has(w.contractType ?? '') ? (w.contractType as WorkEntry['contractType']) : undefined,
      startMonth: w.startMonth ?? undefined,
      startYear: w.startYear ?? undefined,
      endMonth: w.endMonth ?? undefined,
      endYear: w.endYear ?? undefined,
      isCurrent: w.isCurrentPosition ?? (!w.endYear && !!w.startYear),
      skills: w.skills ?? [],
      highlights: w.highlights ?? [],
    }),
  )
  profile.education = (x.educations ?? []).map(
    (e): EducationEntry => ({
      id: uid(),
      school: e.institution ?? 'Unknown',
      degree: e.degree ?? 'Unknown',
      fieldOfStudy: e.fieldOfStudy ?? undefined,
      gpa: e.gpa ?? undefined,
      description: e.description ?? undefined,
      startYear: e.startYear ?? undefined,
      endYear: e.endYear ?? undefined,
      isCurrent: e.isCurrentlyStudying ?? undefined,
    }),
  )
  profile.languages = (x.languages ?? [])
    .filter((l) => l?.name)
    .map(
      (l): LanguageEntry => ({
        langCode: (l.langCode ?? '').slice(0, 2).toLowerCase(),
        name: l.name,
        proficiency: LANG_PROF.has(l.proficiency) ? (l.proficiency as LanguageEntry['proficiency']) : 'professional_working',
      }),
    )
  profile.certifications = (x.certifications ?? [])
    .filter((c) => c?.name)
    .map((c): CertificationEntry => ({ name: c.name, issuingOrganization: c.issuingOrganization ?? undefined, year: c.year ?? undefined }))

  return profile
}

// Cleanup + section markers (cuee's enhanceTextStructure pattern). Preserves
// Unicode on purpose — resumes come in every script.
const SECTION_RES: [RegExp, string][] = [
  [/^\s*(work\s+experience|professional\s+experience|employment(\s+history)?|experience)\s*:?\s*$/im, 'experience'],
  [/^\s*(education|academic\s+background|qualifications)\s*:?\s*$/im, 'education'],
  [/^\s*(skills|technical\s+skills|technologies|core\s+competencies|tech\s+stack)\s*:?\s*$/im, 'skills'],
  [/^\s*(summary|profile|about(\s+me)?|objective|professional\s+summary)\s*:?\s*$/im, 'summary'],
  [/^\s*(projects|personal\s+projects|portfolio)\s*:?\s*$/im, 'projects'],
  [/^\s*(certifications?|licenses?|courses)\s*:?\s*$/im, 'certifications'],
  [/^\s*(languages)\s*:?\s*$/im, 'languages'],
]

function prepareCvText(raw: string): string {
  let text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    // Strip control chars but KEEP all printable Unicode.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  for (const [re, name] of SECTION_RES) {
    text = text.replace(re, (m) => `[SECTION: ${name}]\n${m.trim()}`)
  }
  return text.slice(0, 32_000)
}
