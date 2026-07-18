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
  answer: string
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

export type AiProvider = 'none' | 'cloud' | 'anthropic' | 'openai' | 'ollama' | 'custom'

export interface Settings {
  aiProvider: AiProvider
  anthropicKey?: string
  anthropicModel: string
  openaiKey?: string
  openaiModel: string
  ollamaEndpoint: string
  ollamaModel: string
  // Any OpenAI-compatible server: LM Studio, Jan, LocalAI, vLLM, OpenRouter…
  customEndpoint: string
  customModel: string
  customKey?: string
  // Shortlisted Cloud (hosted AI — no key needed).
  cloudUrl: string
  cloudToken?: string // device token, auto-provisioned on first use
  finderUrl: string // the local job-finder app
  onboarded?: boolean
}

export const defaultSettings = (): Settings => ({
  aiProvider: 'none',
  anthropicModel: 'claude-sonnet-5',
  openaiModel: 'gpt-4o-mini',
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  customEndpoint: 'http://localhost:1234/v1', // LM Studio's default
  customModel: '',
  cloudUrl: 'http://localhost:8788', // dev; becomes https://api.shortlist.id later
  finderUrl: 'http://localhost:4322',
})

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
})

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
