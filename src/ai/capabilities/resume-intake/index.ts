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
}

export interface ResumeIntakeResult extends IntakeNewFacts {
  usage: { inputTokens: number; outputTokens: number }
}

const intakeSchema = {
  type: 'object',
  required: ['tags', 'newSkills', 'newLinks', 'newLanguages', 'newCertifications'],
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
  },
} as const

const INTAKE_PROMPT =
  `You label an uploaded CV so it can be matched to the right job applications later, and you ` +
  `spot facts the CV contains that the candidate's stored profile is missing.\n\n` +
  `Return:\n` +
  `- tags: 2-4 short lowercase English role/field labels this CV is aimed at ` +
  `(examples: "frontend", "backend", "full-stack", "data", "devops", "marketing", "sales", ` +
  `"design", "product", "finance", "hr", "operations"). Base them on the CV's headline, ` +
  `skills and experience. Each tag at most 20 characters.\n` +
  `- newSkills: skills clearly stated in the CV that are NOT in knownSkills (compare ` +
  `case-insensitively; do not repeat near-duplicates like "React.js" when "React" is known).\n` +
  `- newLinks: URLs found in the CV, ONLY for the slots listed in missingLinkSlots.\n` +
  `- newLanguages: spoken languages stated in the CV not in knownLanguages. proficiency is one of: ` +
  `elementary, limited_working, professional_working, full_professional, native.\n` +
  `- newCertifications: certifications stated in the CV not in knownCertifications.\n\n` +
  `HARD RULE: every returned fact must be literally present in the CV text. Never infer, never ` +
  `invent. When in doubt, leave it out — empty arrays are a fine answer.`

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
  }
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
      return null
    },
  )

  return {
    tags: (value?.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean).slice(0, 4),
    newSkills: value?.newSkills ?? [],
    newLinks: value?.newLinks ?? {},
    newLanguages: value?.newLanguages ?? [],
    newCertifications: value?.newCertifications ?? [],
    usage,
  }
}
