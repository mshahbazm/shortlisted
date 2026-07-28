// Does what the wizard writes actually survive a reload, and land the user on
// the step they had reached?
//
// Separate from onboarding.test.ts because this one needs `chrome.storage`
// stubbed BEFORE store.ts is imported — hence the dynamic imports below. It
// exercises the real store rather than reasoning about it: the earlier version
// of this feature "worked" three times in a row by inspection and did not work
// once in the browser, which is what this file exists to stop.
//
// What it does NOT cover: React mounting. If a bug survives these tests, it is
// in when the wizard is mounted, not in what it remembers.
//
// Run: bun test

import { expect, test, describe, beforeEach } from 'bun:test'

const disk: Record<string, unknown> = {}
;(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: {
      get: async (k: string | null) => (k === null ? { ...disk } : { [k]: disk[k] }),
      set: async (obj: Record<string, unknown>) => {
        Object.assign(disk, obj)
      },
    },
    onChanged: { addListener() {}, removeListener() {} },
  },
}

const store = await import('./store')
const { startAt } = await import('./onboarding')
const { emptyProfile } = await import('./types')

/** What ctx.rememberName writes — blanks only, so a parsed CV always wins. */
const seed = (p: ReturnType<typeof emptyProfile>, first: string, last: string) => ({
  ...p,
  identity: {
    ...p.identity,
    firstName: p.identity.firstName || first.trim(),
    lastName: p.identity.lastName || last.trim(),
  },
})

describe('a reload resumes where the user left off', () => {
  beforeEach(() => {
    for (const k of Object.keys(disk)) delete disk[k]
  })

  test('the welcome answer alone skips the welcome screen', async () => {
    await store.update('settings', (x) => ({ ...x, onboardingDoor: 'noCv' as const }))
    expect(startAt(await store.get('profile'), await store.get('settings'))).toBe('name')
  })

  test('door plus name lands on the AI step', async () => {
    await store.update('settings', (x) => ({ ...x, onboardingDoor: 'noCv' as const }))
    await store.update('profile', (p) => seed(p, 'Ada', 'Lovelace'))
    expect(startAt(await store.get('profile'), await store.get('settings'))).toBe('ai')
  })

  test('the door survives normalizeSettings on the way back out', async () => {
    // The specific way this could break silently: a new key added to Settings
    // but caught by the legacy-strip list, so every write vanishes on read.
    await store.update('settings', (x) => ({ ...x, onboardingDoor: 'haveCv' as const }))
    expect((await store.get('settings')).onboardingDoor).toBe('haveCv')
  })

  test('a half-finished haveCv door still asks for the CV', async () => {
    await store.update('settings', (x) => ({ ...x, onboardingDoor: 'haveCv' as const }))
    await store.update('profile', (p) => seed(p, 'Ada', 'Lovelace'))
    // Name known, but nothing parsed — the CV text never reached storage.
    expect(startAt(await store.get('profile'), await store.get('settings'))).toBe('paste')
  })
})
