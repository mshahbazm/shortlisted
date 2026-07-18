// ---------- Profile ----------

export interface ProfileLinks {
  website?: string
  github?: string
  linkedin?: string
  portfolio?: string
  other?: string
}

export interface WorkEntry {
  id: string
  company: string
  title: string
  from: string // "2021-03" or "2021"
  to: string // "" means present
  location?: string
  highlights: string[]
}

export interface EducationEntry {
  id: string
  school: string
  degree: string
  from?: string
  to?: string
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
    country?: string
    pronouns?: string
  }
  headline: string // "AI Agent Engineer"
  summary: string
  skills: string[]
  work: WorkEntry[]
  education: EducationEntry[]
  links: ProfileLinks
  facts: ProfileFacts
}

export const emptyProfile = (): Profile => ({
  identity: { firstName: '', lastName: '', email: '', phone: '', location: '' },
  headline: '',
  summary: '',
  skills: [],
  work: [],
  education: [],
  links: {},
  facts: {},
})

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
  cloudUrl: 'http://localhost:8788', // dev; becomes https://api.shortlisted.app later
  finderUrl: 'http://localhost:4322',
})

// ---------- Storage shape ----------

export interface StorageShape {
  profile: Profile
  answerBank: BankAnswer[]
  pendingQuestions: PendingQuestion[]
  resumes: ResumeVariant[]
  applications: ApplicationRecord[]
  queue: QueueItem[]
  settings: Settings
}

export const storageDefaults = (): StorageShape => ({
  profile: emptyProfile(),
  answerBank: [],
  pendingQuestions: [],
  resumes: [],
  applications: [],
  queue: [],
  settings: defaultSettings(),
})

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
