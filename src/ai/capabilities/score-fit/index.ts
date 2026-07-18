// "How well do I fit this job?" — an honest scorer, not a cheerleader.
// Two passes: extract-job (mini tier, shared with tailor-cv) then the rubric
// evaluation (full tier) using cuee's anti-inflation patterns.

import { Profile } from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'
import { JobExtract, jobExtractSchema } from '../tailor-cv/schema'
import { extractJobPrompt } from '../tailor-cv/prompt'
import { FitScore, fitScoreSchema } from './schema'
import { redactedProfileForScoring } from './redact'

export interface ScoreFitResult {
  fit: FitScore
  job: JobExtract
  usage: { inputTokens: number; outputTokens: number }
}

const SCORING_PROMPT =
  `You evaluate how well an anonymized candidate profile fits a job. You are honest, not encouraging — ` +
  `an inflated score wastes the candidate's time on applications they won't win.\n\n` +
  `METHOD — for each requirement, in this exact order:\n` +
  `1. CITE FIRST: find evidence in the profile and quote it verbatim into evidenceQuotes. ` +
  `No evidence -> notObserved=true, evidenceQuotes=[], score=1.\n` +
  `2. CLASSIFY relevance of the evidence:\n` +
  `   - "direct": same skill/domain actually used (e.g. requirement React, profile shipped React apps)\n` +
  `   - "transferable": adjacent and genuinely applicable (auto mechanic -> diesel mechanic)\n` +
  `   - "unrelated": different field entirely (truck driver -> pastry chef). Generic claims like ` +
  `"ownership", "fast learner", "team player" are NOT evidence and do NOT raise relevance.\n` +
  `3. SCORE 1-5 against the requirement. HARD CEILING: unrelated evidence scores at most 3, ` +
  `no matter how impressive it is. FLOOR RULE: clear negative evidence for a must-have forces 1-2 — ` +
  `strength elsewhere cannot compensate for a critical gap.\n\n` +
  `overallScore (1-10): weight mustHaves heavily; niceToHaves lightly. Several notObserved mustHaves ` +
  `cannot yield more than 5.\n` +
  `verdict: one plain sentence — apply or skip, and the honest angle if applying.\n` +
  `strengths: at most 3 genuine selling points for THIS job (specific, not generic).\n` +
  `gaps: every requirement with no supporting evidence.\n\n` +
  `BIAS RULES: the profile is anonymized on purpose. Never consider or guess name, gender, age, ` +
  `nationality, or school prestige. Judge evidence only.`

// Quick mode: one pass, one criterion — overall job relevance. This is the
// on-page "how do I score here?" button: cheaper, faster, still honest.
// (The full rubric stays for deliberate decisions; relevance is what a
// candidate scanning jobs actually needs.)

export interface QuickFit {
  overallScore: number // 1-10
  verdict: string
  strengths: string[]
  gaps: string[]
}

const quickFitSchema = {
  type: 'object',
  required: ['overallScore', 'verdict', 'strengths', 'gaps'],
  properties: {
    overallScore: { type: 'integer', minimum: 1, maximum: 10 },
    verdict: { type: 'string', description: 'one honest sentence: apply or skip, and why' },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    gaps: { type: 'array', items: { type: 'string' }, maxItems: 5 },
  },
} as const

const QUICK_PROMPT =
  `You judge how RELEVANT an anonymized candidate profile is to a job posting. One criterion only: ` +
  `relevance of their real experience to this job's actual requirements. You are honest, not encouraging.\n` +
  `Rules:\n` +
  `- Evidence only: generic claims ("fast learner", "team player") count for nothing.\n` +
  `- Directly relevant experience scores high; transferable-adjacent lands mid; unrelated caps at 4/10 ` +
  `no matter how impressive the career is.\n` +
  `- A missing hard requirement (stack, seniority, domain) pulls the score down — strength elsewhere ` +
  `does not compensate.\n` +
  `- Ignore and never guess name, gender, age, nationality, school prestige.\n` +
  `- verdict: one plain sentence. strengths: at most 3 specific selling points for THIS job. ` +
  `gaps: the requirements they don't show.`

export interface QuickScoreResult {
  fit: QuickFit
  usage: { inputTokens: number; outputTokens: number }
}

export async function quickScoreFit(
  client: LlmClient,
  profile: Profile,
  jobText: string,
): Promise<QuickScoreResult> {
  if (profile.work.length === 0) throw new Error('Fill in your work experience first — there is nothing to score yet.')
  const pass = await runJsonPass<QuickFit>(
    {
      client,
      systemPrompt: QUICK_PROMPT,
      input: JSON.stringify({
        jobPosting: jobText.slice(0, 16_000),
        candidate: redactedProfileForScoring(profile),
      }),
      schema: quickFitSchema,
      schemaName: 'QuickFit',
      maxTokens: 1500,
      tier: 'full', // single pass — give it the good model
    },
    (f) => (typeof f.overallScore !== 'number' || !f.verdict ? 'overallScore and verdict are required.' : null),
  )
  if (!pass.value) throw new Error('Scoring failed after a retry. Try again.')
  const fit = pass.value
  fit.overallScore = Math.max(1, Math.min(10, Math.round(fit.overallScore)))
  return { fit, usage: pass.usage }
}

export async function scoreFit(
  client: LlmClient,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
): Promise<ScoreFitResult> {
  if (profile.work.length === 0) throw new Error('Fill in your work experience first — there is nothing to score yet.')
  const usage = { inputTokens: 0, outputTokens: 0 }
  const add = (u: typeof usage) => {
    usage.inputTokens += u.inputTokens
    usage.outputTokens += u.outputTokens
  }

  onStep?.('Reading the job posting…')
  const jobPass = await runJsonPass<JobExtract>(
    {
      client,
      systemPrompt: extractJobPrompt(),
      input: jobText.slice(0, 24_000),
      schema: jobExtractSchema,
      schemaName: 'JobExtract',
      tier: 'mini',
    },
    (j) => (!j.role || !Array.isArray(j.mustHaves) ? 'Missing role or mustHaves.' : null),
  )
  add(jobPass.usage)
  if (!jobPass.value) throw new Error('Could not understand the job posting. Try pasting more of its text.')
  const job = jobPass.value

  onStep?.('Scoring your fit, honestly…')
  const scorePass = await runJsonPass<FitScore>(
    {
      client,
      systemPrompt: SCORING_PROMPT,
      input: JSON.stringify({
        job: { role: job.role, seniority: job.seniority, mustHaves: job.mustHaves, niceToHaves: job.niceToHaves },
        candidate: redactedProfileForScoring(profile),
      }),
      schema: fitScoreSchema,
      schemaName: 'FitScore',
      maxTokens: 6000,
      tier: 'full',
    },
    (f) => {
      if (!Array.isArray(f.criteria) || f.criteria.length === 0) return 'criteria must not be empty.'
      if (typeof f.overallScore !== 'number') return 'overallScore missing.'
      return null
    },
  )
  add(scorePass.usage)
  if (!scorePass.value) throw new Error('Scoring failed after a retry. Try again.')
  const fit = scorePass.value

  // Re-clamp the ceilings in code — the prompt asks, the code enforces (cuee's
  // post-validation pattern: never trust a rubric to a model alone).
  for (const c of fit.criteria) {
    c.score = Math.max(1, Math.min(5, Math.round(c.score)))
    if (c.relevance === 'unrelated' && c.score > 3) c.score = 3
    if (c.notObserved) c.score = 1
  }
  fit.overallScore = Math.max(1, Math.min(10, Math.round(fit.overallScore)))

  return { fit, job, usage }
}
