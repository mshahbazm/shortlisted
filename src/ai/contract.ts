// The result shapes the AI capabilities return.
//
// These used to describe a wire format — the capabilities ran on a server and
// the extension only rendered what came back. They all run here now
// (ai/capabilities/*), so these are ordinary internal types: the capability
// produces them, the panel renders them, and the compiler checks both ends.
// Nothing to keep in sync with anything.

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
