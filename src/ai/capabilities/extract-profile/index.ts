// Onboarding capability: CV text -> structured profile (v2).
// Schema and prompt patterns adopted from the cuee ATS production resume
// pipeline: isResume gate, split integer dates, enum coercion, per-experience
// skills, 3-highlight semantics, industries, aboutCandidate, the
// address-signals-only phone rule, and [SECTION:] markers. Durations are
// computed in code, never trusted from the model.

import {
  CefrLevel,
  CefrSkills,
  CertificationEntry,
  EducationEntry,
  LanguageEntry,
  Profile,
  ProfileFacts,
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

export interface ExtractedProfile {
  isResume: boolean
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  city?: string | null
  country?: string | null
  dateOfBirth?: string | null
  nationality?: string | null
  sex?: string | null
  drivingLicence?: string | null
  headline: string
  summary: string
  aboutCandidate?: string | null
  highlights?: string[]
  industries?: string[]
  skills?: { name: string; proficiency?: string | null; category?: string | null }[]
  links?: { website?: string; github?: string; linkedin?: string; portfolio?: string; other?: string }
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
  languages?: { langCode: string; name: string; proficiency: string; cefr?: string | null }[]
  certifications?: { name: string; issuingOrganization?: string | null; year?: number | null }[]
  communicationSkills?: string[]
  organisationalSkills?: string[]
  digitalSkills?: {
    informationProcessing?: string | null
    communication?: string | null
    contentCreation?: string | null
    safety?: string | null
    problemSolving?: string | null
    note?: string | null
  } | null
  additionalInformation?: { label: string; value: string }[]
  facts?: {
    salaryHourly?: number | null
    salaryMonthly?: number | null
    jobType?: string | null
    noticeDays?: number | null
    timezone?: string | null
    englishLevel?: string | null
    needsSponsorship?: string | null
    authorizedCountries?: string | null
    relocation?: string | null
    hoursOverlap?: string | null
  } | null
}

export const schema = {
  type: 'object',
  required: ['isResume', 'firstName', 'lastName', 'email', 'phone', 'location', 'headline', 'summary', 'experiences', 'educations', 'skills'],
  properties: {
    isResume: { type: 'boolean', description: "false ONLY if the text is not about a person's background at all (job posting, article, random text) — then leave everything else empty" },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    location: { type: 'string' },
    city: { type: 'string' },
    country: { type: 'string', description: '2-letter ISO code, only if stated or clearly implied by address' },
    dateOfBirth: { type: 'string', description: 'only if explicitly stated, e.g. "1990-05-12" or "12 May 1990"' },
    nationality: { type: 'string', description: 'only if explicitly stated' },
    sex: { type: 'string', enum: ['Male', 'Female', 'Other'], description: 'only if explicitly stated on the CV, mapped to Male/Female/Other — never guess from name or photo' },
    drivingLicence: { type: 'string', description: 'driving licence categories if stated, e.g. "B" or "B, C1"' },
    headline: { type: 'string', description: 'current or most recent title' },
    summary: { type: 'string' },
    aboutCandidate: {
      type: 'string',
      description: 'one keyword-rich factual sentence for search, e.g. "backend engineer with fintech and LLM-agent experience" — facts only, no evaluation',
    },
    highlights: {
      type: 'array', items: { type: 'string' }, maxItems: 3,
      description: 'up to 3 recruiter-scannable bullets, each under 12 words, drawn only from stated facts: core expertise, seniority signal, top achievement. Fewer is fine — never invent one',
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
      properties: { website: { type: 'string' }, github: { type: 'string' }, linkedin: { type: 'string' }, portfolio: { type: 'string' }, other: { type: 'string', description: 'any other profile link — X/Twitter, StackOverflow, Behance, a personal blog…' } },
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
          cefr: { type: 'string', enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], description: 'CEFR level if the CV states one, e.g. "English — C1"' },
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
    communicationSkills: { type: 'array', items: { type: 'string' }, description: 'ONLY from an explicit "Communication skills" section (Europass-style) — bullets copied faithfully; omit for an ordinary CV' },
    organisationalSkills: { type: 'array', items: { type: 'string' }, description: 'ONLY from an explicit "Organisational / managerial skills" section — bullets copied faithfully; omit otherwise' },
    digitalSkills: {
      type: 'object',
      description: 'ONLY from an explicit Europass digital-skills self-assessment (the 5 competence areas). Never invent a rating.',
      properties: {
        informationProcessing: { type: 'string' },
        communication: { type: 'string' },
        contentCreation: { type: 'string' },
        safety: { type: 'string' },
        problemSolving: { type: 'string' },
        note: { type: 'string' },
      },
    },
    additionalInformation: {
      type: 'array',
      description: 'real extra sections that do not fit the fields above — Publications, Awards, Conferences, Volunteering, Interests, References. Copy verbatim; skip entirely if none, never invent, never duplicate data placed elsewhere.',
      items: {
        type: 'object', required: ['label', 'value'],
        properties: { label: { type: 'string' }, value: { type: 'string' } },
      },
    },
    facts: {
      type: 'object',
      description: 'job-search preferences ONLY when the CV explicitly states them (most CVs do not — then omit the whole object). Never infer.',
      properties: {
        salaryHourly: { type: 'number', description: 'desired hourly rate if stated' },
        salaryMonthly: { type: 'number', description: 'desired monthly rate if stated' },
        jobType: { type: 'string', description: 'desired employment type(s), e.g. "full_time, contract"' },
        noticeDays: { type: 'integer', description: 'notice period in days if stated (0 = available immediately)' },
        timezone: { type: 'string' },
        englishLevel: { type: 'string' },
        needsSponsorship: { type: 'string', description: 'visa/sponsorship note if stated' },
        authorizedCountries: { type: 'string', description: 'where they can legally work, e.g. "EU citizen"' },
        relocation: { type: 'string', description: 'relocation willingness if stated' },
        hoursOverlap: { type: 'string' },
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
"languages":[{"langCode":"en","name":"English","proficiency":"native_bilingual"},{"langCode":"es","name":"Spanish","proficiency":"professional_working","cefr":"B2"}],
"certifications":[{"name":"AWS Solutions Architect","issuingOrganization":"AWS","year":2022}]}`

// The résumé/paste parser. Free-form (spoken) input has its own prompt on the
// cloud (build-profile/extract-freeform.ts) that INTERPRETS prose; both share the
// schema, validation and mapping below so the output shape is identical.
const RESUME_SYSTEM_PROMPT =
  `You are Shortlisted's résumé parser. Turn a résumé, CV, or pasted career document into strictly structured JSON.\n` +
  `The paste may be a full résumé, a LinkedIn export, or a partial fragment — extract EVERY real piece of career data it holds.\n` +
  `Set isResume=true whenever the text is about this person's background (experience, education, projects, skills). ` +
  `Set it false ONLY when the text is not about a person's background at all (a job posting, an article, random text) — ` +
  `then leave everything else empty.\n` +
  `Rules:\n` +
  `- TRUTH ONLY: copy only what the text states. Never invent employers, titles, dates, numbers, metrics or skills, ` +
  `and never inflate a plain statement into an achievement. If something isn't stated, leave it out. This is absolute.\n` +
  `- Completeness: capture EVERYTHING real — every job, project, volunteering role, club, course, certification, ` +
  `language and skill — into the right section. Never drop something just because it is brief.\n` +
  `- Identity: firstName, lastName, email, phone, location default to an empty string "" when not stated ` +
  `(the person fills these in next) — do NOT write "Unknown".\n` +
  `- Dates: split into integer month (1-12) and year. "Jan 2020" -> startMonth:1, startYear:2020. ` +
  `Year-only dates: omit the month. Never output Date objects or date strings.\n` +
  `- Enums exactly as listed: "full_time", NOT "Full-Time". Seniority adjectives map to proficiency ` +
  `(Senior/Lead usage implies advanced/expert).\n` +
  `- skills: the global list with proficiency + category (primary = core to their profession). ` +
  `ALSO list per-experience skills on each role where the text supports it.\n` +
  `- highlights: UP TO 3 recruiter-scannable bullets, each under 12 words, drawn ONLY from what they said ` +
  `(core expertise / seniority signal / top achievement). Fewer is fine; never invent one to reach three, ` +
  `and never add a metric that wasn't stated.\n` +
  `- Phone: keep the country prefix if written. If there is NO prefix, infer the country ONLY from explicit ` +
  `address/location text. Do NOT infer from the text's language, the person's name, or where they studied — ` +
  `these are unreliable. No confident address signal -> keep the number exactly as written.\n` +
  `- Personal details: capture dateOfBirth, nationality, sex and drivingLicence ONLY when the CV explicitly ` +
  `states them (common on European / international CVs). sex must be exactly Male, Female or Other. Never guess ` +
  `sex or nationality from the person's name, language or photo — omit them unless written.\n` +
  `- Links: capture every profile URL. Put a personal site under website, code under github, LinkedIn under ` +
  `linkedin, a portfolio under portfolio, and anything else (X/Twitter, StackOverflow, Behance, a blog) under other.\n` +
  `- Languages: when a CEFR level is stated (A1–C2, e.g. "English — C1" or "French (B2)"), set that language's ` +
  `cefr to it; otherwise omit cefr. Always also set proficiency to the closest match.\n` +
  `- Europass sections: if the CV has an explicit "Communication skills", "Organisational / managerial skills" ` +
  `or "Digital skills" self-assessment (common on Europass CVs), capture them into communicationSkills, ` +
  `organisationalSkills and digitalSkills, copied faithfully. For an ordinary CV WITHOUT these labelled sections, ` +
  `omit them — put technical skills in skills, not here — and never invent a digital-skills rating.\n` +
  `- additionalInformation: any real extra sections that don't fit the fields above (Publications, Awards, ` +
  `Conferences, Volunteering, Interests, References) as {label, value} pairs, copied faithfully. Skip it ` +
  `entirely when there are none, and never duplicate data you already placed in another section.\n` +
  `- facts: job-search preferences (salary, notice period, work authorization, relocation, timezone) ONLY when ` +
  `the CV explicitly states them — most CVs don't, so omit the object entirely. Never infer these.\n` +
  `- The text may contain [SECTION: …] markers we injected to help segmentation — never copy them into output.\n\n` +
  FEW_SHOT

// systemPrompt defaults to the résumé parser; the free-form builder passes its
// own (see build-profile/extract-freeform.ts). Schema, validation and the
// ExtractedProfile -> Profile mapping are shared, so the output is identical.
export async function extractProfile(
  client: LlmClient,
  cvText: string,
  systemPrompt: string = RESUME_SYSTEM_PROMPT,
): Promise<Profile> {
  const pass = await runJsonPass<ExtractedProfile>(
    {
      client,
      systemPrompt,
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
  if (!pass.value) throw new Error("Couldn't read that. Add a little more detail and try again.")
  const x = pass.value
  if (!x.isResume) {
    throw new Error("I couldn't find your background in that. Add a bit about your jobs, studies or projects and try again.")
  }
  return mapExtractedToProfile(x)
}

const CONTRACT = new Set(['full_time', 'part_time', 'contract', 'freelance', 'internship', 'temporary'])
const SKILL_PROF = new Set(['basic', 'intermediate', 'advanced', 'expert'])
const LANG_PROF = new Set(['elementary', 'limited_working', 'professional_working', 'full_professional', 'native_bilingual'])
const CEFR_LEVELS = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
// A single stated CEFR level maps to the closest work-proficiency bucket; the
// exact level is preserved verbatim in the per-skill grid.
const CEFR_TO_PROF: Record<CefrLevel, LanguageEntry['proficiency']> = {
  A1: 'elementary', A2: 'elementary', B1: 'limited_working',
  B2: 'professional_working', C1: 'full_professional', C2: 'full_professional',
}
// A CV states one CEFR level per language; Europass wants a per-skill grid, so
// repeat the single level across all five skills (the type's documented default).
const cefrGrid = (level: CefrLevel): CefrSkills => ({
  listening: level, reading: level, spokenInteraction: level, spokenProduction: level, writing: level,
})
// We only support Male / Female / Other — normalize what the CV states, drop
// anything that doesn't map cleanly rather than guess.
const normSex = (v?: string | null): string | undefined => {
  const t = (v ?? '').trim().toLowerCase()
  if (t === 'male' || t === 'm') return 'Male'
  if (t === 'female' || t === 'f') return 'Female'
  if (t === 'other') return 'Other'
  return undefined
}

/** ExtractedProfile (raw LLM JSON) -> our Profile. Exported so any capability
 *  that produces the same schema maps identically. */
function mapExtractedToProfile(x: ExtractedProfile): Profile {
  const profile = emptyProfile()
  profile.identity = {
    firstName: x.firstName ?? '',
    lastName: x.lastName ?? '',
    email: (x.email ?? '').toLowerCase().trim(),
    phone: x.phone ?? '',
    location: x.location ?? '',
    city: x.city ?? undefined,
    country: x.country ?? undefined,
    dateOfBirth: x.dateOfBirth ?? undefined,
    nationality: x.nationality ?? undefined,
    sex: normSex(x.sex),
    drivingLicence: x.drivingLicence ?? undefined,
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
    .map((l): LanguageEntry => {
      const cefr = l.cefr && CEFR_LEVELS.has(l.cefr) ? (l.cefr as CefrLevel) : undefined
      const proficiency = LANG_PROF.has(l.proficiency)
        ? (l.proficiency as LanguageEntry['proficiency'])
        : cefr
          ? CEFR_TO_PROF[cefr]
          : 'professional_working'
      return {
        langCode: (l.langCode ?? '').slice(0, 2).toLowerCase(),
        name: l.name,
        proficiency,
        ...(cefr ? { cefr: cefrGrid(cefr) } : {}),
      }
    })
  profile.certifications = (x.certifications ?? [])
    .filter((c) => c?.name)
    .map((c): CertificationEntry => ({ name: c.name, issuingOrganization: c.issuingOrganization ?? undefined, year: c.year ?? undefined }))

  // Europass "personal skills" + additional information — captured so a richer
  // CV (esp. an actual Europass CV) isn't lossy. Each part is included only when
  // the CV actually had it; the whole block is set only if something landed.
  const europass: NonNullable<Profile['europass']> = {}
  const commSkills = (x.communicationSkills ?? []).map((s) => s.trim()).filter(Boolean)
  if (commSkills.length) europass.communicationSkills = commSkills
  const orgSkills = (x.organisationalSkills ?? []).map((s) => s.trim()).filter(Boolean)
  if (orgSkills.length) europass.organisationalSkills = orgSkills
  if (x.digitalSkills) {
    const ds = x.digitalSkills
    const digital = {
      informationProcessing: ds.informationProcessing?.trim() || undefined,
      communication: ds.communication?.trim() || undefined,
      contentCreation: ds.contentCreation?.trim() || undefined,
      safety: ds.safety?.trim() || undefined,
      problemSolving: ds.problemSolving?.trim() || undefined,
      note: ds.note?.trim() || undefined,
    }
    if (Object.values(digital).some(Boolean)) europass.digitalSkills = digital
  }
  const additional = (x.additionalInformation ?? []).filter((a) => a?.label?.trim() && a?.value?.trim())
  if (additional.length) europass.additionalInformation = additional.map((a) => ({ label: a.label.trim(), value: a.value.trim() }))
  if (Object.keys(europass).length) profile.europass = europass

  // Standard-answer facts — only what the CV explicitly stated (usually nothing).
  const xf = x.facts ?? {}
  const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
  const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
  const facts: ProfileFacts = {
    salaryHourly: num(xf.salaryHourly),
    salaryMonthly: num(xf.salaryMonthly),
    jobType: str(xf.jobType),
    noticeDays: num(xf.noticeDays),
    timezone: str(xf.timezone),
    englishLevel: str(xf.englishLevel),
    needsSponsorship: str(xf.needsSponsorship),
    authorizedCountries: str(xf.authorizedCountries),
    relocation: str(xf.relocation),
    hoursOverlap: str(xf.hoursOverlap),
  }
  for (const k of Object.keys(facts) as (keyof ProfileFacts)[]) if (facts[k] === undefined) delete facts[k]
  profile.facts = facts

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
