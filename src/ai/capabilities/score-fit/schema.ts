// Fit scoring — rubric patterns from cuee's score-application prompt:
// cite-before-speak, relevance lens with a hard ceiling, floor rule.

export type Relevance = 'direct' | 'transferable' | 'unrelated'

export interface CriterionScore {
  requirement: string
  relevance: Relevance
  score: number // 1-5 (unrelated experience is capped at 3 by the prompt AND re-clamped in code)
  evidenceQuotes: string[] // verbatim from the profile; empty when notObserved
  commentary: string
  notObserved: boolean // requirement simply not addressed by the profile (≠ scored 1)
}

export interface FitScore {
  overallScore: number // 1-10
  verdict: string // one plain-English sentence
  criteria: CriterionScore[]
  gaps: string[] // requirements with no supporting evidence
  strengths: string[] // top 2-3 genuine selling points for THIS job
}

export const fitScoreSchema = {
  type: 'object',
  required: ['overallScore', 'verdict', 'criteria', 'gaps', 'strengths'],
  properties: {
    overallScore: { type: 'integer', minimum: 1, maximum: 10 },
    verdict: { type: 'string', description: 'one honest sentence: should they apply, and with what angle' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        required: ['requirement', 'relevance', 'score', 'evidenceQuotes', 'commentary', 'notObserved'],
        properties: {
          requirement: { type: 'string' },
          relevance: { type: 'string', enum: ['direct', 'transferable', 'unrelated'] },
          score: { type: 'integer', minimum: 1, maximum: 5 },
          evidenceQuotes: { type: 'array', items: { type: 'string' } },
          commentary: { type: 'string' },
          notObserved: { type: 'boolean' },
        },
      },
    },
    gaps: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
  },
} as const
