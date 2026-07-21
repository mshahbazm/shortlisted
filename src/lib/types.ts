// ⚠️ SHARED WITH THE CLOUD. This file is the extension's, but the cloud imports it
// through the `extension` git submodule — so it exists as TWO checkouts on disk
// (the standalone extension repo, and shortlisted-cloud/extension), and the cloud
// typechecks against its submodule copy. If you change a type here, update BOTH
// checkouts so they stay byte-identical, or the cloud compiles against a stale
// shape. Same rule for every extension file the cloud imports (ai/systemAgent,
// ai/capabilities/*, lib/profileMerge).
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
  salaryExpectation?: string
  jobType?: string // what they're after, e.g. "Full-time" / "Internship"
  noticePeriod?: string
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
  cloudToken?: string // device token, auto-provisioned on first use
  accountEmail?: string // set once the email OTP verifies; account = data saved server-side
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
// now, see config.ts). Stripped on read. The device token is deliberately NOT
// invalidated here: the server is the authority on whether a token is still
// valid, and a rejected one is re-provisioned on the next call (see run.ts), so
// there is never a reason to throw it away locally.
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

export interface StorageShape {
  profile: Profile
  answerBank: BankAnswer[]
  pendingQuestions: PendingQuestion[]
  resumes: ResumeVariant[]
  applications: ApplicationRecord[]
  queue: QueueItem[]
  fitScores: Record<string, FitScoreRecord>
  settings: Settings
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
