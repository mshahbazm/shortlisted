// The page's opening line, written from the profile we already parsed.
//
// It runs in exactly one situation: the account has NO bio yet and a resume has
// just been processed. An existing bio is never touched — we cannot tell a line
// the user wrote from one we generated months ago, and silently rewriting
// someone's own words about themselves is not a thing to risk. The caller owns
// that gate; this file only writes.
//
// Source of truth is the STRUCTURED profile, not the raw CV text: it has already
// been through extraction, so the bio inherits that boundary instead of opening
// a second one straight onto an uploaded document.

import type { Profile } from '../../../lib/types'
import { runJsonPass, type LlmClient } from '../../systemAgent'

export interface WrittenBio {
  bio: string
}

export interface WriteBioResult {
  /** Empty when the model could not write one truthfully — the caller leaves
   *  the field unset rather than publishing a guess. */
  bio: string
  usage: { inputTokens: number; outputTokens: number }
}

/** Hard ceiling. The field caps at 300; we aim well under it, because this sits
 *  at 20-24px directly under someone's name and a paragraph at that size is a
 *  wall, not an introduction. */
const MAX_BIO = 240

const bioSchema = {
  type: 'object',
  required: ['bio'],
  properties: { bio: { type: 'string' } },
} as const

const BIO_PROMPT =
  `You write the opening line of a professional's own portfolio page, from their structured ` +
  `profile. It is the first sentence a visitor reads, directly under their name.\n\n` +
  `Write ONE short paragraph — a single sentence is often enough, never more than two, and ` +
  `under ${MAX_BIO} characters total.\n\n` +
  `Voice: first person, present tense, plain spoken English. Write the way a competent person ` +
  `describes their own work to another adult — not a CV summary, not a marketing tagline.\n\n` +
  `Say what they DO and what kind of problem they are good at. Concrete beats grand: the field ` +
  `they work in and the substance of the work is what a visitor came for.\n\n` +
  `Do NOT: list job titles or employers; stack adjectives ("passionate", "results-driven", ` +
  `"dynamic"); open with "I am a" followed by their headline verbatim; use buzzwords, ` +
  `superlatives or exclamation marks; mention years of experience (the page states that ` +
  `separately); end with a call to action.\n\n` +
  `HARD RULE: every claim must be supported by the profile you are given. Never invent a ` +
  `specialism, a domain, an achievement or a number. If the profile is too thin to say ` +
  `anything true and specific, return an empty string — that is a correct answer, and better ` +
  `than a sentence that flatters them into something they are not.`

export async function writeBio(client: LlmClient, profile: Profile): Promise<WriteBioResult> {
  // Only the parts that describe the WORK. Contact details, facts (salary,
  // notice, sponsorship) and education have no business in an opening line, so
  // they are not sent at all rather than being forbidden in the prompt.
  const input = JSON.stringify({
    headline: profile.headline,
    summary: profile.summary,
    highlights: profile.highlights,
    industries: profile.industries,
    skills: profile.skills.filter((s) => s.category === 'primary').map((s) => s.name).slice(0, 12),
    work: profile.work.slice(0, 4).map((w) => ({ title: w.title, highlights: w.highlights.slice(0, 3) })),
  })

  const { value, usage } = await runJsonPass<WrittenBio>(
    {
      client,
      systemPrompt: BIO_PROMPT,
      input,
      schema: bioSchema,
      schemaName: 'writeBio',
      tier: 'mini',
      maxTokens: 300,
    },
    (v) => {
      if (typeof v.bio !== 'string') return 'bio must be a string'
      if (v.bio.length > MAX_BIO) return `bio must be at most ${MAX_BIO} characters`
      return null
    },
  )

  return { bio: value?.bio.trim() ?? '', usage }
}
