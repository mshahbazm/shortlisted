// The signup sender is the only thing in this extension that transmits anything
// about the user anywhere except their own AI endpoint, so its guards are worth
// pinning: it stays silent unless an endpoint is configured AND the user
// actually typed an address.
//
// These test `willSend`, the pure decision, rather than `sendSignup` — the
// latter reads a build-time env var, so a test around it would pass or fail
// depending on whether whoever ran it happened to have a .env. That is exactly
// the kind of test that gets deleted in frustration six months from now.
//
// Run: bun test

import { expect, test, describe, mock } from 'bun:test'
import { sendSignup, willSend } from './signup'

describe('willSend', () => {
  test('stays silent with no endpoint, however good the address', () => {
    // The shipped default in this repo. A fork, or a local dev build, must
    // never post to anyone's list just by existing.
    expect(willSend('', 'a@b.co')).toBe(false)
  })

  test('refuses anything that is not an address', () => {
    for (const email of ['', '   ', 'nope', 'a@b', 'a b@c.co']) {
      expect(willSend('https://example.com', email)).toBe(false)
    }
  })

  test('sends only when it has both', () => {
    expect(willSend('https://example.com', 'a@b.co')).toBe(true)
  })
})

describe('sendSignup', () => {
  test('never touches the network for a bad address', async () => {
    // True regardless of whether this build has an endpoint configured.
    const fetchMock = mock(() => Promise.resolve(new Response('{}')))
    const original = globalThis.fetch
    globalThis.fetch = fetchMock as unknown as typeof fetch
    try {
      expect(await sendSignup({ firstName: 'A', lastName: 'B', email: 'nope' })).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })
})
