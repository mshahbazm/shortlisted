// The dev/prod endpoint decision. This used to be a build-time flag baked into
// whichever dist/ was written last, which meant a production build run for any
// reason silently repointed a development install at the hosted origin. It now
// reads how the extension is actually installed, so these tests pin the two
// things that matter: a Web Store install never gets localhost, and an unpacked
// install never gets production.
//
// Run: bun test

import { expect, test, describe, afterEach } from 'bun:test'
import { CLOUD_URL_DEV, CLOUD_URL_PROD, cloudBaseUrl, cloudUrlDefault, isDevInstall } from './config'

type ManifestStub = { update_url?: string }
const g = globalThis as { chrome?: unknown }

/** Stand in for the extension runtime. Omit update_url = unpacked build. */
function asInstall(manifest: ManifestStub | null) {
  if (manifest === null) delete g.chrome
  else g.chrome = { runtime: { getManifest: () => manifest } }
}

afterEach(() => {
  delete g.chrome
})

describe('cloud endpoint follows the install type', () => {
  test('unpacked build (no update_url) uses the local server', () => {
    asInstall({})
    expect(isDevInstall()).toBe(true)
    expect(cloudUrlDefault()).toBe(CLOUD_URL_DEV)
  })

  test('Web Store install uses production', () => {
    asInstall({ update_url: 'https://clients2.google.com/service/update2/crx' })
    expect(isDevInstall()).toBe(false)
    expect(cloudUrlDefault()).toBe(CLOUD_URL_PROD)
  })

  // Anything that is not a live extension — tests, tooling, a bundler probing
  // the module — must never hand out localhost.
  test('outside an extension context, falls back to production', () => {
    asInstall(null)
    expect(isDevInstall()).toBe(false)
    expect(cloudUrlDefault()).toBe(CLOUD_URL_PROD)
  })

  test('a throwing runtime falls back to production', () => {
    g.chrome = {
      runtime: {
        getManifest: () => {
          throw new Error('no runtime')
        },
      },
    }
    expect(isDevInstall()).toBe(false)
  })

  test('re-reads the install type on every call, never caches', () => {
    asInstall({})
    expect(cloudUrlDefault()).toBe(CLOUD_URL_DEV)
    asInstall({ update_url: 'https://clients2.google.com/service/update2/crx' })
    expect(cloudUrlDefault()).toBe(CLOUD_URL_PROD)
  })
})

describe('cloudBaseUrl follows the install type, with no user override', () => {
  test('unpacked build resolves to the local server', () => {
    asInstall({})
    expect(cloudBaseUrl()).toBe(CLOUD_URL_DEV)
  })

  test('Web Store install resolves to production', () => {
    asInstall({ update_url: 'https://clients2.google.com/service/update2/crx' })
    expect(cloudBaseUrl()).toBe(CLOUD_URL_PROD)
  })
})
