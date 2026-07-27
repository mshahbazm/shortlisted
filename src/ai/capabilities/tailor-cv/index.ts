// The tailor-cv workflow: extract-job -> match-profile -> tailor-content.
// Three structured passes, each validate->retry, chained like scnz-app's
// scriptToScenes. The final structural check makes lying impossible: work
// entries are rebuilt FROM the profile by sourceId, so company/title/dates
// can never be invented — only bullet wording comes from the AI.

import { Profile, TailoredResume } from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'
import {
  JobExtract,
  ProfileMatch,
  TailorOutput,
  jobExtractSchema,
  profileMatchSchema,
  tailorOutputSchema,
} from './schema'
import { extractJobPrompt, matchProfileInput, matchProfilePrompt, tailorInput, tailorPrompt } from './prompt'

export interface TailorCvResult {
  resume: TailoredResume
  job: JobExtract
  gaps: string[] // surfaced to the user; feeds the question bank mindset
  usage: { inputTokens: number; outputTokens: number }
}

export async function tailorCv(
  client: LlmClient,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
  // Free-form candidate note: emphasis wishes and extra facts in their own
  // words. Callers fold its facts into the profile BEFORE calling (intake),
  // so the truth validators below need no exceptions.
  userNote?: string,
): Promise<TailorCvResult> {
  if (profile.work.length === 0) throw new Error('Fill in your work experience first — the CV is built only from your real profile.')
  const usage = { inputTokens: 0, outputTokens: 0 }
  const add = (u: { inputTokens: number; outputTokens: number }) => {
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
      tier: 'mini', // grunt work — cheap model is fine
    },
    (j) => (!j.role || !Array.isArray(j.mustHaves) ? 'Missing role or mustHaves.' : null),
  )
  add(jobPass.usage)
  if (!jobPass.value) throw new Error('Could not understand the job posting. Try pasting more of its text.')
  const job = jobPass.value

  onStep?.('Matching it against your profile…')
  const workIds = new Set(profile.work.map((w) => w.id))
  const matchPass = await runJsonPass<ProfileMatch>(
    {
      client,
      systemPrompt: matchProfilePrompt(),
      input: matchProfileInput(job, profile, userNote),
      schema: profileMatchSchema,
      schemaName: 'ProfileMatch',
      tier: 'mini',
    },
    (m) => {
      const bad = m.relevantWorkIds.filter((id) => !workIds.has(id))
      return bad.length ? `These work ids do not exist in the profile: ${bad.join(', ')}` : null
    },
  )
  add(matchPass.usage)
  const match: ProfileMatch = matchPass.value ?? {
    relevantWorkIds: profile.work.map((w) => w.id),
    emphasisSkills: profile.skills.slice(0, 10).map((s) => s.name),
    angle: '',
    gaps: [],
  }

  onStep?.('Writing the tailored version…')
  // Skills may be claimed globally or proven inside a specific role — both are true.
  const profileSkillsLower = new Set([
    ...profile.skills.map((s) => s.name.toLowerCase().trim()),
    ...profile.work.flatMap((w) => w.skills.map((s) => s.toLowerCase().trim())),
  ])
  const tailorPass = await runJsonPass<TailorOutput>(
    {
      client,
      systemPrompt: tailorPrompt(),
      input: tailorInput(job, match, profile, userNote),
      schema: tailorOutputSchema,
      schemaName: 'TailoredCv',
      maxTokens: 6000,
      tier: 'full', // the writing pass gets the good model
    },
    (t) => {
      if (!t.work?.length) return 'work must not be empty.'
      const badIds = t.work.filter((w) => !workIds.has(w.sourceId)).map((w) => w.sourceId)
      if (badIds.length) return `sourceId(s) not in master profile: ${badIds.join(', ')}. Use only real profile work ids.`
      const madeUpSkills = (t.skills ?? []).filter((s) => !profileSkillsLower.has(s.toLowerCase().trim()))
      if (madeUpSkills.length) return `These skills are not in the profile: ${madeUpSkills.join(', ')}. skills must be a subset of the profile's skills.`
      return null
    },
  )
  add(tailorPass.usage)
  if (!tailorPass.value) throw new Error('The AI could not produce a truthful tailored CV after a retry. Nothing was saved.')
  const t = tailorPass.value

  // Structural truth guarantee: only bullets and ordering come from the AI.
  const resume: TailoredResume = {
    label: t.label || `${job.role} — ${job.company}`.slice(0, 60),
    headline: t.headline || profile.headline,
    summary: t.summary || profile.summary,
    highlights: (t.highlights ?? []).slice(0, 5),
    skills: t.skills?.length ? t.skills : profile.skills.map((s) => s.name),
    work: t.work.map((w) => ({ sourceId: w.sourceId, bullets: w.bullets.slice(0, 5) })),
    educationIds: profile.education.map((e) => e.id),
  }

  return { resume, job, gaps: match.gaps ?? [], usage }
}
