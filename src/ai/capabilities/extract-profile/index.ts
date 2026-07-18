// Onboarding capability: paste your existing CV text -> structured profile.
// One pass, validate->retry via runJsonPass.

import { EducationEntry, Profile, WorkEntry, emptyProfile, uid } from '../../../lib/types'
import { LlmClient, runJsonPass } from '../../systemAgent'

interface ExtractedProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  location: string
  headline: string
  summary: string
  skills: string[]
  links: { website?: string; github?: string; linkedin?: string; portfolio?: string }
  work: { company: string; title: string; from: string; to: string; highlights: string[] }[]
  education: { school: string; degree: string; from?: string; to?: string }[]
}

const schema = {
  type: 'object',
  required: ['firstName', 'lastName', 'email', 'phone', 'location', 'headline', 'summary', 'skills', 'links', 'work', 'education'],
  properties: {
    firstName: { type: 'string' },
    lastName: { type: 'string' },
    email: { type: 'string' },
    phone: { type: 'string' },
    location: { type: 'string' },
    headline: { type: 'string' },
    summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    links: {
      type: 'object',
      properties: {
        website: { type: 'string' },
        github: { type: 'string' },
        linkedin: { type: 'string' },
        portfolio: { type: 'string' },
      },
    },
    work: {
      type: 'array',
      items: {
        type: 'object',
        required: ['company', 'title', 'from', 'to', 'highlights'],
        properties: {
          company: { type: 'string' },
          title: { type: 'string' },
          from: { type: 'string', description: 'e.g. "2021-03" or "2021"' },
          to: { type: 'string', description: 'empty string means present' },
          highlights: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        required: ['school', 'degree'],
        properties: {
          school: { type: 'string' },
          degree: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
        },
      },
    },
  },
} as const

export async function extractProfile(client: LlmClient, cvText: string): Promise<Profile> {
  const pass = await runJsonPass<ExtractedProfile>(
    {
      client,
      systemPrompt:
        'Extract this CV/resume text into a structured profile. Copy facts exactly as written — ' +
        'do not embellish, do not invent, use empty strings for anything missing. ' +
        'Keep each highlight as one bullet-worthy sentence.',
      input: cvText.slice(0, 32_000),
      schema,
      schemaName: 'ExtractedProfile',
      maxTokens: 6000,
    },
    (p) => (Array.isArray(p.work) ? null : 'work must be an array.'),
  )
  if (!pass.value) throw new Error('Could not read that CV text. Try pasting the plain text of your resume.')
  const x = pass.value

  const profile = emptyProfile()
  profile.identity = {
    firstName: x.firstName,
    lastName: x.lastName,
    email: x.email,
    phone: x.phone,
    location: x.location,
  }
  profile.headline = x.headline
  profile.summary = x.summary
  profile.skills = x.skills ?? []
  profile.links = x.links ?? {}
  profile.work = (x.work ?? []).map(
    (w): WorkEntry => ({ id: uid(), company: w.company, title: w.title, from: w.from, to: w.to, highlights: w.highlights ?? [] }),
  )
  profile.education = (x.education ?? []).map(
    (e): EducationEntry => ({ id: uid(), school: e.school, degree: e.degree, from: e.from, to: e.to }),
  )
  return profile
}
