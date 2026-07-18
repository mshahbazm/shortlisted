// JSON Schemas + types for the three AI passes of the tailor-cv workflow.

export interface JobExtract {
  role: string
  seniority: string
  mustHaves: string[]
  niceToHaves: string[]
  keywords: string[]
  tone: string
  company: string
}

export const jobExtractSchema = {
  type: 'object',
  required: ['role', 'seniority', 'mustHaves', 'niceToHaves', 'keywords', 'tone', 'company'],
  properties: {
    role: { type: 'string' },
    seniority: { type: 'string' },
    company: { type: 'string' },
    mustHaves: { type: 'array', items: { type: 'string' } },
    niceToHaves: { type: 'array', items: { type: 'string' } },
    keywords: { type: 'array', items: { type: 'string' }, description: 'ATS keywords worth reflecting' },
    tone: { type: 'string', description: 'e.g. startup-casual, enterprise-formal' },
  },
} as const

export interface ProfileMatch {
  relevantWorkIds: string[]
  emphasisSkills: string[]
  angle: string // one sentence: how to position this candidate for this job
  gaps: string[] // requirements the profile doesn't cover — NEVER go on the CV
}

export const profileMatchSchema = {
  type: 'object',
  required: ['relevantWorkIds', 'emphasisSkills', 'angle', 'gaps'],
  properties: {
    relevantWorkIds: { type: 'array', items: { type: 'string' } },
    emphasisSkills: { type: 'array', items: { type: 'string' } },
    angle: { type: 'string' },
    gaps: { type: 'array', items: { type: 'string' } },
  },
} as const

export interface TailorOutput {
  label: string
  headline: string
  summary: string
  highlights: string[]
  skills: string[]
  work: { sourceId: string; bullets: string[] }[]
}

export const tailorOutputSchema = {
  type: 'object',
  required: ['label', 'headline', 'summary', 'highlights', 'skills', 'work'],
  properties: {
    label: { type: 'string', description: 'short variant name, e.g. "AI Engineer — Acme"' },
    headline: { type: 'string' },
    summary: { type: 'string', description: '2-3 sentences, truthful, role-angled' },
    highlights: { type: 'array', items: { type: 'string' }, maxItems: 5 },
    skills: { type: 'array', items: { type: 'string' } },
    work: {
      type: 'array',
      items: {
        type: 'object',
        required: ['sourceId', 'bullets'],
        properties: {
          sourceId: { type: 'string', description: 'MUST be an id from the master profile work list' },
          bullets: { type: 'array', items: { type: 'string' }, maxItems: 5 },
        },
      },
    },
  },
} as const
