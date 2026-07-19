// Resume template registry. A template is a set of design tokens the one
// renderer interprets — not a separate code path. Every template stays
// ATS-safe: real text, standard fonts, no tables, no graphics, no photos.
//
// The lineup follows what demonstrably works in the market:
//  - single-column serif "Harvard" style: the finance/consulting/law standard
//  - compact single-column: the engineering favorite (Jake's-template family)
//  - modern minimal sans and accent-color professional: the builder-site core
//  - two-column sidebar: the perennial best-seller look for creative fields
//  - skills-first hybrid: the format that leads with a skills block

export type TemplateTag =
  | 'engineering'
  | 'data'
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'consulting'
  | 'legal'
  | 'healthcare'
  | 'education'
  | 'creative'
  | 'operations'
  | 'hr'
  | 'executive'
  | 'student'

export interface ResumeTemplate {
  id: string
  tags: TemplateTag[]
  font: 'helvetica' | 'times'
  /** Accent hex for name/rules/bullet markers; null = pure monochrome. */
  accent: string | null
  headerStyle: 'left' | 'centered' | 'bar'
  sectionStyle: 'rule' | 'caps' | 'accentRule' | 'sideRule'
  layout: 'single' | 'sidebar'
  density: 'normal' | 'compact'
  /** Skills block right under the summary (hybrid) instead of after experience. */
  skillsFirst: boolean
}

export const TEMPLATES: ResumeTemplate[] = [
  {
    // The de-facto standard for consulting, banking and law. Serif, no color.
    id: 'harvard',
    tags: ['finance', 'consulting', 'legal', 'education'],
    font: 'times',
    accent: null,
    headerStyle: 'centered',
    sectionStyle: 'rule',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Clean modern sans — the safe default for almost anyone.
    id: 'atlas',
    tags: ['engineering', 'operations', 'data'],
    font: 'helvetica',
    accent: null,
    headerStyle: 'left',
    sectionStyle: 'rule',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Dense, compact, maximum content per page — long technical histories.
    id: 'onyx',
    tags: ['engineering', 'data'],
    font: 'helvetica',
    accent: null,
    headerStyle: 'left',
    sectionStyle: 'caps',
    layout: 'single',
    density: 'compact',
    skillsFirst: true,
  },
  {
    // Professional with a confident blue accent — business roles.
    id: 'azure',
    tags: ['marketing', 'sales', 'operations'],
    font: 'helvetica',
    accent: '#2563eb',
    headerStyle: 'left',
    sectionStyle: 'accentRule',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Two-column with a skills sidebar — the classic best-seller look.
    id: 'meridian',
    tags: ['creative', 'marketing', 'hr'],
    font: 'helvetica',
    accent: '#0f766e',
    headerStyle: 'left',
    sectionStyle: 'accentRule',
    layout: 'sidebar',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Understated serif, centered name, thin rules — senior and executive.
    id: 'regent',
    tags: ['executive', 'finance', 'legal'],
    font: 'times',
    accent: null,
    headerStyle: 'centered',
    sectionStyle: 'caps',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Skills-first hybrid — career changers and skills-led screening.
    id: 'pivot',
    tags: ['data', 'student', 'operations'],
    font: 'helvetica',
    accent: '#334155',
    headerStyle: 'left',
    sectionStyle: 'sideRule',
    layout: 'single',
    density: 'normal',
    skillsFirst: true,
  },
  {
    // Bold color header band — creative and media applications.
    id: 'coral',
    tags: ['creative', 'marketing'],
    font: 'helvetica',
    accent: '#e11d48',
    headerStyle: 'bar',
    sectionStyle: 'accentRule',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Elegant monochrome serif with spaced small caps — quiet confidence.
    id: 'ivory',
    tags: ['consulting', 'legal', 'education'],
    font: 'times',
    accent: null,
    headerStyle: 'left',
    sectionStyle: 'caps',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Sidebar layout in sober slate — technical roles that want structure.
    id: 'slate',
    tags: ['engineering', 'operations', 'data'],
    font: 'helvetica',
    accent: '#334155',
    headerStyle: 'left',
    sectionStyle: 'rule',
    layout: 'sidebar',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Warm amber accent — people-facing roles.
    id: 'amber',
    tags: ['healthcare', 'education', 'hr', 'sales'],
    font: 'helvetica',
    accent: '#b45309',
    headerStyle: 'left',
    sectionStyle: 'accentRule',
    layout: 'single',
    density: 'normal',
    skillsFirst: false,
  },
  {
    // Fresh green, skills-forward — first jobs and internships.
    id: 'mint',
    tags: ['student', 'sales', 'hr'],
    font: 'helvetica',
    accent: '#059669',
    headerStyle: 'centered',
    sectionStyle: 'accentRule',
    layout: 'single',
    density: 'normal',
    skillsFirst: true,
  },
]

export const DEFAULT_TEMPLATE_ID = 'atlas'

export function getTemplate(id: string | undefined): ResumeTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
}

export const ALL_TAGS: TemplateTag[] = [
  'engineering',
  'data',
  'marketing',
  'sales',
  'finance',
  'consulting',
  'legal',
  'healthcare',
  'education',
  'creative',
  'operations',
  'hr',
  'executive',
  'student',
]
