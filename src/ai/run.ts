// The one entry point the UI calls for AI work. Routes to:
//  - Shortlisted Cloud (capability runs server-side; no key on the machine), or
//  - a local LlmClient (BYOK / Ollama / LM Studio) running the same capability
//    code right here in the extension.

import { Profile, Settings } from '../lib/types'
import * as store from '../lib/store'
import { clientFromSettings } from './client'
import { extractProfile } from './capabilities/extract-profile'
import { TailorCvResult, tailorCv } from './capabilities/tailor-cv'
import { QuickScoreResult, ScoreFitResult, quickScoreFit, scoreFit } from './capabilities/score-fit'

export type { QuickScoreResult, ScoreFitResult }

export async function runExtractProfile(settings: Settings, cvText: string): Promise<Profile> {
  if (settings.aiProvider === 'cloud') {
    return cloudCall<Profile>(settings, '/v1/extract-profile', { cvText })
  }
  return extractProfile(clientFromSettings(settings), cvText)
}

export async function runTailorCv(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
): Promise<TailorCvResult> {
  if (settings.aiProvider === 'cloud') {
    onStep?.('Tailoring on Shortlisted Cloud…')
    return cloudCall<TailorCvResult>(settings, '/v1/tailor-cv', { profile, jobText })
  }
  return tailorCv(clientFromSettings(settings), profile, jobText, onStep)
}

export async function runScoreFit(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
): Promise<ScoreFitResult> {
  if (settings.aiProvider === 'cloud') {
    onStep?.('Scoring on Shortlisted Cloud…')
    return cloudCall<ScoreFitResult>(settings, '/v1/score-fit', { profile, jobText })
  }
  return scoreFit(clientFromSettings(settings), profile, jobText, onStep)
}

export async function runQuickScore(
  settings: Settings,
  profile: Profile,
  jobText: string,
): Promise<QuickScoreResult> {
  if (settings.aiProvider === 'cloud') {
    return cloudCall<QuickScoreResult>(settings, '/v1/score-fit', { profile, jobText, quick: true })
  }
  return quickScoreFit(clientFromSettings(settings), profile, jobText)
}

// Cloud-only: send the PDF itself so the server can OCR scanned resumes.
// (Local providers read the text layer only — no OCR wasm in the extension.)
export async function cloudParseResumePdf(
  settings: Settings,
  pdf: ArrayBuffer,
): Promise<{ profile: Profile; method: 'text' | 'ocr'; quality: string }> {
  const bytes = new Uint8Array(pdf)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return cloudCall(settings, '/v1/parse-resume', { pdfBase64: btoa(bin) })
}

export interface CloudUsage {
  plan: 'free' | 'pro'
  creditsUsed: number
  creditsLimit: number
}

export async function cloudUsage(settings: Settings): Promise<CloudUsage> {
  return cloudCall<CloudUsage>(settings, '/v1/me', undefined, 'GET')
}

export async function activateLicense(settings: Settings, key: string): Promise<CloudUsage> {
  return cloudCall<CloudUsage>(settings, '/v1/license', { key })
}

// ---- plumbing ----

async function cloudCall<T>(
  settings: Settings,
  path: string,
  body?: unknown,
  method: 'GET' | 'POST' = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const token = await ensureDeviceToken(settings)
  const res = await fetch(settings.cloudUrl.replace(/\/$/, '') + path, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      (data as { error?: string } | null)?.error ??
      `Shortlisted Cloud error ${res.status}. Is the server running at ${settings.cloudUrl}?`
    throw new Error(msg)
  }
  return data as T
}

async function ensureDeviceToken(settings: Settings): Promise<string> {
  if (settings.cloudToken) return settings.cloudToken
  const res = await fetch(settings.cloudUrl.replace(/\/$/, '') + '/v1/device', { method: 'POST' })
  if (!res.ok) throw new Error(`Could not reach Shortlisted Cloud at ${settings.cloudUrl}.`)
  const { token } = (await res.json()) as { token: string }
  // Persist for next time (read-modify-write against live storage, not the
  // possibly-stale settings object we were handed).
  await store.update('settings', (s) => ({ ...s, cloudToken: token }))
  return token
}
