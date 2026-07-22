// The result shapes the cloud's AI capabilities return over /v1. The capability
// LOGIC runs server-side (Shortlisted Cloud) and is NOT in this repo; the
// extension only needs these types to render what comes back. Kept in sync with
// the cloud by hand — the /v1 boundary validates payloads, so drift surfaces as
// a clear error rather than a silent misparse.

import type { TailoredResume } from '../lib/types'

// ── tailor-cv ──────────────────────────────────────────────────────────────
export interface JobExtract {
  role: string
  seniority: string
  mustHaves: string[]
  niceToHaves: string[]
  keywords: string[]
  tone: string
  company: string
}

export interface TailorCvResult {
  resume: TailoredResume
  job: JobExtract
  gaps: string[]
  usage: { inputTokens: number; outputTokens: number }
}

// ── score-fit ──────────────────────────────────────────────────────────────
export type Relevance = 'direct' | 'transferable' | 'unrelated'

export interface CriterionScore {
  requirement: string
  relevance: Relevance
  score: number
  evidenceQuotes: string[]
  commentary: string
  notObserved: boolean
}

export interface FitScore {
  overallScore: number
  verdict: string
  criteria: CriterionScore[]
  gaps: string[]
  strengths: string[]
}

export interface ScoreFitResult {
  fit: FitScore
  job: JobExtract
  usage: { inputTokens: number; outputTokens: number }
}

export interface QuickFit {
  overallScore: number
  verdict: string
  strengths: string[]
  gaps: string[]
}

export interface QuickScoreResult {
  fit: QuickFit
  usage: { inputTokens: number; outputTokens: number }
}

// ── fill-assist ────────────────────────────────────────────────────────────
export interface AssistField {
  id: number
  question: string
  kind: string
  options?: string[]
  required?: boolean
}

export interface AssistResultItem {
  id: number
  value: string | null
  fromSavedQuestion?: string
}

export interface VerifyField {
  id: number
  question: string
  kind: string
  options?: string[]
  currentValue: string
}

export interface CorrectionItem {
  id: number
  value: string
}

// ── enrich-profile ─────────────────────────────────────────────────────────
export interface ProfileEnrichment {
  tags: string[]
  newSkills: string[]
  newLinks: { website?: string; github?: string; linkedin?: string; portfolio?: string }
  newLanguages: { name: string; proficiency?: string }[]
  newCertifications: { name: string; issuingOrganization?: string; year?: number }[]
  newWorkHighlights: { workId: string; bullet: string }[]
  newWork: {
    company: string
    title?: string
    startYear?: number
    startMonth?: number
    endYear?: number
    endMonth?: number
    isCurrent?: boolean
    highlights?: string[]
  }[]
}
