// The one entry point the UI calls for AI work. Everything runs on
// Shortlisted Cloud — capabilities execute server-side against the /v1 API
// (the capability code itself lives in ./capabilities, shared with the server).

import {
  ApplicationRecord,
  BankAnswer,
  FitScoreRecord,
  Profile,
  QueueItem,
  ResumeVariant,
  Settings,
} from '../lib/types'
import { cloudBaseUrl } from '../lib/config'
import * as store from '../lib/store'
import type { TailorCvResult } from './capabilities/tailor-cv'
import type { QuickScoreResult, ScoreFitResult } from './capabilities/score-fit'

export type { QuickScoreResult, ScoreFitResult }

export async function runExtractProfile(settings: Settings, cvText: string): Promise<Profile> {
  return cloudCall<Profile>(settings, '/v1/extract-profile', { cvText })
}

export async function runTailorCv(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
): Promise<TailorCvResult> {
  onStep?.('Tailoring on Shortlisted Cloud…')
  return cloudCall<TailorCvResult>(settings, '/v1/tailor-cv', { profile, jobText })
}

export async function runScoreFit(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
): Promise<ScoreFitResult> {
  onStep?.('Scoring on Shortlisted Cloud…')
  return cloudCall<ScoreFitResult>(settings, '/v1/score-fit', { profile, jobText })
}

export async function runQuickScore(
  settings: Settings,
  profile: Profile,
  jobText: string,
): Promise<QuickScoreResult> {
  return cloudCall<QuickScoreResult>(settings, '/v1/score-fit', { profile, jobText, quick: true })
}

// Send the PDF itself so the server can OCR scanned resumes.
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
  verified: boolean
  email: string | null
}

export async function cloudUsage(settings: Settings): Promise<CloudUsage> {
  return cloudCall<CloudUsage>(settings, '/v1/me', undefined, 'GET')
}

// ---- account (email OTP; links this device to the user) ----

export async function sendLoginCode(settings: Settings, email: string): Promise<void> {
  await cloudCall(settings, '/v1/auth/send-code', { email })
}

export async function verifyLoginCode(settings: Settings, email: string, otp: string): Promise<CloudUsage> {
  const res = await cloudCall<CloudUsage>(settings, '/v1/auth/verify', { email, otp })
  await store.update('settings', (s) => ({ ...s, accountEmail: res.email ?? email }))
  return res
}

// ---- account data (server holds the source of truth; see background mirror) ----

export interface CloudData {
  profile: Profile | null
  visibility: string
  resumes: ResumeVariant[]
  applications: ApplicationRecord[]
  savedJobs: QueueItem[]
  answers: BankAnswer[]
  fitScores: Record<string, FitScoreRecord>
}

export async function fetchCloudData(settings: Settings): Promise<CloudData> {
  return cloudCall<CloudData>(settings, '/v1/data', undefined, 'GET')
}

export async function pushCloudData(settings: Settings, patch: Record<string, unknown>): Promise<void> {
  await cloudCall(settings, '/v1/data', patch, 'PUT')
}

// ---- plumbing ----

async function cloudCall<T>(
  settings: Settings,
  path: string,
  body?: unknown,
  method: 'GET' | 'POST' | 'PUT' = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const token = await ensureDeviceToken(settings)
  const res = await cloudFetch(settings, path, {
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
      `Shortlisted Cloud error ${res.status}. Is the server running at ${cloudBaseUrl(settings)}?`
    console.error(`[shortlisted] cloud ${method} ${path} → ${res.status}:`, msg)
    throw new Error(msg)
  }
  return data as T
}

// fetch() rejects with a bare "Failed to fetch" when nothing answers (server
// down, or a stale URL saved in Settings). Rethrow with the address so the
// user can actually see what to fix.
async function cloudFetch(settings: Settings, path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(cloudBaseUrl(settings) + path, init)
  } catch (e) {
    console.error(`[shortlisted] cloud unreachable: ${cloudBaseUrl(settings)}${path}`, e)
    throw new Error(
      `Could not reach Shortlisted Cloud at ${cloudBaseUrl(settings)}. ` +
        'Is the server running? Check the Cloud server URL in Settings.',
    )
  }
}

async function ensureDeviceToken(settings: Settings): Promise<string> {
  if (settings.cloudToken) return settings.cloudToken
  const res = await cloudFetch(settings, '/v1/device', { method: 'POST' })
  if (!res.ok) throw new Error(`Could not reach Shortlisted Cloud at ${cloudBaseUrl(settings)}.`)
  const { token } = (await res.json()) as { token: string }
  // Persist for next time (read-modify-write against live storage, not the
  // possibly-stale settings object we were handed).
  await store.update('settings', (s) => ({ ...s, cloudToken: token }))
  return token
}
