// The one entry point the UI calls for AI work. Everything runs on
// Shortlisted Cloud — capabilities execute server-side against the /v1 API
// (the capability code itself lives in ./capabilities, shared with the server).

import {
  ApplicationRecord,
  BankAnswer,
  FitScoreRecord,
  IntakeSession,
  PendingQuestion,
  Persona,
  Profile,
  QueueItem,
  ResumeVariant,
  Settings,
  bytesToBase64,
} from '../lib/types'
import { cloudBaseUrl } from '../lib/config'
import * as store from '../lib/store'
import type {
  AssistField,
  AssistResultItem,
  CorrectionItem,
  ProfileEnrichment,
  QuickScoreResult,
  ScoreFitResult,
  TailorCvResult,
  VerifyField,
} from './contract'

export type { QuickScoreResult, ScoreFitResult }
export type { AssistField, AssistResultItem, CorrectionItem, VerifyField }

/**
 * Uploaded-CV intake: role/field tags for the CV plus profile facts it
 * contains that the account is missing (additive only). Free micro-call.
 */
export async function cloudEnrichFromCv(settings: Settings, pdfBase64: string): Promise<ProfileEnrichment> {
  return cloudCall<ProfileEnrichment>(settings, '/v1/enrich-profile', { pdfBase64 })
}

/** Free-form profile note ("I worked with Webflow at X") → additive facts. */
export async function cloudProfileNote(settings: Settings, text: string): Promise<ProfileEnrichment> {
  return cloudCall<ProfileEnrichment>(settings, '/v1/enrich-profile', { text })
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

/** Preserve the ORIGINAL profile picture in cloud object storage (source of
 *  truth). Best-effort — the small render copy still rides in the synced profile,
 *  so a failure here never blocks setting the photo. */
export async function cloudUploadPicture(settings: Settings, dataUrl: string): Promise<void> {
  await cloudCall<{ ok: boolean }>(settings, '/v1/picture', { dataUrl })
}

export interface IntakeNext {
  enough: boolean
  theme: string // short topic heading for this round's questions; '' when enough
  questions: string[]
  round: number
}

/** No-CV builder — GATHER: send the intro (start, no `answers`) or a round's
 *  answers (continue). The server judges the material so far and returns the next
 *  questions, or `enough: true` when it's time to build. No credit spent. */
export async function intakeNext(
  settings: Settings,
  body: { persona: Persona; intro: string; answers?: string[] },
): Promise<IntakeNext> {
  return cloudCall<IntakeNext>(settings, '/v1/build-profile/next', body)
}

/** No-CV builder — RESUME: the in-progress session (or null) so the builder can
 *  pick up exactly where the user left off. */
export async function loadIntakeSession(settings: Settings): Promise<IntakeSession | null> {
  const { session } = await cloudCall<{ session: IntakeSession | null }>(settings, '/v1/build-profile/intake', undefined, 'GET')
  return session
}

/** No-CV builder — FINALIZE: extract the structured profile from the whole
 *  gathered intake. Pass `answers` to record a final round first (used on skip).
 *  One credit per completed build. */
export async function runBuildProfile(settings: Settings, answers?: string[]): Promise<{ profile: Profile }> {
  return cloudCall<{ profile: Profile }>(settings, '/v1/build-profile', { answers })
}

/** TailorCvResult plus any note-stated facts the server folded in. */
export type CloudTailorResult = TailorCvResult & { newFacts?: ProfileEnrichment }

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

// Re-import into an existing account: `replace` the profile with this resume, or
// `merge` it into the current profile without losing anything (the server loads
// the existing profile itself). Accepts a PDF (OCR fallback) or pasted text.
export async function cloudImportResume(
  settings: Settings,
  args: { mode: 'replace' | 'merge'; pdf?: ArrayBuffer; cvText?: string },
): Promise<{ profile: Profile; method?: 'text' | 'ocr'; quality?: string }> {
  const body: Record<string, unknown> = { mode: args.mode }
  if (args.pdf) body.pdfBase64 = bytesToBase64(args.pdf)
  if (args.cvText) body.cvText = args.cvText
  return cloudCall(settings, '/v1/import-resume', body)
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

// ---- billing (Stripe) ----

/** Pro pricing (from the cloud catalogue). Amounts are in the smallest currency
 *  unit (cents). Mirrors the cloud's `/v1/billing/plans` shape. */
export interface CloudPlans {
  currency: string
  monthly: { amount: number; interval: 'month' }
  annual: { amount: number; interval: 'year' }
  /** Monthly credit allotment per plan — drives the Free-vs-Pro comparison. */
  credits: { free: number; pro: number }
}

/** Current Pro prices (account-gated — the settings card shows only when signed
 *  in). The UI formats these and derives the annual saving, so a price change on
 *  the server flows through untouched. */
export async function cloudPlans(settings: Settings): Promise<CloudPlans> {
  return cloudCall<CloudPlans>(settings, '/v1/billing/plans', undefined, 'GET')
}

/** Start a Pro subscription: returns a Stripe Checkout URL to open in a tab. */
export async function cloudCheckout(settings: Settings, interval: 'monthly' | 'annual'): Promise<{ url: string }> {
  return cloudCall<{ url: string }>(settings, '/v1/billing/checkout', { interval })
}

/** Manage an existing subscription: returns the Stripe customer-portal URL. */
export async function cloudBillingPortal(settings: Settings): Promise<{ url: string }> {
  return cloudCall<{ url: string }>(settings, '/v1/billing/portal', {})
}

/** One row of the user-facing credit history (grants, spends, monthly expiry). */
export interface CreditLedgerRow {
  type: 'grant' | 'spend' | 'expire' | 'adjust' | 'refund'
  amount: number
  balanceAfter: number
  capability: string | null
  description: string
  createdAt: string
}

export async function cloudCreditHistory(settings: Settings): Promise<CreditLedgerRow[]> {
  const { history } = await cloudCall<{ history: CreditLedgerRow[] }>(settings, '/v1/credits/history', undefined, 'GET')
  return history
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

export async function verifyLoginCode(
  settings: Settings,
  email: string,
  otp: string,
): Promise<CloudUsage & { isNewAccount: boolean }> {
  // Verify returns the Better Auth SESSION token — the credential every later
  // call sends as its bearer — plus whether this was the account's first sign-in.
  const res = await cloudCall<CloudUsage & { token: string; isNewAccount?: boolean }>(settings, '/v1/auth/verify', { email, otp })
  const newEmail = res.email ?? email
  // No per-user bucketing: a device caches one account at a time. Wipe the
  // previous account's cached content whenever a DIFFERENT account signs in.
  // Gate on `dataOwner` (which survives sign-out), NOT `accountEmail` (which a
  // logout clears) — otherwise the logout→login-as-someone-else path skips the
  // wipe and the pull adopts the leftover into the new account (the leak).
  const prev = await store.get('settings')
  if (prev.dataOwner && prev.dataOwner !== newEmail) await store.clearAccountData()
  await store.update('settings', (s) => ({ ...s, cloudToken: res.token, accountEmail: newEmail, dataOwner: newEmail }))
  return { ...res, isNewAccount: Boolean(res.isNewAccount) }
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
  // The credential is a Better Auth SESSION token, set on verify. Read it live
  // (not from the possibly-stale `settings` handed in). Pre-auth calls
  // (send-code, verify) have none yet — they hit public endpoints.
  const token = settings.cloudToken ?? (await store.get('settings')).cloudToken
  const res = await cloudFetch(path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  // 401 = the session token is invalid or expired (e.g. signed out elsewhere, a
  // dev DB reset, or lapsed). There is no anonymous fallback: drop the stale
  // local session so the UI routes cleanly to sign-in instead of looping.
  if (res.status === 401) {
    await store.clearAccount()
    throw new Error('Your session has expired — please sign in again.')
  }

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
