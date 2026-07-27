// The judge for the no-CV builder. Given the raw transcript gathered so far, it
// decides whether there is ENOUGH real material to write a good resume AT THIS
// PERSON'S LEVEL and, if not, asks the few highest-value questions. It never
// extracts a profile and never invents or implies the user should invent anything.
//
// This is CV-writing quality in the absolute (a strong profile), NOT job fit —
// score-fit / tailor-cv are the job-matching side. The rubric here is internal to
// the builder; a separate profile score / weakness / suggestions system (for
// everyone who already has a resume) is a later, out-of-scope thing.

import { runJsonPass, type LlmClient } from '../../systemAgent'
import type { Persona, ProfileIntent } from '../../../lib/types'

export interface Assessment {
  enough: boolean
  theme: string // short topic heading for this round's questions; '' when enough
  questions: string[]
}

// The persona FOCUS blocks (research-backed: the two personas hit different walls
// — a fresh grad undervalues non-job experience; an experienced worker describes
// duties, not results).
const FRESH_FOCUS =
  `This person is just starting out — a student or someone after their first job, with little or no formal work ` +
  `history. The research is clear: they almost always have MORE relevant material than they wrote down, and they ` +
  `undervalue it. Focus on surfacing non-job experience they didn't mention or only named in passing — class or ` +
  `personal projects, coursework, volunteering, clubs or societies, leadership roles, part-time or casual work — and ` +
  `the transferable skills inside them (what they built, organised, learned or led). Never imply they have "no ` +
  `experience" or that what they have isn't enough.`

const WORKING_FOCUS =
  `This person has been working but never wrote a résumé. They tend to describe DUTIES, not results, and don't know ` +
  `how to frame what they've done. Focus on drawing out concrete outcomes (what they improved, fixed, sped up, saved, ` +
  `or were proud of), scope and scale (team size, how many, how long), and the tools or skills they used. If their ` +
  `work is freelance or many short gigs, help them describe the substance and consolidate it — not list every client.`

// The profile-strength rubric: what makes a good resume, in the absolute. The
// judge scores the material against this — it does NOT read these out.
const RUBRIC =
  `WHAT MAKES A GOOD RESUME — judge the material against these, silently:\n` +
  `1. Positioning: a clear sense of who they are and what they're aimed at (enough to write a headline + summary).\n` +
  `2. Impact, not duties: experiences show outcomes/results, not just responsibilities.\n` +
  `3. Specificity: concrete names, tools, scope — not vague "worked on various things".\n` +
  `4. Quantification where honest: real scale/numbers (team size, %, time, money) IF they exist — NEVER invent them.\n` +
  `5. Skills backed by use: skills tied to where they were actually applied.\n` +
  `6. Section coverage at their level: identity, experience (jobs OR projects/volunteering/clubs), education, skills.\n` +
  `7. A few scannable, front-loaded highlights per experience.\n` +
  `8. Coherence: fragmented gigs consolidated (one freelance block, not one per client); most relevant first.`

// What a professional's PAGE needs, as opposed to a résumé. Not a variation on
// the CV rubric — a different document with different readers. A résumé is read
// by a recruiter deciding whether to interview; a page is read by someone
// deciding whether to hire, book or refer you, and they need to know what you
// do, whether you are credentialed, and how to reach you.
const PRESENCE_RUBRIC =
  `WHAT MAKES A GOOD PROFESSIONAL PAGE — judge the material against these, silently:\n` +
  `1. Positioning: what they do and who they do it for, in one plain line (enough to write a headline + short bio).\n` +
  `2. Services: the concrete things someone can actually engage them for — named, not implied.\n` +
  `3. Who they serve: the kind of client/patient/case they take, and the kind they don't.\n` +
  `4. Credibility: qualifications, licences, registrations, memberships, years in practice, notable employers/clients.\n` +
  `5. Proof: real outcomes for the people they've served — anonymised where it must be; NEVER invent them.\n` +
  `6. Reach: where they're based, where/how they work (in person, remote, which areas), how someone gets in touch.\n` +
  `7. Terms where they're comfortable saying: what an engagement looks like, what it costs, whether they're taking work.\n` +
  `8. Distinctness: what makes them the one to pick over the next person with the same title.`

const CORE =
  `You are given the raw transcript of a guided Q&A so far. Judge ` +
  `it against the rubric and decide: is there ENOUGH real material to write a good profile AT THIS PERSON'S LEVEL?\n` +
  `- If yes: set enough=true, theme="" and return NO questions.\n` +
  `- If not: set enough=false. Pick the SINGLE most valuable topic to explore next and ask 1–3 SHORT, plain ` +
  `questions that ALL belong to that ONE topic — each tied to something they actually said or clearly implied ` +
  `(e.g. "You mentioned fixing the shift rota — what changed after?"). Never generic like "what are your skills?". ` +
  `Give that topic a short 2–4 word "theme" heading in their own words (e.g. "Your project", "Your studies & goals").\n` +
  `ONE TOPIC PER STEP — the flow rule: every step must read as one coherent thought. NEVER mix two topics in one ` +
  `step. You are shown the topics already covered — move FORWARD to the next most useful one; do not re-open a topic ` +
  `already covered. Spending a second step going deeper on the same topic is fine, but never jump back and forth.\n` +
  `LAST STEP: the input tells you when this is the FINAL step (no more after it). Only then, if the material is ` +
  `still thin, you MAY ask up to 4 questions to close the most important remaining gaps — stretch to a 4th only if ` +
  `it genuinely helps; otherwise 1–3 as usual.\n` +
  `LEVEL-RELATIVE BAR: "good" means the strongest HONEST picture of THIS person, not an impressive-looking one. STOP ` +
  `(enough=true) once more questions would only scrape the barrel or pressure them to invent — you never ask them to ` +
  `make anything up. Encouraging, never critical; never imply what they have isn't enough. Ask the questions AND the ` +
  `theme in the SAME language they wrote in.`

// The professional's opening frame. `FRESH_FOCUS`/`WORKING_FOCUS` are about how
// much career someone has; this is about what they want out of it, so it takes
// the same slot rather than adding a third axis.
const FOUND_FOCUS =
  `This person is NOT job hunting. They are a working professional — a doctor, lawyer, consultant, coach, designer ` +
  `or similar — who wants a page to send people to: something that shows what they do and takes enquiries. Do NOT ` +
  `ask résumé questions. Employment dates, notice periods, reporting lines and job-hopping gaps are irrelevant and ` +
  `asking about them signals you misunderstood. They may well describe past roles — treat those as EVIDENCE of ` +
  `expertise, not as a work history to reconstruct. Focus on what they offer, who they offer it to, what qualifies ` +
  `them, and how someone reaches them. If they run their own practice or firm, that is the thing being described, ` +
  `not a job they hold.`

function systemPrompt(persona: Persona, intent: ProfileIntent): string {
  // `found` swaps BOTH halves: the focus block (who we're talking to) and the
  // rubric (what we're judging against). Leaving the résumé rubric in place
  // would have the judge quietly grading a doctor on section coverage.
  if (intent === 'found') return `${CORE}\n\n${FOUND_FOCUS}\n\n${PRESENCE_RUBRIC}`
  const focus = persona === 'starting' ? FRESH_FOCUS : WORKING_FOCUS
  return `${CORE}\n\n${focus}\n\n${RUBRIC}`
}

const schema = {
  type: 'object',
  required: ['enough', 'theme', 'questions'],
  properties: {
    enough: { type: 'boolean', description: 'true when there is enough real material for a good resume at their level' },
    theme: {
      type: 'string',
      description: "A 2–4 word plain heading naming the ONE topic these questions share, in the user's language; empty string when enough",
    },
    questions: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 4,
      description: '0–3 short questions, ALL about the one `theme` topic (up to 4 only on the final step); empty when enough',
    },
  },
} as const

/** One options object rather than six positional args — the fourth boolean in a
 *  row is where call sites start getting them wrong. */
export interface AssessInput {
  transcript: string
  persona: Persona
  intent?: ProfileIntent
  /** What they do, on the `found` branch — a stable key or their own words. */
  profession?: string
  coveredThemes?: string[]
  isFinalRound?: boolean
}

export async function assessSufficiency(client: LlmClient, input: AssessInput): Promise<Assessment> {
  const { transcript, persona, intent = 'hired', profession, coveredThemes = [], isFinalRound = false } = input
  const covered = coveredThemes.map((t) => t.trim()).filter((t) => t.length > 0)
  const finalNote = isFinalRound
    ? 'This is the FINAL step — no more questions after it. If material is still thin you may ask up to 4.'
    : 'More steps are available after this one — ask 1–3.'
  // Profession rides in the INPUT, not the system prompt: it is per-user data,
  // and folding it into the static prompt would fork the prompt cache fifteen
  // ways for one line of context.
  const who = profession?.trim() ? `\nWhat they do: ${profession.trim()}` : ''
  const pass = await runJsonPass<Assessment>(
    {
      client,
      systemPrompt: systemPrompt(persona, intent),
      input: `${finalNote}${who}\nTopics already covered: ${covered.length ? covered.join(', ') : 'none yet'}\n\nTranscript so far:\n${transcript}`,
      schema,
      schemaName: 'Assessment',
      tier: 'mini',
      maxTokens: 800,
    },
    (v) => (typeof v.enough !== 'boolean' || !Array.isArray(v.questions) ? 'enough (boolean) and questions (array) are required.' : null),
  )
  const v = pass.value
  // Fail-safe: if the judge errors out, don't trap the user in the loop — treat as
  // enough and let extraction run with what we have.
  if (!v) return { enough: true, theme: '', questions: [] }
  // Up to 3 questions per step, but the final step may stretch to 4 to close gaps.
  const cap = isFinalRound ? 4 : 3
  const questions = (v.questions ?? []).slice(0, cap).filter((q) => typeof q === 'string' && q.trim().length > 0)
  const enough = v.enough || questions.length === 0
  return { enough, theme: enough ? '' : typeof v.theme === 'string' ? v.theme.trim() : '', questions: enough ? [] : questions }
}
