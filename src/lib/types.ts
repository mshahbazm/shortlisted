// ⚠️ WIRE CONTRACT WITH THE CLOUD. These are the shapes sent to and received
// from the /v1 API. The cloud keeps its own copy (shortlisted-cloud/src/lib/
// types.ts) — there is no shared package or submodule. If you change a shape
// here, mirror it in the cloud's copy, and rely on the cloud's /v1 payload
// validation to surface any drift as a clear error rather than a silent
// misparse. (Same for the result types in ai/contract.ts.)
//
// ---------- Profile (v2 — schema adopted from the cuee ATS candidate model) ----------
// Dates are split integers (month 1-12, year), never strings/Date objects.
// Durations are COMPUTED in code (deterministic), not trusted from an LLM.

export interface ProfileLinks {
  website?: string
  github?: string
  linkedin?: string
  portfolio?: string
  other?: string
}

export type ContractType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'freelance'
  | 'internship'
  | 'temporary'

export interface WorkEntry {
  id: string
  company: string
  companyUrl?: string
  title: string
  location?: string
  contractType?: ContractType
  startMonth?: number // 1-12
  startYear?: number
  endMonth?: number
  endYear?: number
  isCurrent: boolean
  skills: string[] // tech used in THIS role (cuee: per-experience skills)
  highlights: string[]
}

export interface EducationEntry {
  id: string
  school: string
  degree: string
  fieldOfStudy?: string
  gpa?: string
  description?: string // honors, thesis, activities
  startYear?: number
  endYear?: number
  isCurrent?: boolean
}

export type SkillProficiency = 'basic' | 'intermediate' | 'advanced' | 'expert'

export interface SkillEntry {
  name: string
  proficiency?: SkillProficiency
  category?: 'primary' | 'secondary'
}

export type LanguageProficiency =
  | 'elementary'
  | 'limited_working'
  | 'professional_working'
  | 'full_professional'
  | 'native_bilingual'

export interface LanguageEntry {
  langCode: string // 2-letter ISO
  name: string
  proficiency: LanguageProficiency
}

export interface CertificationEntry {
  name: string
  issuingOrganization?: string
  year?: number
}

export interface ProfileFacts {
  salaryHourly?: number // desired hourly rate — a plain number (currency-agnostic)
  salaryMonthly?: number // desired monthly rate — a plain number
  jobType?: string // stable keys they're after, comma-joined, e.g. "full_time, contract"
  noticeDays?: number // days until they can start; 0 = immediately
  timezone?: string
  englishLevel?: string
  needsSponsorship?: string // plain answer, e.g. "No"
  authorizedCountries?: string // e.g. "Pakistan; remote worldwide"
  relocation?: string
  hoursOverlap?: string
  yearsOfExperience?: string
}

export interface Profile {
  identity: {
    firstName: string
    lastName: string
    email: string
    phone: string
    location: string // "Lahore, Pakistan"
    city?: string
    country?: string // 2-letter ISO where known
    pronouns?: string
    // Regional-format fields — only used by photo/personal-data CV formats
    // (Europass, Continental). Optional; Anglo/ATS formats ignore them.
    photo?: string // a data: URL (JPEG/PNG) — embedded top-right on photo formats
    dateOfBirth?: string // free text or ISO 'YYYY-MM-DD'
    nationality?: string
  }
  headline: string // "AI Agent Engineer"
  summary: string
  // Exactly-3 recruiter-scannable bullets (expertise / seniority signal /
  // top measurable achievement), each under ~12 words. cuee's `highlights`.
  highlights: string[]
  industries: string[] // inferred verticals: FinTech, SaaS…
  // Bias-light, keyword-rich one-liner built for search/matching (feed, v3).
  aboutCandidate?: string
  skills: SkillEntry[]
  work: WorkEntry[]
  education: EducationEntry[]
  languages: LanguageEntry[]
  certifications: CertificationEntry[]
  links: ProfileLinks
  facts: ProfileFacts
  /**
   * The raw material this profile was DERIVED from, kept verbatim so we can
   * re-process it with a better prompt, ground the profile-site agent in the
   * user's own words, and trace a structured line back to what they actually
   * said. Keyed by a meaningful name (what + why): `noCvIntro` (the "I don't
   * have a CV" free-form box), `followups` (answers to the AI's questions),
   * `pastedCv`, `note`. Rides in the profile jsonb — no table, syncs as-is.
   */
  sources?: Record<string, { text: string; at: number }>
  /**
   * Onboarding / guided-help progress. Rides in the profile jsonb so it syncs
   * (server is the source of truth). Each guided flow nests its own state under
   * a named key; `resume` is the guided resume builder. `wanted` means we should
   * help this account build a profile — set at sign-in when the user picks "no
   * CV" (or signs in on a brand-new account), cleared once the builder finishes.
   * It is set explicitly at sign-in, NOT derived from content: an unset flag
   * (false — the default, and every legacy/has-CV account) means "no help
   * needed," so the Profile view is shown rather than the builder. Room to grow
   * (e.g. a `step`/`answers` for resume-where-you-left-off).
   */
  onboarding?: {
    resume?: { wanted?: boolean }
  }
}

export const emptyProfile = (): Profile => ({
  identity: { firstName: '', lastName: '', email: '', phone: '', location: '' },
  headline: '',
  summary: '',
  highlights: [],
  industries: [],
  skills: [],
  work: [],
  education: [],
  languages: [],
  certifications: [],
  links: {},
  facts: {},
})

// ---------- date/duration helpers ----------

export function parseYm(s: string): { year?: number; month?: number } {
  const m = s.trim().match(/^(\d{4})(?:[-/.](\d{1,2}))?$/)
  if (!m) return {}
  const year = Number(m[1])
  const month = m[2] ? Math.min(12, Math.max(1, Number(m[2]))) : undefined
  return { year, month }
}

export function ymString(year?: number, month?: number): string {
  if (!year) return ''
  return month ? `${year}-${String(month).padStart(2, '0')}` : String(year)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ymLabel(year?: number, month?: number): string {
  if (!year) return ''
  return month ? `${MONTHS[month - 1]} ${year}` : String(year)
}

export function workPeriodLabel(w: WorkEntry): string {
  const start = ymLabel(w.startYear, w.startMonth)
  const end = w.isCurrent || (!w.endYear && start) ? 'Present' : ymLabel(w.endYear, w.endMonth)
  return [start, end].filter(Boolean).join(' — ')
}

export function durationInMonths(w: WorkEntry, now = new Date()): number | null {
  if (!w.startYear) return null
  const startM = (w.startMonth ?? 1) - 1
  const endY = w.isCurrent || !w.endYear ? now.getFullYear() : w.endYear
  const endM = w.isCurrent || !w.endYear ? now.getMonth() : (w.endMonth ?? 12) - 1
  return Math.max(0, (endY - w.startYear) * 12 + (endM - startM))
}

export function totalExperienceYears(profile: Profile): number | null {
  const months = profile.work.map((w) => durationInMonths(w)).filter((m): m is number => m !== null)
  if (!months.length) return null
  return Math.round((months.reduce((a, b) => a + b, 0) / 12) * 10) / 10
}

export const skillNames = (p: Profile) => p.skills.map((s) => s.name)

/** Whether a profile holds any real content. Used by the cloud mirror to decide
 *  push-up vs. pull-down. NOT the signal for the Home CTA — see resumeHelpDone. */
export function hasProfileContent(p: Profile): boolean {
  return Boolean(p.identity.firstName || p.headline || p.work.length || p.skills.length)
}

/** Should we offer this account the guided resume builder? A durable flag (see
 *  Profile.onboarding), set at sign-in for the "no CV" door and brand-new logins,
 *  cleared once the builder finishes. Drives the Profile-tab redirect and the
 *  Home "build your profile" CTA. Default false → the profile is shown as-is. */
export function resumeHelpWanted(p: Profile): boolean {
  return Boolean(p.onboarding?.resume?.wanted)
}

/** Mark that this account wants the guided builder — preserves everything else. */
export function markResumeWanted(p: Profile): Profile {
  return { ...p, onboarding: { ...p.onboarding, resume: { ...p.onboarding?.resume, wanted: true } } }
}

/** Clear the guided-builder flag (help delivered) — preserves everything else. */
export function clearResumeWanted(p: Profile): Profile {
  return { ...p, onboarding: { ...p.onboarding, resume: { ...p.onboarding?.resume, wanted: false } } }
}

// ── No-CV guided builder ("intake") ─────────────────────────────────────────
// The persona split and the in-progress guided-Q&A session the resume builder
// gathers BEFORE any profile is extracted. The raw material lives in its own
// server-side `intake` table (never on the Profile), so the profile stays clean
// and the flow is exactly resumable across close / restart / relogin. Distinct
// from the has-CV `enrich-profile` capability, which pulls facts from an existing CV.
export type Persona = 'starting' | 'working'
export interface IntakeRound {
  questions: string[]
  answers: string[] // parallel to questions; '' where unanswered
  theme?: string // short topic heading these questions share (optional for older rows)
}
export interface IntakeSession {
  persona: Persona
  intro: string
  rounds: IntakeRound[]
  status: 'gathering' | 'done'
}

// ---------- v1 -> v2 migration (applied on load; see store.ts) ----------

export function normalizeProfile(raw: unknown): Profile {
  const empty = emptyProfile()
  if (!raw || typeof raw !== 'object') return empty
  const p = raw as Record<string, any>
  const out: Profile = {
    ...empty,
    ...p,
    identity: { ...empty.identity, ...(p.identity ?? {}) },
    links: { ...(p.links ?? {}) },
    facts: { ...(p.facts ?? {}) },
    highlights: Array.isArray(p.highlights) ? p.highlights : [],
    industries: Array.isArray(p.industries) ? p.industries : [],
    languages: Array.isArray(p.languages) ? p.languages : [],
    certifications: Array.isArray(p.certifications) ? p.certifications : [],
  }
  // skills: v1 was string[]
  out.skills = (Array.isArray(p.skills) ? p.skills : []).map((s: any) =>
    typeof s === 'string' ? { name: s } : { name: s.name ?? '', proficiency: s.proficiency, category: s.category },
  ).filter((s: SkillEntry) => s.name)
  // work: v1 had from/to strings
  out.work = (Array.isArray(p.work) ? p.work : []).map((w: any): WorkEntry => {
    if (w.from !== undefined || w.to !== undefined) {
      const start = parseYm(String(w.from ?? ''))
      const end = parseYm(String(w.to ?? ''))
      return {
        id: w.id ?? uid(),
        company: w.company ?? '',
        title: w.title ?? '',
        location: w.location,
        startYear: start.year,
        startMonth: start.month,
        endYear: end.year,
        endMonth: end.month,
        isCurrent: !String(w.to ?? '').trim(),
        skills: [],
        highlights: Array.isArray(w.highlights) ? w.highlights : [],
      }
    }
    return {
      isCurrent: false,
      skills: [],
      highlights: [],
      ...w,
      id: w.id ?? uid(),
    }
  })
  // education: v1 had from/to strings
  out.education = (Array.isArray(p.education) ? p.education : []).map((e: any): EducationEntry => {
    if (e.from !== undefined || e.to !== undefined) {
      return {
        id: e.id ?? uid(),
        school: e.school ?? '',
        degree: e.degree ?? '',
        startYear: parseYm(String(e.from ?? '')).year,
        endYear: parseYm(String(e.to ?? '')).year,
      }
    }
    return { ...e, id: e.id ?? uid() }
  })
  return out
}

// ---------- Answer bank ----------

export type AnswerType = 'text' | 'select' | 'boolean' | 'number'

export interface BankAnswer {
  id: string
  questionNorm: string // normalized text used for matching
  questionRaw: string[] // every phrasing seen
  answer: string // exactly what the user wrote — the truth source
  /** AI-polished phrasing of `answer` (same facts, clean sentence); filling prefers it. */
  polished?: string
  answerType: AnswerType
  timesUsed: number
  lastUsedAt: number
  sourceJobUrls: string[]
}

export interface PendingQuestion {
  id: string
  questionRaw: string
  fieldCtx: string // e.g. "textarea, required, Greenhouse"
  jobUrl: string
  capturedAt: number
}

// ---------- Resumes ----------

export interface ResumeVariant {
  id: string
  label: string // "AI Engineer", "Full-stack"
  fileName: string
  tags: string[]
  isDefault: boolean
  createdAt: number
  source: 'uploaded' | 'generated'
  templateId?: string // design template the PDF was rendered with (generated only)
  dataBase64: string // the PDF bytes
  // For generated variants: the content JSON so it can be re-edited/re-rendered.
  content?: TailoredResume
}

// Output of the tailor-cv workflow. Every work entry points back to the
// master profile by sourceId — the generator refuses anything it can't trace.
export interface TailoredResume {
  label: string
  headline: string
  summary: string
  highlights: string[]
  skills: string[]
  work: {
    sourceId: string // must exist in profile.work
    bullets: string[]
  }[]
  educationIds: string[]
}

// ---------- Applications / queue ----------

export interface ApplicationRecord {
  id: string
  jobUrl: string
  company: string
  title: string
  ats: string
  appliedAt: number
  resumeId?: string
  status: 'applied' | 'interviewing' | 'rejected' | 'offer'
  notes?: string
}

export interface QueueItem {
  id: string
  url: string
  company?: string
  title?: string
  tags: string[]
  status: 'todo' | 'applied' | 'skipped'
  addedAt: number
}

// ---------- Settings ----------
// AI always runs on Shortlisted Cloud — there is no provider choice.

export interface Settings {
  cloudToken?: string // Better Auth session token (bearer credential), set on verify
  accountEmail?: string // set once the email OTP verifies; account = data saved server-side
  /**
   * The account the local CACHE currently belongs to. Set on sign-in; unlike
   * `accountEmail` it SURVIVES sign-out. That is deliberate: it lets a different
   * account signing in — even after a logout — detect the mismatch and wipe the
   * previous account's cached content before its data is pulled, so one account
   * can never see or upload another's data. Device-local; never synced.
   */
  dataOwner?: string
  onboarded?: boolean
  /** UI language (i18n/locale.ts code). Unset = follow the browser language. */
  locale?: string
  /**
   * Watch every site for job application forms, not just the ATS platforms we
   * ship adapters for. UNSET MEANS ON — recognising applications anywhere is
   * the product doing its job, so it needs no opt-in. Only an explicit `false`
   * (the Settings switch) narrows us back to the known job boards.
   */
  detectEverywhere?: boolean
}

export const defaultSettings = (): Settings => ({})

// Settings keys from removed features — BYOK providers, provider toggle, job
// finder, and the old user-settable cloudUrl (the endpoint is the install type
// now, see config.ts). Stripped on read. The session token is deliberately NOT
// invalidated here: the server is the authority on whether it's still valid, and
// a 401 clears the account and routes to sign-in (see run.ts) — so there is no
// reason to throw it away during a settings normalize.
const LEGACY_SETTINGS_KEYS = [
  'aiProvider', 'finderUrl', 'cloudUrl',
  'anthropicKey', 'anthropicModel', 'openaiKey', 'openaiModel',
  'ollamaEndpoint', 'ollamaModel', 'customEndpoint', 'customModel', 'customKey',
]

export function normalizeSettings(raw: unknown): Settings {
  const s = { ...defaultSettings(), ...(raw && typeof raw === 'object' ? (raw as object) : {}) } as Settings &
    Record<string, unknown>
  for (const k of LEGACY_SETTINGS_KEYS) delete s[k]
  return s
}

// ---------- Fit scores (quick on-page scoring, keyed by normalized job URL) ----------

export interface FitScoreRecord {
  score: number // 1-10
  verdict: string
  at: number
}

export function jobUrlKey(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname + u.pathname.replace(/\/$/, '')
  } catch {
    return url
  }
}

// ---------- Storage shape ----------

/**
 * The cloud mirror's own bookkeeping, persisted so an evicted MV3 worker resumes
 * exactly where it left off. `outbox` = collection values still owed to the
 * server (wire key → value); `knownIds` = the row ids the server last confirmed
 * per collection, so a delete can be sent explicitly instead of inferred from a
 * missing row. Reset on sign-out / account switch alongside account content.
 */
export interface SyncState {
  /** accountEmail this state belongs to; guards against crossing accounts. */
  owner?: string
  outbox: Record<string, unknown>
  knownIds: Record<string, string[]>
  lastPullAt: number
}

export interface StorageShape {
  profile: Profile
  answerBank: BankAnswer[]
  pendingQuestions: PendingQuestion[]
  resumes: ResumeVariant[]
  applications: ApplicationRecord[]
  queue: QueueItem[]
  fitScores: Record<string, FitScoreRecord>
  settings: Settings
  /** Cloud-mirror outbox + sync bookkeeping (see SyncState). */
  sync: SyncState
  /** Transient UI navigation hint ('tellme' → Profile tab, note box open). */
  pendingNav: string
}

export const storageDefaults = (): StorageShape => ({
  profile: emptyProfile(),
  answerBank: [],
  pendingQuestions: [],
  resumes: [],
  applications: [],
  queue: [],
  fitScores: {},
  settings: defaultSettings(),
  sync: { outbox: {}, knownIds: {}, lastPullAt: 0 },
  pendingNav: '',
})

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/** "role — company" CV label, unless the role already names the company. */
export function roleCompanyLabel(role: string, company: string): string {
  if (!company || role.toLowerCase().includes(company.toLowerCase())) return role
  return `${role} — ${company}`
}

export function base64ToBytes(base64: string): Uint8Array {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

export function bytesToBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}
