// What the user is told must match what was stored. The counter used to come
// from the model's proposal, so a highlight tied to a job that isn't on file
// was reported as saved and then dropped — the fact appeared to vanish.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { mergeEnrichment, needsCompletion } from './profileMerge'
import type { Profile } from './types'
import type { ProfileEnrichment } from '../ai/capabilities/enrich-profile'

const profile = (work: Profile['work'] = []): Profile =>
  ({
    identity: { firstName: 'A', lastName: 'B' },
    links: {},
    work,
    education: [],
    skills: [],
    languages: [],
    certifications: [],
  }) as unknown as Profile

const facts = (over: Partial<ProfileEnrichment> = {}): ProfileEnrichment => ({
  tags: [],
  newSkills: [],
  newLinks: {},
  newLanguages: [],
  newCertifications: [],
  newWorkHighlights: [],
  newWork: [],
  ...over,
})

const job = (id: string, company: string) =>
  ({ id, company, role: 'Dev', highlights: [], startDate: '2020-01', endDate: '' }) as unknown as Profile['work'][number]

describe('merge reports what it actually stored', () => {
  // The reported case: told about work at a company that is not on file.
  test('highlight for an unknown job is counted as unplaced, not applied', () => {
    const r = mergeEnrichment(
      profile([job('w1', 'Acme')]),
      facts({ newWorkHighlights: [{ workId: 'pavago', bullet: 'Built sites in Webflow' }] }),
    )
    expect(r.applied).toBe(0)
    expect(r.unplacedHighlights).toBe(1)
    expect(r.profile.work[0].highlights).toEqual([])
  })

  test('highlight for a known job is applied', () => {
    const r = mergeEnrichment(
      profile([job('w1', 'Pavago')]),
      facts({ newWorkHighlights: [{ workId: 'w1', bullet: 'Built sites in Webflow' }] }),
    )
    expect(r.applied).toBe(1)
    expect(r.unplacedHighlights).toBe(0)
    expect(r.profile.work[0].highlights).toEqual(['Built sites in Webflow'])
  })

  test('a mix reports only the part that landed', () => {
    const r = mergeEnrichment(
      profile([job('w1', 'Acme')]),
      facts({
        newSkills: ['Webflow'],
        newWorkHighlights: [{ workId: 'nope', bullet: 'Something at a job we do not have' }],
      }),
    )
    expect(r.applied).toBe(1) // the skill only
    expect(r.unplacedHighlights).toBe(1)
  })

  test('duplicates are not counted as applied', () => {
    const existing = job('w1', 'Acme')
    existing.highlights = ['Built sites in Webflow']
    const r = mergeEnrichment(
      profile([existing]),
      facts({ newSkills: [], newWorkHighlights: [{ workId: 'w1', bullet: 'built sites in webflow' }] }),
    )
    expect(r.applied).toBe(0)
    expect(r.profile.work[0].highlights).toHaveLength(1)
  })

  // The reported case, end to end: "I worked with Pavago, on Webflow too."
  test('a job that is not on file is created, with what was said about it', () => {
    const r = mergeEnrichment(
      profile([job('w1', 'Acme')]),
      facts({
        newWork: [{ company: 'Pavago', highlights: ['Built and maintained sites in Webflow'] }],
        newSkills: ['Webflow'],
      }),
    )
    expect(r.applied).toBe(2) // the job and the skill
    expect(r.profile.work).toHaveLength(2)
    const pavago = r.profile.work.find((w) => w.company === 'Pavago')!
    expect(pavago.highlights).toEqual(['Built and maintained sites in Webflow'])
    expect(pavago.id).toBeTruthy()
    // No title and no dates were stated, so it must be flagged, not guessed.
    expect(r.incompleteWork).toEqual(['Pavago'])
    expect(needsCompletion(pavago)).toBe(true)
  })

  test('a job stated with title and dates is not flagged', () => {
    const r = mergeEnrichment(
      profile(),
      facts({ newWork: [{ company: 'Pavago', title: 'Web Developer', startYear: 2022, isCurrent: true }] }),
    )
    expect(r.incompleteWork).toEqual([])
    expect(needsCompletion(r.profile.work[0])).toBe(false)
  })

  test('naming a company already on file adds highlights, never a duplicate', () => {
    const r = mergeEnrichment(
      profile([job('w1', 'Pavago')]),
      facts({ newWork: [{ company: 'pavago', highlights: ['Built sites in Webflow'] }] }),
    )
    expect(r.profile.work).toHaveLength(1)
    expect(r.profile.work[0].highlights).toEqual(['Built sites in Webflow'])
    expect(r.applied).toBe(1)
  })

  test('an empty company name is ignored', () => {
    const r = mergeEnrichment(profile(), facts({ newWork: [{ company: '   ' }] }))
    expect(r.profile.work).toHaveLength(0)
    expect(r.applied).toBe(0)
  })

  test('skills, languages, certifications and empty link slots all count', () => {
    const r = mergeEnrichment(
      profile(),
      facts({
        newSkills: ['Webflow'],
        newLanguages: [{ name: 'Dutch', proficiency: 'elementary' }],
        newCertifications: [{ name: 'AWS SAA' }],
        newLinks: { portfolio: 'https://example.com' },
      }),
    )
    expect(r.applied).toBe(4)
    expect(r.profile.languages[0].langCode).toBe('nl')
  })

  test('a filled link slot is never overwritten, nor counted', () => {
    const p = profile()
    p.links = { portfolio: 'https://mine.example' }
    const r = mergeEnrichment(p, facts({ newLinks: { portfolio: 'https://theirs.example' } }))
    expect(r.applied).toBe(0)
    expect(r.profile.links.portfolio).toBe('https://mine.example')
  })
})
