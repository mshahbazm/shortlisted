// Resume intake: when a user uploads a CV, one mini call labels it for reuse
// (which roles/fields it targets) and surfaces facts the CV contains that the
// stored profile is missing. Strictly additive — nothing in the profile is
// ever overwritten, and nothing is invented: every returned fact must be
// literally present in the CV text.

import { Profile } from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'

export interface IntakeNewFacts {
  /** 2-4 short English role/field labels: "frontend", "marketing", "data engineering"… */
  tags: string[]
  newSkills: string[]
  newLinks: { website?: string; github?: string; linkedin?: string; portfolio?: string }
  newLanguages: { name: string; proficiency?: string }[]
  newCertifications: { name: string; issuingOrganization?: string; year?: number }[]
  /** Facts clearly tied to one of the candidate's existing jobs, as CV bullets. */
  newWorkHighlights: { workId: string; bullet: string }[]
  /**
   * A job the candidate names that is NOT in knownWork. Without this the model
   * has nowhere to put "I worked at Pavago on Webflow" — a highlight needs an
   * existing workId, so the whole statement was dropped in silence. Dates and
   * title are optional because people rarely state them in a sentence; the
   * entry is flagged as needing completion instead of being guessed at.
   */
  newWork: {
    company: string
    title?: string
    startYear?: number
    startMonth?: number
    endYear?: number
    endMonth?: number
    isCurrent?: boolean
    highlights?: string[]
  }[]
}

export interface ResumeIntakeResult extends IntakeNewFacts {
  usage: { inputTokens: number; outputTokens: number }
}

const intakeSchema = {
  type: 'object',
  required: ['tags', 'newSkills', 'newLinks', 'newLanguages', 'newCertifications', 'newWorkHighlights'],
  properties: {
    tags: { type: 'array', items: { type: 'string' } },
    newSkills: { type: 'array', items: { type: 'string' } },
    newLinks: {
      type: 'object',
      properties: {
        website: { type: 'string' },
        github: { type: 'string' },
        linkedin: { type: 'string' },
        portfolio: { type: 'string' },
      },
    },
    newLanguages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' }, proficiency: { type: 'string' } },
      },
    },
    newCertifications: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          issuingOrganization: { type: 'string' },
          year: { type: 'integer' },
        },
      },
    },
    newWorkHighlights: {
      type: 'array',
      items: {
        type: 'object',
        required: ['workId', 'bullet'],
        properties: {
          workId: { type: 'string' },
          bullet: { type: 'string' },
        },
      },
    },
    newWork: {
      type: 'array',
      items: {
        type: 'object',
        required: ['company'],
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          startYear: { type: 'integer' },
          startMonth: { type: 'integer' },
          endYear: { type: 'integer' },
          endMonth: { type: 'integer' },
          isCurrent: { type: 'boolean' },
          highlights: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
} as const

const INTAKE_PROMPT =
  `You process candidate-provided text — an uploaded CV, or a short note the candidate wrote ` +
  `about their experience. You label it so it can be matched to the right job applications ` +
  `later, and you spot facts it contains that the candidate's stored profile is missing.\n\n` +
  `Return:\n` +
  `- tags: 2-4 short lowercase English role/field labels this CV is aimed at ` +
  `(examples: "frontend", "backend", "full-stack", "data", "devops", "marketing", "sales", ` +
  `"design", "product", "finance", "hr", "operations"). Base them on the CV's headline, ` +
  `skills and experience. Each tag at most 20 characters.\n` +
  `- newSkills: skills clearly stated in the CV that are NOT in knownSkills (compare ` +
  `case-insensitively; do not repeat near-duplicates like "React.js" when "React" is known).\n` +
  `- newLinks: URLs found in the CV, ONLY for the slots listed in missingLinkSlots.\n` +
  `- newLanguages: spoken languages stated in the CV not in knownLanguages. proficiency is one of: ` +
  `elementary, limited_working, professional_working, full_professional, native_bilingual.\n` +
  `- newCertifications: certifications stated in the CV not in knownCertifications.\n` +
  `- newWorkHighlights: when a stated fact is clearly tied to ONE of the knownWork entries ` +
  `(the employer is named or unmistakable), return it as {workId, bullet} — the bullet phrased ` +
  `as one concise CV bullet in plain confident language, faithful to what was stated.\n` +
  `- newWork: when the text names an employer that is NOT in knownWork, return it here instead ` +
  `of forcing it into newWorkHighlights. company is required; include title and dates ONLY if ` +
  `stated — never guess them, an incomplete entry is expected and the candidate fills the rest ` +
  `in. Put anything said about what they did there in that entry's highlights. Match knownWork ` +
  `case-insensitively before deciding a company is new.\n\n` +
  `HARD RULE: every returned fact must be literally present in the provided text. Never infer, ` +
  `never invent. When in doubt, leave it out — empty arrays are a fine answer.`

export async function resumeIntake(
  client: LlmClient,
  cvText: string,
  profile: Profile | null,
): Promise<ResumeIntakeResult> {
  const known = {
    knownSkills: profile?.skills.map((s) => s.name) ?? [],
    missingLinkSlots: (['website', 'github', 'linkedin', 'portfolio'] as const).filter(
      (k) => !profile?.links[k],
    ),
    knownLanguages: profile?.languages.map((l) => l.name) ?? [],
    knownCertifications: profile?.certifications.map((c) => c.name) ?? [],
    knownWork: profile?.work.map((w) => ({ id: w.id, company: w.company, title: w.title })) ?? [],
  }
  const workIds = new Set(known.knownWork.map((w) => w.id))
  const input = JSON.stringify({ cv: cvText.slice(0, 16000), ...known })

  const { value, usage } = await runJsonPass<IntakeNewFacts>(
    {
      client,
      systemPrompt: INTAKE_PROMPT,
      input,
      schema: intakeSchema,
      schemaName: 'resumeIntake',
      tier: 'mini',
      maxTokens: 1200,
    },
    (v) => {
      if (!Array.isArray(v.tags) || v.tags.length > 6) return 'tags must be at most 6 labels'
      if (v.tags.some((t) => typeof t !== 'string' || t.length > 24)) return 'tags must be short strings'
      for (const slot of ['website', 'github', 'linkedin', 'portfolio'] as const) {
        if (v.newLinks?.[slot] && !known.missingLinkSlots.includes(slot)) {
          return `newLinks.${slot}: that slot is already filled — only missingLinkSlots may be returned`
        }
      }
      for (const wh of v.newWorkHighlights ?? []) {
        if (!workIds.has(wh.workId)) {
          return `newWorkHighlights: unknown workId ${wh.workId} — use a knownWork id, or return that employer in newWork`
        }
        if (wh.bullet.length > 300) return 'newWorkHighlights: bullets must stay under 300 characters'
      }
      const knownCompanies = new Set(known.knownWork.map((w) => w.company.toLowerCase().trim()))
      for (const w of v.newWork ?? []) {
        if (typeof w.company !== 'string' || !w.company.trim()) return 'newWork: company is required'
        if (knownCompanies.has(w.company.toLowerCase().trim())) {
          return `newWork: ${w.company} is already in knownWork — use newWorkHighlights with its id`
        }
        if ((w.highlights ?? []).some((b) => b.length > 300)) {
          return 'newWork: bullets must stay under 300 characters'
        }
      }
      return null
    },
  )

  return {
    tags: (value?.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 4),
    newSkills: value?.newSkills ?? [],
    newLinks: value?.newLinks ?? {},
    newLanguages: value?.newLanguages ?? [],
    newCertifications: value?.newCertifications ?? [],
    newWorkHighlights: value?.newWorkHighlights ?? [],
    newWork: value?.newWork ?? [],
    usage,
  }
}
