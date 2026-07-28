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

  return async (req: LlmRequest): Promise<LlmResponse> =>
    withRetry(() => complete(endpoint, settings.aiKey, model, req))
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
      temperature: req.temperature ?? 0.2,
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
        { role: 'user', content: req.input },
      ],
    }),
  }).catch((e) => {
    // fetch() rejects with a bare "Failed to fetch" for a dead host, a bad
    // scheme, or a CORS refusal — all of which look identical here. Say which
    // address failed so the user can see what to fix.
    throw new Error(`Could not reach ${endpoint} — is it running, and does it allow browser requests? (${e})`)
  })

  if (!res.ok) throw new Error(`AI endpoint error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    model,
  }
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
