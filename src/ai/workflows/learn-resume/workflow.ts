// Learn from a newer resume in an EXISTING account: parse it, then report only
// what it ADDS over the current profile. Nothing is ever replaced — the user
// reviews the additions and drops what they don't want.
//
// Three steps: `extract` reuses the shared extractProfile (so the isResume gate
// + parsing quality come for free), `diff` is deterministic — no LLM, and it
// never rewrites identity, facts, headline or summary — and `bio` writes the
// opening line, but ONLY into an empty one. The caller owns PDF→text; this file
// owns the steps.

import { extractProfile } from '../../capabilities/extract-profile'
import { writeBio } from '../../capabilities/write-bio'
import type { LlmClient } from '../../systemAgent'
import { diffProfile, type ProfileDelta } from '../../../lib/profileMerge'
import type { Profile } from '../../../lib/types'
import { runWorkflow, step, workflow, type BaseCtx } from '../../../workflow'

export interface ImportCtx extends BaseCtx {
  /** A client per step. The tag named the step for the caller's own bookkeeping;
   *  it is kept because it costs nothing and makes a per-step client possible
   *  (a cheaper model for `extract` than for `bio`, say). */
  mkClient: (tag: string) => LlmClient
}

export interface LearnResumeState {
  /** Resume text (already OCR'd from the PDF, or pasted). */
  text: string
  /** The account's current profile — what the CV is diffed against. */
  existing?: Profile
  /** Set by `extract`: the resume parsed on its own. */
  incoming?: Profile
  /** Set by `diff`: the new items the CV adds over the existing profile. */
  delta?: ProfileDelta
  /** The page's CURRENT bio. Non-empty means the bio step does nothing —
   *  pass it in truthfully or a user's own words get overwritten. */
  currentBio?: string
  /** Set by `bio`, and only when `currentBio` was empty and the model had
   *  enough to say something true. The caller writes it to pages.hero.bio. */
  bio?: string
}

// Parse the resume text on its own. The isResume gate fires here — an irrelevant
// document is rejected before we ever touch the existing profile.
const extract = step<LearnResumeState, ImportCtx>('extract', async (ctx, s) => {
  const incoming = await extractProfile(ctx.mkClient('learn-resume:extract'), s.text)
  return { incoming }
})

// Deterministic: what does the CV have that the profile doesn't? Additions only.
const diff = step<LearnResumeState, ImportCtx>('diff', async (_ctx, s) => {
  const existing = s.existing
  const incoming = s.incoming
  if (!existing || !incoming) return {}
  return { delta: diffProfile(existing, incoming) }
})

// The page's opening line — written ONCE, into an empty field. A bio that is
// already set is left alone forever: we cannot tell a sentence the user wrote
// from one we generated last month, so the only safe rule is never to touch it.
// The whole step is skipped when there is one, which also means no LLM call and
// no cost for the common case of a returning user re-importing a CV.
const bio = step<LearnResumeState, ImportCtx>('bio', async (ctx, s) => {
  if (s.currentBio?.trim()) return {}
  const source = s.incoming
  if (!source) return {}
  const { bio } = await writeBio(ctx.mkClient('learn-resume:bio'), source)
  // An empty answer is a legitimate one — a profile can be too thin to say
  // anything true — and it leaves the field unset rather than publishing filler.
  return bio ? { bio } : {}
})

export const learnFromResumeWorkflow = workflow<LearnResumeState, ImportCtx>('learn-from-resume', [
  extract,
  diff,
  bio,
])

export function runLearnFromResume(
  ctx: ImportCtx,
  input: { text: string; existing: Profile; currentBio?: string },
): Promise<LearnResumeState> {
  return runWorkflow(learnFromResumeWorkflow, ctx, input)
}

/** Role/field labels for an uploaded resume, derived from the parsed CV itself
 *  (headline + industries) — the same intent as enrich-profile's `tags`, but for
 *  free off the deep extraction rather than a separate shallow LLM call. Short,
 *  lowercase, deduped, at most 4. */
export function deriveResumeTags(parsed: Profile): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of [parsed.headline, ...parsed.industries]) {
    const t = raw.toLowerCase().trim()
    if (!t || t.length > 30 || seen.has(t)) continue
    seen.add(t)
    tags.push(t)
    if (tags.length === 4) break
  }
  return tags
}
