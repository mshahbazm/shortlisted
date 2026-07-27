// The one entry point the UI calls for AI work — and now the whole of it.
//
// This file used to be an HTTP client: every function POSTed to Shortlisted
// Cloud, which ran the capability and sent back the result. The capabilities
// were always runtime-agnostic (systemAgent takes an injected LlmClient), so
// bringing them home meant deleting the transport, not rewriting the logic.
// What each function returns is unchanged, which is why the panel above it did
// not have to move.
//
// The usage accounting the server did around each call is gone with it: on the
// user's own key there is nothing of ours to count.

import {
  IntakeSession,
  Persona,
  Profile,
  Settings,
  emptyProfile,
  hasProfileContent,
} from '../lib/types'
import { applyEnrichment, diffProfile, type ProfileDelta } from '../lib/profileMerge'
import { assessTextQuality, extractPdfText } from '../lib/pdfText'
import * as store from '../lib/store'
import { makeLlmClient } from './client'
import type { LlmClient } from './systemAgent'
import { enrichProfile } from './capabilities/enrich-profile'
import { extractProfile } from './capabilities/extract-profile'
import { fillAssist } from './capabilities/fill-assist'
import { quickScoreFit, scoreFit } from './capabilities/score-fit'
import { tailorCv } from './capabilities/tailor-cv'
import { assessSufficiency } from './workflows/build-profile/assess'
import { runBuildProfile as runBuildProfileWorkflow } from './workflows/build-profile/workflow'
import { deriveResumeTags, runLearnFromResume } from './workflows/learn-resume/workflow'
import type {
  AssistField,
  AssistResultItem,
  CorrectionItem,
  ProfileEnrichment,
  QuickScoreResult,
  ScoreFitResult,
  TailorCvResult,
  VerifyField,
} from './contract'

export type { QuickScoreResult, ScoreFitResult }
export type { AssistField, AssistResultItem, CorrectionItem, VerifyField }

/** The profile every capability reads. The server loaded this from the account
 *  precisely so it never had to trust the client; locally there is only one
 *  copy and it is the storage. */
const currentProfile = () => store.get('profile')

const client = (settings: Settings): LlmClient => makeLlmClient(settings)

// ---- resumes ----

/**
 * Uploaded-CV intake: the SAME deep extract+diff as the "learn more" flow, run
 * silently in the background — returns the additive delta to fold into the
 * profile plus role/field tags for the resume.
 */
export async function intakeResume(
  settings: Settings,
  pdfBase64: string,
): Promise<{ delta: ProfileDelta; tags: string[] }> {
  const text = await pdfTextFromBase64(pdfBase64)
  const state = await runLearnFromResume(
    { mkClient: () => client(settings), log: (m) => console.debug('[wf]', m) },
    { text, existing: await currentProfile() },
  )
  return { delta: state.delta ?? emptyDelta(), tags: state.incoming ? deriveResumeTags(state.incoming) : [] }
}

/**
 * "Learn more about me": parse a CV (PDF or pasted text) and diff it against the
 * current profile, returning ONLY the new items as a ProfileDelta — grouped by
 * category so the review screen can drop individual items. Identity and the
 * user's curated fields are never touched.
 */
export async function learnFromResume(
  settings: Settings,
  args: { pdf?: ArrayBuffer; cvText?: string },
): Promise<{ delta: ProfileDelta; method?: 'text' | 'ocr'; quality?: string }> {
  let text: string
  let quality: string | undefined
  if (typeof args.cvText === 'string' && args.cvText.trim().length >= 50) {
    text = args.cvText
  } else if (args.pdf) {
    text = await readPdf(args.pdf)
    quality = assessTextQuality(text)
  } else {
    throw new Error('Paste a bit more of your CV text, or upload a PDF.')
  }
  const state = await runLearnFromResume(
    { mkClient: () => client(settings), log: (m) => console.debug('[wf]', m) },
    { text, existing: await currentProfile() },
  )
  return { delta: state.delta ?? emptyDelta(), method: 'text', quality }
}

export async function runExtractProfile(settings: Settings, cvText: string): Promise<Profile> {
  if (!cvText || cvText.trim().length < 50) throw new Error('There is not enough text there to read.')
  return extractProfile(client(settings), cvText)
}

// ---- profile ----

/** Free-form profile note ("I worked with Webflow at X") → additive facts. A
 *  typed fragment is too small for the full extractor, whose is-this-a-resume
 *  gate would reject it. */
export async function learnFromNote(settings: Settings, text: string): Promise<ProfileEnrichment> {
  const note = text.trim()
  const empty: ProfileEnrichment = {
    tags: [],
    newSkills: [],
    newLinks: {},
    newLanguages: [],
    newCertifications: [],
    newWorkHighlights: [],
    newWork: [],
  }
  if (note.length < 8) return empty
  if (note.length > 2000) throw new Error('That note is too long (2000 characters max).')
  const { usage: _usage, ...facts } = await enrichProfile(client(settings), note, await currentProfile())
  return facts
}

// ---- form filling ----

/**
 * The reasoning layer for form filling: ONE batched call covering both the
 * fields the deterministic filler couldn't handle and the uncertain fills it
 * wants double-checked, answered from the stored profile + answer bank.
 *
 * The server gated this behind a paid plan to bound its own spend. On the
 * user's own key there is nothing of ours to bound, so it just runs.
 */
export async function assistFill(
  settings: Settings,
  fields: AssistField[],
  verify: VerifyField[],
): Promise<{ results: AssistResultItem[]; corrections: CorrectionItem[] }> {
  if (fields.length + verify.length === 0) return { results: [], corrections: [] }
  const profile = await currentProfile()
  const bank = await store.get('answerBank')
  if (!hasProfileContent(profile) && bank.length === 0) return { results: [], corrections: [] }
  const answers = bank.map((a) => ({
    question: a.questionRaw[0] ?? a.questionNorm,
    answer: a.polished ?? a.answer,
  }))
  const result = await fillAssist(client(settings), fields, verify, profile, answers)
  return { results: result.results, corrections: result.corrections }
}

// ---- guided builder (no CV) ----
//
// The transcript lives in chrome.storage under `intake` — the local stand-in
// for the server's `intake` table, kept for the same reason: raw Q&A is working
// material, not profile data, and keeping it separate lets the flow resume
// exactly without ever half-writing a profile.

const MAX_INTAKE_ROUNDS = 3

export interface IntakeNext {
  enough: boolean
  theme: string // short topic heading for this round's questions; '' when enough
  questions: string[]
  round: number
}

/** GATHER: send the intro (start, no `answers`) or a round's answers (continue).
 *  Judges the material so far and returns the next questions, or `enough: true`
 *  when it's time to build. */
export async function intakeNext(
  settings: Settings,
  body: { persona: Persona; intro: string; answers?: string[] },
): Promise<IntakeNext> {
  const persona: Persona = body.persona === 'starting' ? 'starting' : 'working'

  if (body.answers === undefined) {
    if (!body.intro || body.intro.trim().length < 20) throw new Error('Tell us a little more to work with.')
    await store.set('intake', { persona, intro: body.intro.trim(), rounds: [], status: 'gathering' })
  } else {
    await recordAnswers(body.answers)
  }

  const session = await store.get('intake')
  if (!session) throw new Error('Start over — tell us about yourself first.')
  const round = session.rounds.length
  // Hard cap: once we've run the max rounds, stop asking and let them build.
  if (round >= MAX_INTAKE_ROUNDS) return { enough: true, theme: '', questions: [], round }

  const assessment = await assessSufficiency(client(settings), {
    transcript: intakeTranscript(session),
    persona,
    coveredThemes: session.rounds.map((r) => r.theme ?? '').filter((t) => t.trim().length > 0),
    isFinalRound: round === MAX_INTAKE_ROUNDS - 1,
  })
  if (assessment.enough || assessment.questions.length === 0) {
    return { enough: true, theme: '', questions: [], round }
  }
  await store.update('intake', (s) =>
    s ? { ...s, rounds: [...s.rounds, { questions: assessment.questions, answers: [], theme: assessment.theme }] } : s,
  )
  return { enough: false, theme: assessment.theme, questions: assessment.questions, round: round + 1 }
}

/** RESUME: the in-progress session (or null) so the builder can pick up exactly
 *  where the user left off. */
export async function loadIntakeSession(_settings: Settings): Promise<IntakeSession | null> {
  return store.get('intake')
}

/** FINALIZE: extract the structured profile from the whole gathered intake.
 *  Pass `answers` to record a final round first (used on skip). */
export async function runBuildProfile(settings: Settings, answers?: string[]): Promise<{ profile: Profile }> {
  if (Array.isArray(answers)) await recordAnswers(answers)
  const session = await store.get('intake')
  if (!session) throw new Error('Nothing to build yet — tell us about yourself first.')
  const state = await runBuildProfileWorkflow(
    { llm: client(settings), log: (m) => console.debug('[wf]', m) },
    intakeTranscript(session),
  )
  await store.update('intake', (s) => (s ? { ...s, status: 'done' } : s))
  return { profile: state.profile ?? emptyProfile() }
}

/** Record this round's answers into the latest round (no-op if there's none). */
async function recordAnswers(answers: string[]): Promise<void> {
  await store.update('intake', (s) => {
    if (!s || !s.rounds.length) return s
    const rounds = s.rounds.slice()
    rounds[rounds.length - 1] = { ...rounds[rounds.length - 1], answers }
    return { ...s, rounds }
  })
}

/** The full transcript so far — the intro plus every answered Q&A — for the
 *  assessor (to judge sufficiency) and the extractor (to build the profile). */
function intakeTranscript(session: IntakeSession): string {
  const qa = session.rounds
    .flatMap((r) => r.questions.map((q, i) => ({ q, a: r.answers[i] ?? '' })))
    .filter((x) => x.a.trim().length > 0)
    .map((x) => `Q: ${x.q}\nA: ${x.a}`)
    .join('\n\n')
  return qa ? `${session.intro}\n\nMore detail I gave:\n${qa}` : session.intro
}

// ---- tailoring and scoring ----

/** TailorCvResult plus any note-stated facts folded in along the way. */
export type TailorResult = TailorCvResult & { newFacts?: ProfileEnrichment }

export async function runTailorCv(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
  userNote?: string,
): Promise<TailorResult> {
  if (!jobText || jobText.trim().length < 80) throw new Error('Paste a bit more of the job description.')
  const llm = client(settings)
  const note = userNote?.trim()

  // The note is candidate-authored, so it's a truth source: extract its facts
  // and enrich the profile BEFORE tailoring — the capability's truth validators
  // then hold with no exceptions. The facts travel back so the caller persists
  // them to the stored profile.
  let tailorProfile = profile
  let newFacts: ProfileEnrichment | undefined
  if (note) {
    onStep?.('Reading your note…')
    const { usage: _usage, ...facts } = await enrichProfile(llm, note, profile)
    newFacts = facts
    tailorProfile = applyEnrichment(profile, facts)
  }

  onStep?.('Tailoring your CV…')
  const result = await tailorCv(llm, tailorProfile, jobText, undefined, note)
  return { ...result, newFacts }
}

export async function runScoreFit(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
): Promise<ScoreFitResult> {
  if (!jobText || jobText.trim().length < 80) throw new Error('Paste a bit more of the job description.')
  onStep?.('Scoring this job against your profile…')
  return scoreFit(client(settings), profile, jobText)
}

export async function runQuickScore(
  settings: Settings,
  profile: Profile,
  jobText: string,
): Promise<QuickScoreResult> {
  return quickScoreFit(client(settings), profile, jobText)
}

// ---- answer bank ----

const POLISH_PROMPT = [
  'You rewrite a job-applicant answer as ONE clear first-person sentence.',
  'Keep every fact exactly as given; add nothing, no filler, no flattery.',
  'Answer in the same language the user wrote in.',
  'If the answer is already a well-formed sentence, return it unchanged.',
  'Return ONLY the rewritten answer text — no quotes, no commentary.',
].join(' ')

/**
 * One clean sentence out of a raw bank answer ("two weeks" → "I can start two
 * weeks after accepting an offer."). Same facts, nothing added.
 */
export async function polishAnswer(settings: Settings, question: string, answer: string): Promise<string> {
  const q = question.trim().slice(0, 300)
  const a = answer.trim()
  if (!a || a.length > 600) return answer
  const res = await client(settings)({
    tier: 'mini',
    temperature: 0.2,
    maxTokens: 300,
    systemPrompt: POLISH_PROMPT,
    input: q ? `Question: ${q}\nAnswer: ${a}` : `Answer: ${a}`,
  })
  const polished = res.text.trim().replace(/^["'“]|["'”]$/g, '')
  // A polish that balloons or vanishes is worse than the original.
  if (!polished || polished.length > Math.max(160, a.length * 3)) return a
  return polished
}

// ---- plumbing ----

async function readPdf(pdf: ArrayBuffer): Promise<string> {
  const text = await extractPdfText(pdf)
  if (text.trim().length < 100) {
    // The server rasterized and OCR'd at this point. There is no offline
    // equivalent worth shipping, so say plainly what will work instead.
    throw new Error(
      'This PDF has almost no selectable text — it is probably a scan. Paste your CV text instead.',
    )
  }
  return text
}

async function pdfTextFromBase64(pdfBase64: string): Promise<string> {
  const bin = atob(pdfBase64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return readPdf(bytes.buffer)
}

/** A delta with every category present — the merge UI reads each array, and a
 *  missing key would read as "the model returned nothing here". */
function emptyDelta(): ProfileDelta {
  return diffProfile(emptyProfile(), emptyProfile())
}
