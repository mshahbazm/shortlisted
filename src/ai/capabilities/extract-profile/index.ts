// Onboarding capability: paste your existing CV text -> structured profile.
// One pass, validate->retry via runJsonPass.
// Hardened with production lessons from the cuee ATS resume pipeline:
// isResume gate, section markers, Unicode-preserving cleanup, and the
// "address-signals-only" phone-country rule.

import { EducationEntry, Profile, WorkEntry, emptyProfile, uid } from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'

interface ExtractedProfile {
  isResume: boolean
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  headline: string
  summary: string
  skills: string[]
  links: { website?: string; github?: string; linkedin?: string; portfolio?: string }
  work: { company: string; title: string; from: string; to: string; highlights: string[] }[]
  education: { school: string; degree: string; from?: string; to?: string }[]
}

const schema = {
  type: 'object',
  required: ['isResume', 'firstName', 'lastName', 'email', 'phone', 'location', 'headline', 'summary', 'skills', 'links', 'work', 'education'],
  properties: {
    isResume: {
      type: 'boolean',
      description: 'false if this text is NOT actually a resume/CV — then leave everything else empty',
    },
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    location: { type: 'string' },
    headline: { type: 'string' },
    summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    links: {
      type: 'object',
      properties: {
        website: { type: 'string' },
        github: { type: 'string' },
        linkedin: { type: 'string' },
        portfolio: { type: 'string' },
      },
    },
    work: {
      type: 'array',
      items: {
        type: 'object',
        required: ['company', 'title', 'from', 'to', 'highlights'],
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          from: { type: 'string', description: 'e.g. "2021-03" or "2021"' },
          to: { type: 'string', description: 'empty string means present' },
          highlights: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        required: ['school', 'degree'],
        properties: {
          school: { type: 'string' },
          degree: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
  },
} as const

export async function extractProfile(client: LlmClient, cvText: string): Promise<Profile> {
  const pass = await runJsonPass<ExtractedProfile>(
    {
      client,
      systemPrompt:
        'Extract this CV/resume text into a structured profile.\n' +
        'First decide: is this actually a resume/CV? If not, set isResume=false and leave the rest empty.\n' +
        'Rules:\n' +
        '- Copy facts exactly as written — do not embellish, do not invent, use empty strings for anything missing.\n' +
        '- Dates as "YYYY-MM" when the month is known, else "YYYY". An empty "to" means present.\n' +
        '- Phone: include the country prefix if written. If there is NO prefix, infer the country ONLY from ' +
        'explicit address/location text in the resume. Do NOT infer from the resume language, the name, or ' +
        'where they studied — those are unreliable. If no address supports a confident guess, keep the number as written.\n' +
        '- Keep each highlight as one bullet-worthy sentence.\n' +
        'The text may contain [SECTION: …] markers we added to help you segment it — do not copy them into output.',
      input: prepareCvText(cvText),
      schema,
      schemaName: 'ExtractedProfile',
      maxTokens: 6000,
    },
    (p) => {
      if (typeof p.isResume !== 'boolean') return 'isResume must be a boolean.'
      if (p.isResume && !Array.isArray(p.work)) return 'work must be an array.'
      return null
    },
  )
  if (!pass.value) throw new Error('Could not read that CV text. Try pasting the plain text of your resume.')
  if (!pass.value.isResume) {
    throw new Error("That text doesn't look like a resume/CV. Paste your actual resume and try again.")
  }
  const x = pass.value

  const profile = emptyProfile()
  profile.identity = {
    firstName: x.firstName,
    lastName: x.lastName,
    email: x.email,
    phone: x.phone,
    location: x.location,
  }
  profile.headline = x.headline
  profile.summary = x.summary
  profile.skills = x.skills ?? []
  profile.links = x.links ?? {}
  profile.work = (x.work ?? []).map(
    (w): WorkEntry => ({ id: uid(), company: w.company, title: w.title, from: w.from, to: w.to, highlights: w.highlights ?? [] }),
  )
  profile.education = (x.education ?? []).map(
    (e): EducationEntry => ({ id: uid(), school: e.school, degree: e.degree, from: e.from, to: e.to }),
  )
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

export function prepareCvText(raw: string): string {
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
