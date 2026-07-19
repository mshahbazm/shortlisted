// Ported pattern from scnz-app's systemAgent: one wrapper every AI task goes
// through. Structured output = JSON Schema appended to the system prompt +
// repair-parse of the reply. Runtime-agnostic: callers inject an LlmClient,
// so the same capability code runs in the extension (BYOK/local models) and
// on the Shortlisted Cloud server (pi-style provider layer).

export interface LlmRequest {
  systemPrompt: string
  input: string
  temperature?: number
  maxTokens?: number
  // Cost tiering: 'mini' passes (extract/match grunt work) may run on a
  // cheaper model; 'full' passes (writing) get the good one. Clients that
  // only have one model simply ignore this.
  tier?: 'mini' | 'full'
}

export interface LlmResponse {
  text: string
  inputTokens: number
  outputTokens: number
  /** Which model actually served this call (set by clients that know). */
  model?: string
  provider?: string
}

export type LlmClient = (req: LlmRequest) => Promise<LlmResponse>

export interface AgentOptions {
  client: LlmClient
  systemPrompt: string
  input: string
  schema?: object // JSON Schema for the expected output
  schemaName?: string
  temperature?: number
  maxTokens?: number
  tier?: 'mini' | 'full'
}

export interface AgentResult<T = unknown> {
  text: string
  json: T | null
  usage: { inputTokens: number; outputTokens: number }
}

export async function systemAgent<T = unknown>(opts: AgentOptions): Promise<AgentResult<T>> {
  let system = opts.systemPrompt
  if (opts.schema) {
    system +=
      `\n\nReturn ONLY a valid JSON value matching this JSON Schema` +
      (opts.schemaName ? ` ("${opts.schemaName}")` : '') +
      `. No prose, no markdown fences, just the JSON.\n` +
      JSON.stringify(opts.schema)
  }

  const res = await opts.client({
    systemPrompt: system,
    input: opts.input,
    temperature: opts.temperature ?? 0.2,
    maxTokens: opts.maxTokens,
    tier: opts.tier ?? 'full',
  })

  return {
    text: res.text,
    json: opts.schema ? parseWithRepair<T>(res.text) : null,
    usage: { inputTokens: res.inputTokens, outputTokens: res.outputTokens },
  }
}

export function parseWithRepair<T>(raw: string): T | null {
  const attempts: string[] = []
  let text = raw.trim()
  // Strip markdown fences.
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  attempts.push(text)
  // Grab the outermost JSON object/array if there's prose around it.
  const objStart = text.search(/[{[]/)
  if (objStart > 0) attempts.push(text.slice(objStart))
  const lastBrace = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'))
  if (objStart >= 0 && lastBrace > objStart) attempts.push(text.slice(objStart, lastBrace + 1))

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      // try next
    }
    try {
      // Drop trailing commas — the most common model mistake.
      return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')) as T
    } catch {
      // try next
    }
  }
  return null
}

// Ported pattern from scnz-app's runJsonPass: validate -> one retry with the
// error fed back -> null (caller decides how to degrade).
export async function runJsonPass<T>(
  opts: AgentOptions,
  validate: (value: T) => string | null, // return an error message, or null if valid
): Promise<{ value: T | null; usage: { inputTokens: number; outputTokens: number } }> {
  const usage = { inputTokens: 0, outputTokens: 0 }

  const first = await systemAgent<T>(opts)
  usage.inputTokens += first.usage.inputTokens
  usage.outputTokens += first.usage.outputTokens
  const error = first.json === null ? 'Response was not valid JSON.' : validate(first.json)
  if (first.json !== null && error === null) return { value: first.json, usage }

  const retry = await systemAgent<T>({
    ...opts,
    input:
      opts.input +
      `\n\n---\nYour previous answer was rejected: ${error}\n` +
      `Previous answer:\n${first.text.slice(0, 2000)}\n` +
      `Fix it and return ONLY valid JSON matching the schema.`,
  })
  usage.inputTokens += retry.usage.inputTokens
  usage.outputTokens += retry.usage.outputTokens
  if (retry.json !== null && validate(retry.json) === null) return { value: retry.json, usage }

  return { value: null, usage }
}
