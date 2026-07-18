// Thin fetch-based provider layer. BYOK: calls go straight from the extension
// to the provider — no middleman server. Same role as pi-ai in scnz-app, but
// dependency-free so it bundles cleanly into an MV3 worker/panel.

import { Settings } from '../lib/types'
import { LlmRequest, LlmResponse } from './systemAgent'

export class AiNotConfiguredError extends Error {
  constructor() {
    super('No AI provider configured. Add your API key in Settings.')
  }
}

export async function complete(settings: Settings, req: LlmRequest): Promise<LlmResponse> {
  switch (settings.aiProvider) {
    case 'anthropic':
      return anthropic(settings, req)
    case 'openai':
      return openaiCompatible('https://api.openai.com/v1', settings.openaiKey, settings.openaiModel, req)
    case 'custom':
      // LM Studio, Jan, LocalAI, vLLM, OpenRouter — anything OpenAI-compatible.
      return openaiCompatible(settings.customEndpoint, settings.customKey, settings.customModel, req)
    case 'ollama':
      return ollama(settings, req)
    default:
      throw new AiNotConfiguredError()
  }
}

async function anthropic(s: Settings, req: LlmRequest): Promise<LlmResponse> {
  if (!s.anthropicKey) throw new AiNotConfiguredError()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': s.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: s.anthropicModel,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature ?? 0.2,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.input }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return {
    text: (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join(''),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

async function openaiCompatible(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  req: LlmRequest,
): Promise<LlmResponse> {
  const isLocal = /\/\/(localhost|127\.0\.0\.1)[:/]/.test(baseUrl)
  if (!apiKey && !isLocal) throw new AiNotConfiguredError()
  if (!model) throw new Error('Set a model name in Settings (the exact name your server shows).')
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (apiKey) headers.authorization = `Bearer ${apiKey}`
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxTokens ?? 4096,
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.input },
      ],
    }),
  })
  if (!res.ok) throw new Error(`AI server error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  }
}

async function ollama(s: Settings, req: LlmRequest): Promise<LlmResponse> {
  const res = await fetch(`${s.ollamaEndpoint.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: s.ollamaModel,
      stream: false,
      options: { temperature: req.temperature ?? 0.2 },
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.input },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Ollama error ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = await res.json()
  return {
    text: data.message?.content ?? '',
    inputTokens: data.prompt_eval_count ?? 0,
    outputTokens: data.eval_count ?? 0,
  }
}
