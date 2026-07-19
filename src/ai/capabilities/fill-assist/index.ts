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

export interface FillAssistResult {
  results: AssistResultItem[]
  usage: { inputTokens: number; outputTokens: number }
}

const assistSchema = {
  type: 'object',
  required: ['results'],
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
  `those are null, they belong to the human.`

export async function fillAssist(
  client: LlmClient,
  fields: AssistField[],
  profile: Profile | null,
  answers: AssistAnswer[],
): Promise<FillAssistResult> {
  const input = JSON.stringify({ fields, profile: profile ?? undefined, savedAnswers: answers })
  const ids = new Set(fields.map((f) => f.id))
  const byId = new Map(fields.map((f) => [f.id, f]))

  const { value, usage } = await runJsonPass<{ results: AssistResultItem[] }>(
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
      return null
    },
  )

  return { results: value?.results ?? [], usage }
}
