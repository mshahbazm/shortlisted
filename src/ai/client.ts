// The BYOK transport: an LlmClient backed by one OpenAI-compatible endpoint.
//
// Calls go from the extension straight to whatever endpoint the user set. There
// is no server of ours in the middle, which is the whole point — their key,
// their account, their bill, and their job history never passing through us.
//
// Only /chat/completions is spoken. See the note on Settings for why one wire
// format covers every provider worth reaching.

import { AiProbe, Settings } from '../lib/types'
import type { LlmClient, LlmRequest, LlmResponse } from './systemAgent'

export class AiNotConfiguredError extends Error {
  constructor() {
    super('No AI endpoint set up yet. Add one in Settings — any OpenAI-compatible API works.')
    this.name = 'AiNotConfiguredError'
  }
}

/** Common endpoints, offered as one-tap fills on the Settings screen. `key: false`
 *  marks a local runner that normally needs no credential. Not a whitelist —
 *  anything OpenAI-compatible can be typed in. */
/** What a fresh install starts on, so the common case is one key away from
 *  working rather than two fields of homework. Anything here can be replaced —
 *  it is a starting point, not a restriction. */
export const DEFAULT_ENDPOINT = 'https://api.openai.com/v1'
export const DEFAULT_MODEL = 'gpt-5.6-luna'

export const ENDPOINT_PRESETS: { label: string; url: string; key: boolean; hint: string }[] = [
  { label: 'OpenAI', url: DEFAULT_ENDPOINT, key: true, hint: DEFAULT_MODEL },
  { label: 'OpenRouter', url: 'https://openrouter.ai/api/v1', key: true, hint: 'one key, most models' },
  { label: 'Groq', url: 'https://api.groq.com/openai/v1', key: true, hint: 'fast, open models' },
  { label: 'Together', url: 'https://api.together.xyz/v1', key: true, hint: 'open models' },
  { label: 'Google Gemini', url: 'https://generativelanguage.googleapis.com/v1beta/openai', key: true, hint: 'gemini-2.5-flash' },
  { label: 'LM Studio', url: 'http://localhost:1234/v1', key: false, hint: 'on this machine' },
  { label: 'Ollama', url: 'http://localhost:11434/v1', key: false, hint: 'on this machine' },
  { label: 'llama.cpp', url: 'http://localhost:8080/v1', key: false, hint: 'on this machine' },
]

/** Trim a user-typed base URL: no trailing slash, no accidental /chat/completions. */
export function normalizeEndpoint(raw: string): string {
  return raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions$/, '')
}

/**
 * The client every capability runs on.
 *
 * `req.tier` is ignored: capabilities still declare whether a pass is grunt
 * work or writing, but there is one configured model and both go to it. The
 * tier stays in the contract because it costs nothing and a future build could
 * honour it again — asking every user to pick a second, cheaper model before
 * they had run the thing once was the part that wasn't worth it.
 */
export function makeLlmClient(settings: Settings): LlmClient {
  const endpoint = normalizeEndpoint(settings.aiEndpoint ?? '')
  const model = settings.aiModel?.trim() ?? ''
  if (!endpoint || !model) throw new AiNotConfiguredError()
  // Two seeds, both cheap. The table covers model families we already know
  // about; the probe result covers whatever this specific endpoint turned out
  // to refuse. Either way a fresh service worker starts knowing.
  for (const p of seededRefusals(model)) refused.add(p)
  for (const p of settings.aiProbe?.refusedParams ?? []) refused.add(p)

  return async (req: LlmRequest): Promise<LlmResponse> =>
    withRetry(() => complete(endpoint, settings.aiKey, model, req))
}

/**
 * Optional parameters an endpoint has told us it will not accept.
 *
 * Providers disagree about these, and the disagreement is a hard 400 rather
 * than something ignorable — OpenAI's newer models reject `temperature: 0`
 * outright ("Only the default (1) value is supported"), while every local
 * runner and most gateways honour it. Guessing wrong in either direction
 * breaks somebody, so the client sends the parameter, and if the endpoint
 * names it in a 400, drops it and retries. Learned once per worker lifetime;
 * relearning costs a single wasted call.
 *
 * Only parameters we can lose without changing what the model is asked to DO
 * belong here. Temperature qualifies: it makes structured output steadier where
 * it is supported, and its absence costs some determinism, not correctness.
 */
const refused = new Set<string>()
const DROPPABLE = new Set(['temperature'])

/**
 * What we already know some model families refuse, by id prefix.
 *
 * This is the durable half of what the cloud's provider registry carried (it
 * tracked, among other things, which providers wanted `max_tokens` versus
 * `max_completion_tokens`). Dropping that table is what cost two 400s in a
 * single evening.
 *
 * Purely an optimisation: it makes the FIRST call right instead of the second.
 * Never a gate — a model that is not listed still works, and one listed wrongly
 * still corrects itself through the refusal path. So a stale entry costs
 * nothing worse than a parameter we did not need to omit.
 */
const KNOWN_REFUSALS: { prefix: string; params: string[] }[] = [
  // OpenAI's newer models accept temperature only at its default of 1:
  // "Unsupported value: 'temperature' does not support 0 with this model."
  { prefix: 'gpt-5', params: ['temperature'] },
  { prefix: 'o1', params: ['temperature'] },
  { prefix: 'o3', params: ['temperature'] },
  { prefix: 'o4', params: ['temperature'] },
]

/** Everything known to be refused by a model id, before it has been tried. */
export function seededRefusals(modelId: string): string[] {
  const id = modelId.trim().toLowerCase()
  return KNOWN_REFUSALS.filter((r) => id.startsWith(r.prefix)).flatMap((r) => r.params)
}

/** The `param` from an OpenAI-shaped 400, when the complaint is about a
 *  parameter rather than the request as a whole. */
function refusedParam(body: string): string | null {
  try {
    const e = JSON.parse(body)?.error
    const param = typeof e?.param === 'string' ? e.param : ''
    const unsupported = /unsupported|not supported|does not support/i.test(String(e?.message ?? '') + String(e?.code ?? ''))
    return param && unsupported && DROPPABLE.has(param) ? param : null
  } catch {
    return null
  }
}

async function complete(
  endpoint: string,
  apiKey: string | undefined,
  model: string,
  req: LlmRequest,
): Promise<LlmResponse> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (apiKey?.trim()) headers.authorization = `Bearer ${apiKey.trim()}`

  const res = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      ...(refused.has('temperature') ? {} : { temperature: req.temperature ?? 0.2 }),
      // No output cap is sent. The previous version sent both max_tokens and
      // max_completion_tokens on the theory that servers ignore parameters they
      // do not know — they do not: OpenAI's newer models reject max_tokens
      // outright with a 400, which made the default model unusable.
      //
      // Sending only max_completion_tokens would fix that and break the local
      // runners that only know the older name. Sending neither works
      // everywhere, and is better anyway: every capability here asks for
      // structured JSON, and the usual way a cap hurts is by truncating a long
      // extraction mid-object so the parse fails. Providers apply their own
      // sane defaults, and the user is paying their own bill.
      messages: [
        { role: 'system', content: req.systemPrompt },
        {
          role: 'user',
          // Plain string unless there are images: the multimodal array shape is
          // universally understood, but a plain string is understood by even
          // more, so it stays the default for the 99% of calls with no images.
          content: req.images?.length
            ? [
                { type: 'text', text: req.input },
                ...req.images.map((url) => ({ type: 'image_url', image_url: { url } })),
              ]
            : req.input,
        },
      ],
    }),
  }).catch((e) => {
    // fetch() rejects with a bare "Failed to fetch" for a dead host, a bad
    // scheme, or a CORS refusal — all of which look identical here. Say which
    // address failed so the user can see what to fix.
    throw new Error(`Could not reach ${endpoint} — is it running, and does it allow browser requests? (${e})`)
  })

  if (!res.ok) {
    const body = await res.text()
    // "You sent a parameter I don't take" is recoverable, and the endpoint has
    // just told us which one. Drop it and go again — once, because the retry
    // cannot hit the same complaint twice.
    const param = refusedParam(body)
    if (param && !refused.has(param)) {
      refused.add(param)
      return complete(endpoint, apiKey, model, req)
    }
    throw new Error(`AI endpoint error ${res.status}: ${body.slice(0, 300)}`)
  }
  const raw = await res.text()
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new UnreadableResponseError(endpoint, raw)
  }
  const text = readReplyText(data)
  if (text === null) throw new UnreadableResponseError(endpoint, raw)

  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage
  return {
    text,
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    model,
  }
}

/**
 * The endpoint answered, but not in a shape we recognise.
 *
 * Its own class because it must NOT be retried: a body we cannot read will not
 * become readable on the fourth attempt, and the old code spent all four before
 * reporting "the model returned an empty answer" — which is both slow and a
 * description of the wrong problem.
 */
export class UnreadableResponseError extends Error {
  constructor(endpoint: string, body: string) {
    super(
      `${endpoint} answered, but not in a shape this extension understands. ` +
        `That usually means it is not really OpenAI-compatible, or the model ` +
        `returns its answer somewhere unusual. Response began: ${body.slice(0, 200)}`,
    )
    this.name = 'UnreadableResponseError'
  }
}

/**
 * Pull the reply text out of a chat-completions response.
 *
 * Providers agree on `choices[0].message.content` as a string most of the time,
 * and then don't: the multimodal shape makes `content` an array of parts, and
 * some servers put the text directly on the choice. Try each, in that order.
 *
 * Returns `null` — not `''` — when none of them apply, because the difference
 * matters. An empty string is a model that answered with nothing, which is a
 * real and retryable provider hiccup. `null` is a response we could not read at
 * all, which is permanent and worth saying out loud.
 */
export function readReplyText(data: unknown): string | null {
  const choice = (data as { choices?: unknown[] })?.choices?.[0] as
    | { message?: { content?: unknown }; text?: unknown }
    | undefined
  if (!choice) return null

  const content = choice.message?.content
  if (typeof content === 'string') return content

  // Multimodal: content is a list of parts, only some of which are text.
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : typeof (part as { text?: unknown })?.text === 'string' ? (part as { text: string }).text : ''))
      .join('')
  }

  if (typeof choice.text === 'string') return choice.text
  return null
}

// Bounded exponential backoff with jitter, ported from the server client. Empty
// output counts as retryable — it is the usual shape of provider overload.
const MAX_ATTEMPTS = 4
const BACKOFF_BASE_MS = 500
const BACKOFF_CAP_MS = 8000

async function withRetry(call: () => Promise<LlmResponse>): Promise<LlmResponse> {
  let lastError: unknown = null
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const expo = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (attempt - 1))
      await new Promise((r) => setTimeout(r, expo * (0.5 + Math.random() * 0.5)))
    }
    try {
      const res = await call()
      if (!res.text.trim()) {
        lastError = new Error('The model returned an empty answer.')
        continue
      }
      return res
    } catch (e) {
      lastError = e
      // Permanent by construction: the body will not change shape on a retry.
      if (e instanceof UnreadableResponseError) throw e
      // 4xx other than 429 will not heal — a bad key or an unknown model is
      // still bad three seconds later, and retrying just delays the message.
      if (/error 4(?!29)\d\d/.test(e instanceof Error ? e.message : String(e))) throw e
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

// ---------- capability probe ----------

// A 1x1 transparent PNG. Small enough to be free, real enough that an endpoint
// which cannot take image parts will reject it.
const PIXEL_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

/**
 * Ask the configured model to do the two things we actually need, and record
 * what happened.
 *
 * This exists because an OpenAI-compatible endpoint tells you almost nothing
 * reliable about the model behind it. A gateway will happily list a model it
 * proxies badly; a local 3B model will accept a JSON-schema prompt and then
 * return prose. The only trustworthy answer is the one the endpoint gives to
 * the request we are going to send it, so we send a tiny version of it.
 *
 * Two calls, a few hundred tokens total. `json` gates every capability; `vision`
 * gates reading scanned CVs and nothing else.
 */
export async function probeCapabilities(settings: Settings): Promise<AiProbe> {
  const endpoint = normalizeEndpoint(settings.aiEndpoint ?? '')
  const model = settings.aiModel?.trim() ?? ''
  const probe: AiProbe = { at: Date.now(), endpoint, model, json: false, vision: false }
  for (const p of seededRefusals(model)) refused.add(p)
  const before = new Set(refused)
  if (!endpoint || !model) return { ...probe, error: 'Set an endpoint and a model first.' }

  // 1. Structured output — the capability the whole product stands on.
  try {
    const res = await complete(endpoint, settings.aiKey, model, {
      systemPrompt:
        'You return JSON and nothing else.\n\nReturn ONLY a valid JSON value matching this JSON Schema. ' +
        'No prose, no markdown fences, just the JSON.\n' +
        '{"type":"object","properties":{"ok":{"type":"boolean"},"n":{"type":"integer"}},"required":["ok","n"]}',
      input: 'Set ok to true and n to 7.',
      temperature: 0,
    })
    const parsed = JSON.parse(res.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
    probe.json = parsed?.ok === true && parsed?.n === 7
    // Anything the endpoint refused during that call is now known; record it so
    // every later client starts already knowing.
    probe.refusedParams = [...refused].filter((p) => !before.has(p))
    if (!probe.json) probe.error = `The model answered, but not with the JSON it was asked for: ${res.text.slice(0, 120)}`
  } catch (e) {
    // A failure here is usually the endpoint or the key, not the model — and it
    // is the message the user needs, so it wins over any later one.
    return { ...probe, error: e instanceof Error ? e.message : String(e) }
  }

  // 2. Images. Failure is expected and fine on text-only models, so it never
  // becomes `error` — it just leaves scanned-CV reading switched off.
  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (settings.aiKey?.trim()) headers.authorization = `Bearer ${settings.aiKey.trim()}`
    const res = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Reply with the word: seen' },
              { type: 'image_url', image_url: { url: PIXEL_PNG } },
            ],
          },
        ],
      }),
    })
    probe.vision = res.ok
  } catch {
    probe.vision = false
  }

  return probe
}
