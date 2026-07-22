// The one entry point the UI calls for AI work. Everything runs on
// Shortlisted Cloud — capabilities execute server-side against the /v1 API
// (the capability code itself lives in ./capabilities, shared with the server).

import {
  ApplicationRecord,
  BankAnswer,
  FitScoreRecord,
  PendingQuestion,
  Profile,
  QueueItem,
  ResumeVariant,
  Settings,
  bytesToBase64,
} from '../lib/types'
import { cloudBaseUrl } from '../lib/config'
import * as store from '../lib/store'
import type { TailorCvResult } from './capabilities/tailor-cv'
import type { QuickScoreResult, ScoreFitResult } from './capabilities/score-fit'
import type { AssistField, AssistResultItem, CorrectionItem, VerifyField } from './capabilities/fill-assist'
import type { IntakeNewFacts } from './capabilities/resume-intake'

export type { QuickScoreResult, ScoreFitResult }
export type { AssistField, AssistResultItem, CorrectionItem, VerifyField }

/**
 * Uploaded-CV intake: role/field tags for the CV plus profile facts it
 * contains that the account is missing (additive only). Free micro-call.
 */
export async function cloudResumeIntake(settings: Settings, pdfBase64: string): Promise<IntakeNewFacts> {
  return cloudCall<IntakeNewFacts>(settings, '/v1/resume-intake', { pdfBase64 })
}

/** Free-form profile note ("I worked with Webflow at X") → additive facts. */
export async function cloudProfileNote(settings: Settings, text: string): Promise<IntakeNewFacts> {
  return cloudCall<IntakeNewFacts>(settings, '/v1/resume-intake', { text })
}

/**
 * The reasoning layer for form filling: ONE batched call covering both the
 * fields the deterministic filler couldn't handle and the uncertain fills it
 * wants double-checked. The server answers from the account's stored profile
 * + answer bank — the extension only sends the fields.
 */
export async function cloudFillAssist(
  settings: Settings,
  fields: AssistField[],
  verify: VerifyField[],
): Promise<{ results: AssistResultItem[]; corrections: CorrectionItem[] }> {
  return cloudCall(settings, '/v1/fill-assist', { fields, verify })
}

export async function runExtractProfile(settings: Settings, cvText: string): Promise<Profile> {
  return cloudCall<Profile>(settings, '/v1/extract-profile', { cvText })
}

export interface BuildProfileResult {
  profile: Profile
  questions: string[]
}

/** No-CV builder: free-form text -> a starting profile + follow-up questions.
 *  `persona` steers the questions (fresh grad vs experienced). Pass `answers` on
 *  the second call to enrich (no new questions come back). */
export async function runBuildProfile(
  settings: Settings,
  intro: string,
  persona: 'starting' | 'working',
  answers?: { q: string; a: string }[],
): Promise<BuildProfileResult> {
  return cloudCall<BuildProfileResult>(settings, '/v1/build-profile', { intro, persona, answers })
}

/** TailorCvResult plus any note-stated facts the server folded in. */
export type CloudTailorResult = TailorCvResult & { newFacts?: IntakeNewFacts }

export async function runTailorCv(
  settings: Settings,
  profile: Profile,
  jobText: string,
  onStep?: (step: string) => void,
  userNote?: string,
): Promise<CloudTailorResult> {
  onStep?.('Tailoring on Shortlisted Cloud…')
  return cloudCall<CloudTailorResult>(settings, '/v1/tailor-cv', { profile, jobText, userNote: userNote || undefined })
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


/**
 * PDF → plain text on the server (OCR fallback for scanned resumes). No LLM
 * runs and no credit is spent — works before sign-up. Onboarding uses this as
 * the fallback when the local text layer reads poorly.
 */
export async function cloudPdfText(
  settings: Settings,
  pdf: ArrayBuffer,
): Promise<{ text: string; method: 'text' | 'ocr'; quality: string }> {
  return cloudCall(settings, '/v1/pdf-text', { pdfBase64: bytesToBase64(pdf) })
}

// Send the PDF itself so the server can OCR scanned resumes. Account required.
export async function cloudParseResumePdf(
  settings: Settings,
  pdf: ArrayBuffer,
): Promise<{ profile: Profile; method: 'text' | 'ocr'; quality: string }> {
  return cloudCall(settings, '/v1/parse-resume', { pdfBase64: bytesToBase64(pdf) })
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

/**
 * One clean sentence out of a raw bank answer ("two weeks" → "I can start two
 * weeks after accepting an offer."). Free micro-call; same facts, nothing added.
 */
export async function polishAnswer(settings: Settings, question: string, answer: string): Promise<string> {
  const { polished } = await cloudCall<{ polished: string }>(settings, '/v1/polish-answer', { question, answer })
  return polished
}

// DEV TOOLING — real-cost breakdown while we calibrate pricing (remove pre-launch).
export interface UsageStatsRow {
  endpoint: string
  kind: string
  calls: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

export async function cloudUsageStats(settings: Settings): Promise<UsageStatsRow[]> {
  const { stats } = await cloudCall<{ stats: UsageStatsRow[] }>(settings, '/v1/usage-stats', undefined, 'GET')
  return stats
}

// ---- account (email OTP; links this device to the user) ----

export async function sendLoginCode(settings: Settings, email: string): Promise<void> {
  await cloudCall(settings, '/v1/auth/send-code', { email })
}

export async function verifyLoginCode(settings: Settings, email: string, otp: string): Promise<CloudUsage> {
  const res = await cloudCall<CloudUsage>(settings, '/v1/auth/verify', { email, otp })
  const newEmail = res.email ?? email
  // No per-user bucketing: a device caches one account at a time. Wipe the
  // previous account's cached content whenever a DIFFERENT account signs in.
  // Gate on `dataOwner` (which survives sign-out), NOT `accountEmail` (which a
  // logout clears) — otherwise the logout→login-as-someone-else path skips the
  // wipe and the pull adopts the leftover into the new account (the leak).
  const prev = await store.get('settings')
  if (prev.dataOwner && prev.dataOwner !== newEmail) await store.clearAccountData()
  await store.update('settings', (s) => ({ ...s, accountEmail: newEmail, dataOwner: newEmail }))
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
  pendingQuestions: PendingQuestion[]
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
  const send = (token: string) =>
    cloudFetch(path, {
      method,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

  let res = await send(await ensureDeviceToken(settings))
  // The server owns the token; we only cache it. If it no longer recognises the
  // cached one (the device row is gone — e.g. a dev DB reset), the cache is
  // stale: mint a fresh token from the server and retry ONCE. A 401 here is
  // always "unknown device"; the account gate returns 403, which we let surface
  // as the normal "sign in" prompt rather than retrying.
  if (res.status === 401) res = await send(await provisionDeviceToken())

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      (data as { error?: string } | null)?.error ??
      `Shortlisted Cloud error ${res.status}. Is the server running at ${cloudBaseUrl()}?`
    console.error(`[shortlisted] cloud ${method} ${path} → ${res.status}:`, msg)
    throw new Error(msg)
  }
  return data as T
}

// fetch() rejects with a bare "Failed to fetch" when nothing answers (server
// down). Rethrow with the address so the user can actually see what to fix.
async function cloudFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(cloudBaseUrl() + path, init)
  } catch (e) {
    console.error(`[shortlisted] cloud unreachable: ${cloudBaseUrl()}${path}`, e)
    throw new Error(`Could not reach Shortlisted Cloud at ${cloudBaseUrl()}. Is the server running?`)
  }
}

/** The cached device token, or a freshly provisioned one. */
async function ensureDeviceToken(settings: Settings): Promise<string> {
  return settings.cloudToken ?? provisionDeviceToken()
}

/**
 * Mint a device token from the server and cache it. The server is the source of
 * truth for the token; local storage only mirrors it — so this is also how a
 * cached token the server has forgotten gets refreshed (see cloudCall's retry).
 */
async function provisionDeviceToken(): Promise<string> {
  const res = await cloudFetch('/v1/device', { method: 'POST' })
  if (!res.ok) throw new Error(`Could not reach Shortlisted Cloud at ${cloudBaseUrl()}.`)
  const { token } = (await res.json()) as { token: string }
  // Read-modify-write against live storage, not the possibly-stale settings
  // object we were handed.
  await store.update('settings', (s) => ({ ...s, cloudToken: token }))
  return token
}
