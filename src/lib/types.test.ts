// Storage migrates on READ: normalizeSettings/normalizeProfile run on every load
// and reshape whatever's stored. A bug in either silently damages data the
// moment it's read. These tests pin the invariants: migration fills defaults and
// drops known-dead keys ONLY — it never loses user data, and running it twice
// changes nothing.
//
// The auth keys are now among the dead ones. They used to be the thing these
// tests protected (stripping the old server URL once took the login token with
// it and logged everyone out on reload), but there is no server to hold a
// session with any more, so carrying a bearer token in storage is dead weight
// pointing at nothing. That reversal is asserted below rather than left implied.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { aiConfigured, clearResumeWanted, emptyProfile, hasProfileContent, markResumeWanted, normalizeProfile, normalizeSettings, probeMatches, resumeHelpWanted } from './types'

describe('normalizeSettings', () => {
  test('keeps the settings that still mean something', () => {
    const raw = { onboarded: true, locale: 'de', aiEndpoint: 'https://api.openai.com/v1', aiModel: 'gpt-5.2' }
    expect(normalizeSettings(raw)).toEqual(raw)
  })

  test('drops the cloud account left by an older version', () => {
    const out = normalizeSettings({
      cloudUrl: 'http://x',
      cloudToken: 'sld_abc',
      accountEmail: 'a@b.co',
      dataOwner: 'a@b.co',
      locale: 'de',
    }) as Record<string, unknown>
    expect(out).not.toHaveProperty('cloudUrl')
    expect(out).not.toHaveProperty('cloudToken')
    expect(out).not.toHaveProperty('accountEmail')
    expect(out).not.toHaveProperty('dataOwner')
    // Everything that isn't part of the dead account survives.
    expect(out.locale).toBe('de')
  })

  test('drops the per-provider keys from the older multi-provider BYOK layer', () => {
    const out = normalizeSettings({
      aiProvider: 'anthropic',
      anthropicKey: 'sk-ant',
      ollamaEndpoint: 'http://localhost:11434',
      aiEndpoint: 'https://api.openai.com/v1',
    }) as Record<string, unknown>
    expect(out).not.toHaveProperty('aiProvider')
    expect(out).not.toHaveProperty('anthropicKey')
    expect(out).not.toHaveProperty('ollamaEndpoint')
    expect(out.aiEndpoint).toBe('https://api.openai.com/v1')
  })

  test('is idempotent', () => {
    const raw = { cloudToken: 't', accountEmail: 'e', onboarded: true, aiProvider: 'x', cloudUrl: 'y', aiModel: 'gpt-5.2' }
    const once = normalizeSettings(raw)
    expect(normalizeSettings(once)).toEqual(once)
  })

  test('preserves unknown/future keys (forward-compatible)', () => {
    const out = normalizeSettings({ someFutureFlag: 1 }) as Record<string, unknown>
    expect(out.someFutureFlag).toBe(1)
  })

  test('aiConfigured needs both an endpoint and a model', () => {
    expect(aiConfigured({})).toBe(false)
    expect(aiConfigured({ aiEndpoint: 'https://x/v1' })).toBe(false)
    expect(aiConfigured({ aiModel: 'gpt-5.2' })).toBe(false)
    expect(aiConfigured({ aiEndpoint: '   ', aiModel: 'gpt-5.2' })).toBe(false)
    expect(aiConfigured({ aiEndpoint: 'https://x/v1', aiModel: 'gpt-5.2' })).toBe(true)
  })

  test('a probe goes stale the moment the endpoint or model changes', () => {
    // Otherwise Settings would keep showing a green "working" against a model
    // that was never tested — the one thing the probe exists to prevent.
    const aiProbe = { at: 1, endpoint: 'https://x/v1', model: 'a', json: true, vision: true }
    expect(probeMatches({ aiEndpoint: 'https://x/v1', aiModel: 'a', aiProbe })).toBe(true)
    expect(probeMatches({ aiEndpoint: 'https://x/v1', aiModel: 'b', aiProbe })).toBe(false)
    expect(probeMatches({ aiEndpoint: 'https://y/v1', aiModel: 'a', aiProbe })).toBe(false)
    expect(probeMatches({})).toBe(false)
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

  test('aiConfigured needs both an endpoint and a model', () => {
    expect(aiConfigured({})).toBe(false)
    expect(aiConfigured({ aiEndpoint: 'https://x/v1' })).toBe(false)
    expect(aiConfigured({ aiModel: 'gpt-5.2' })).toBe(false)
    expect(aiConfigured({ aiEndpoint: '   ', aiModel: 'gpt-5.2' })).toBe(false)
    expect(aiConfigured({ aiEndpoint: 'https://x/v1', aiModel: 'gpt-5.2' })).toBe(true)
  })

  test('a probe goes stale the moment the endpoint or model changes', () => {
    // Otherwise Settings would keep showing a green "working" against a model
    // that was never tested — the one thing the probe exists to prevent.
    const aiProbe = { at: 1, endpoint: 'https://x/v1', model: 'a', json: true, vision: true }
    expect(probeMatches({ aiEndpoint: 'https://x/v1', aiModel: 'a', aiProbe })).toBe(true)
    expect(probeMatches({ aiEndpoint: 'https://x/v1', aiModel: 'b', aiProbe })).toBe(false)
    expect(probeMatches({ aiEndpoint: 'https://y/v1', aiModel: 'a', aiProbe })).toBe(false)
    expect(probeMatches({})).toBe(false)
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
