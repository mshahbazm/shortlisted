import { Profile } from '../../../lib/types'
import { JobExtract, ProfileMatch } from './schema'

export const extractJobPrompt = () =>
  `You analyze a job posting for a candidate's application copilot. ` +
  `Extract what the employer actually wants. Be concrete and short; ` +
  `mustHaves are hard requirements, niceToHaves are bonuses, keywords are ` +
  `the exact terms an ATS or recruiter would scan for.`

export const matchProfilePrompt = () =>
  `You match a candidate's real profile against a job's requirements. ` +
  `Pick which work entries (by their id) are most relevant, which of the ` +
  `candidate's existing skills to emphasize, one sentence on how to angle the ` +
  `candidate, and list requirement gaps the profile does NOT cover. ` +
  `Gaps are for the candidate's eyes only — they never go on the CV. ` +
  `Never invent experience the profile doesn't contain.`

export const tailorPrompt = () =>
  `You tailor a CV for a specific job. HARD RULES, non-negotiable:\n` +
  `1. TRUTH ONLY. Every statement must be directly supported by the master profile. ` +
  `You may rephrase, reorder, emphasize, and trim — you may NOT add experiences, ` +
  `skills, employers, titles, dates, metrics, or credentials that are not in the profile.\n` +
  `2. Each work entry you output must carry the sourceId of the profile entry it comes from, ` +
  `and its bullets must be rewordings/selections of that entry's real highlights.\n` +
  `3. skills must be a subset of the profile's skills (reordering is the tailoring).\n` +
  `4. Plain, confident, concrete language. No buzzword soup, no first person.\n` +
  `Tailoring = choosing WHICH true things to lead with for THIS job, and phrasing them ` +
  `in the job's own vocabulary where honest.`

export function matchProfileInput(job: JobExtract, profile: Profile): string {
  return JSON.stringify({ job, profile: profileForPrompt(profile) })
}

export function tailorInput(job: JobExtract, match: ProfileMatch, profile: Profile): string {
  return JSON.stringify({ job, positioning: match, masterProfile: profileForPrompt(profile) })
}

function profileForPrompt(p: Profile) {
  return {
    identity: { name: `${p.identity.firstName} ${p.identity.lastName}`, location: p.identity.location },
    headline: p.headline,
    summary: p.summary,
    skills: p.skills,
    work: p.work.map((w) => ({
      id: w.id,
      company: w.company,
      title: w.title,
      from: w.from,
      to: w.to,
      highlights: w.highlights,
    })),
    education: p.education,
  }
}
