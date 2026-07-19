// Fill assist: the reasoning layer behind form filling. The deterministic
// filler handles everything it is CERTAIN about; the leftover fields — odd
// phrasings, other languages, dropdown vocabularies, answers that must be
// composed from several known facts — come here as ONE batched call.
//
// The truth rule is absolute: answers come only from the provided profile and
// saved answers. A field the facts can't answer returns null and stays with
// the human.

import { Profile } from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'

export interface AssistField {
  id: number
  question: string
  kind: string // 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | …
  /** For select/radio: the EXACT visible option texts. */
  options?: string[]
  required?: boolean
}

export interface AssistAnswer {
  question: string
  answer: string
}

export interface AssistResultItem {
  id: number
  /** Exact text to fill (for options fields: one of the given options), or null. */
  value: string | null
  /** When the field is just a rephrasing of a saved answer, that answer's question. */
  fromSavedQuestion?: string
}

/** An already-filled field whose value carries doubt (fuzzy match, option pick). */
export interface VerifyField {
  id: number
  question: string
  kind: string
  options?: string[]
  currentValue: string
}

export interface CorrectionItem {
  id: number
  /** The right value per the facts (options fields: one of the options). */
  value: string
}

export interface FillAssistResult {
  results: AssistResultItem[]
  corrections: CorrectionItem[]
  usage: { inputTokens: number; outputTokens: number }
}

const assistSchema = {
  type: 'object',
  required: ['results', 'corrections'],
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'value'],
        properties: {
          id: { type: 'integer' },
          value: { type: ['string', 'null'] },
          fromSavedQuestion: { type: 'string' },
        },
      },
    },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'value'],
        properties: {
          id: { type: 'integer' },
          value: { type: 'string' },
        },
      },
    },
  },
} as const

const ASSIST_PROMPT =
  `You fill job-application form fields on behalf of a candidate, using ONLY the candidate's ` +
  `profile and saved answers provided below. You never invent, guess, or embellish a fact.\n\n` +
  `For each field:\n` +
  `- If the profile or a saved answer contains the needed fact (even phrased differently or in ` +
  `another language), produce the value. You may COMBINE several known facts into one answer ` +
  `when the question requires it.\n` +
  `- Fields with an "options" list are dropdowns/radios: value MUST be exactly one string from ` +
  `that list — pick the option that best matches the candidate's facts. Never output anything ` +
  `not in the list.\n` +
  `- Write free-text values in the LANGUAGE THE QUESTION IS WRITTEN IN, as one clean, complete ` +
  `answer (no filler).\n` +
  `- If the field is essentially a rephrasing of one saved answer's question, set ` +
  `fromSavedQuestion to that saved question verbatim.\n` +
  `- If the facts do not answer the field, value = null. A null is ALWAYS better than a guess — ` +
  `a wrong answer on an application harms the candidate.\n` +
  `- Never answer demographic/EEO survey questions (race, gender, veteran status, disability): ` +
  `those are null, they belong to the human.\n\n` +
  `The "verifyFilled" list contains fields that were ALREADY auto-filled with "currentValue". ` +
  `Review each against the facts: if the current value is right or defensible, do NOT mention it. ` +
  `Only when it is clearly wrong (mismatched meaning, wrong option picked) add {id, value} to ` +
  `"corrections" with the correct value — same rules as above. If you cannot derive the correct ` +
  `value, leave the field alone: corrections are only for confident fixes.`

export async function fillAssist(
  client: LlmClient,
  fields: AssistField[],
  verify: VerifyField[],
  profile: Profile | null,
  answers: AssistAnswer[],
): Promise<FillAssistResult> {
  const input = JSON.stringify({ fields, verifyFilled: verify, profile: profile ?? undefined, savedAnswers: answers })
  const ids = new Set(fields.map((f) => f.id))
  const byId = new Map(fields.map((f) => [f.id, f]))
  const verifyIds = new Set(verify.map((f) => f.id))
  const verifyById = new Map(verify.map((f) => [f.id, f]))

  const { value, usage } = await runJsonPass<{ results: AssistResultItem[]; corrections: CorrectionItem[] }>(
    {
      client,
      systemPrompt: ASSIST_PROMPT,
      input,
      schema: assistSchema,
      schemaName: 'fillAssist',
      tier: 'mini',
      maxTokens: 2000,
    },
    (v) => {
      if (!Array.isArray(v.results)) return 'results must be an array'
      for (const r of v.results) {
        if (!ids.has(r.id)) return `unknown field id ${r.id}`
        const opts = byId.get(r.id)?.options
        if (r.value !== null && opts?.length && !opts.includes(r.value)) {
          return `field ${r.id}: value must be exactly one of the given options or null`
        }
      }
      if (!Array.isArray(v.corrections)) return 'corrections must be an array'
      for (const cor of v.corrections) {
        if (!verifyIds.has(cor.id)) return `unknown verify id ${cor.id}`
        const opts = verifyById.get(cor.id)?.options
        if (typeof cor.value !== 'string' || (opts?.length && !opts.includes(cor.value))) {
          return `correction ${cor.id}: value must be exactly one of the given options`
        }
      }
      return null
    },
  )

  return { results: value?.results ?? [], corrections: value?.corrections ?? [], usage }
}
