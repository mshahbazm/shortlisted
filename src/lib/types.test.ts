// Storage migrates on READ: normalizeSettings/normalizeProfile run on every load
// and reshape whatever's stored. A bug in either silently damages data the
// moment it's read — exactly how a "just strip the old server URL" change once
// deleted the login token and logged everyone out on reload. These tests pin the
// invariants that stop that class of regression: migration fills defaults and
// drops known-dead keys ONLY — it never loses auth, never loses user data, and
// running it twice changes nothing.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { clearResumeWanted, emptyProfile, hasProfileContent, markResumeWanted, normalizeProfile, normalizeSettings, resumeHelpWanted } from './types'

describe('normalizeSettings', () => {
  test('keeps auth fields — a migration must never sign the user out', () => {
    const raw = { cloudToken: 'sld_abc', accountEmail: 'a@b.co', onboarded: true, locale: 'de' }
    expect(normalizeSettings(raw)).toEqual(raw)
  })

  test('strips the dead cloudUrl but keeps the token (the reload-logout regression)', () => {
    const out = normalizeSettings({ cloudUrl: 'http://x', cloudToken: 'sld_abc', accountEmail: 'a@b.co' }) as Record<
      string,
      unknown
    >
    expect(out).not.toHaveProperty('cloudUrl')
    expect(out.cloudToken).toBe('sld_abc')
    expect(out.accountEmail).toBe('a@b.co')
  })

  test('is idempotent', () => {
    const raw = { cloudToken: 't', accountEmail: 'e', onboarded: true, aiProvider: 'x', cloudUrl: 'y' }
    const once = normalizeSettings(raw)
    expect(normalizeSettings(once)).toEqual(once)
  })

  test('preserves unknown/future keys (forward-compatible)', () => {
    const out = normalizeSettings({ someFutureFlag: 1 }) as Record<string, unknown>
    expect(out.someFutureFlag).toBe(1)
  })

  test('tolerates junk input', () => {
    expect(normalizeSettings(undefined)).toEqual({})
    expect(normalizeSettings(null)).toEqual({})
    expect(normalizeSettings('nope' as unknown)).toEqual({})
  })
})

describe('normalizeProfile', () => {
  test('preserves a full profile, including the raw `sources` we build from', () => {
    const p = { ...emptyProfile(), headline: 'Engineer', sources: { noCvIntro: { text: 'hi', at: 1 } } }
    const out = normalizeProfile(p)
    expect(out.headline).toBe('Engineer')
    expect(out.sources).toEqual({ noCvIntro: { text: 'hi', at: 1 } })
  })

  test('is idempotent (a second pass never changes or drops anything)', () => {
    const p = normalizeProfile({ headline: 'x', skills: ['a', 'b'], work: [{ company: 'C', title: 'T' }] })
    expect(normalizeProfile(p)).toEqual(p)
  })

  test('migrates v1 string skills without losing them', () => {
    const out = normalizeProfile({ skills: ['TypeScript', 'React'] })
    expect(out.skills.map((s) => s.name)).toEqual(['TypeScript', 'React'])
  })

  test('tolerates junk input', () => {
    expect(normalizeProfile(undefined)).toEqual(emptyProfile())
    expect(normalizeProfile(null)).toEqual(emptyProfile())
  })
})

describe('hasProfileContent', () => {
  test('empty profile has no content (→ the builder wizard)', () => {
    expect(hasProfileContent(emptyProfile())).toBe(false)
  })

  test('any of name / headline / work / skills counts as content (→ Home)', () => {
    expect(hasProfileContent({ ...emptyProfile(), identity: { ...emptyProfile().identity, firstName: 'Sam' } })).toBe(true)
    expect(hasProfileContent({ ...emptyProfile(), headline: 'Engineer' })).toBe(true)
    expect(hasProfileContent({ ...emptyProfile(), skills: [{ name: 'TypeScript' }] })).toBe(true)
  })
})

describe('resume-help-wanted flag (the builder gate)', () => {
  test('unset by default — legacy/has-CV accounts want no help, so the profile shows', () => {
    expect(resumeHelpWanted(emptyProfile())).toBe(false)
    // Content is irrelevant to the flag: it is set explicitly at sign-in, not derived.
    expect(resumeHelpWanted({ ...emptyProfile(), headline: 'Engineer' })).toBe(false)
  })

  test('markResumeWanted sets the flag and preserves the rest', () => {
    const p = { ...emptyProfile(), headline: 'Engineer', sources: { noCvIntro: { text: 'hi', at: 1 } } }
    const wanted = markResumeWanted(p)
    expect(resumeHelpWanted(wanted)).toBe(true)
    expect(wanted.headline).toBe('Engineer')
    expect(wanted.sources).toEqual({ noCvIntro: { text: 'hi', at: 1 } })
  })

  test('clearResumeWanted turns it back off (help delivered)', () => {
    expect(resumeHelpWanted(clearResumeWanted(markResumeWanted(emptyProfile())))).toBe(false)
  })

  test('is idempotent and survives normalizeProfile (syncs in the profile jsonb)', () => {
    const wanted = markResumeWanted(emptyProfile())
    expect(resumeHelpWanted(markResumeWanted(wanted))).toBe(true)
    expect(resumeHelpWanted(normalizeProfile(wanted))).toBe(true)
  })
})
