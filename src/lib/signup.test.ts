// The signup sender is the only thing in this extension that transmits anything
// about the user anywhere except their own AI endpoint, so its guards are worth
// pinning: it must stay silent unless an endpoint is configured AND the user
// actually typed an address.
//
// Run: bun test

import { expect, test, describe, mock } from 'bun:test'
import { sendSignup } from './signup'

describe('sendSignup', () => {
  test('sends nothing while SIGNUP_ENDPOINT is unset', async () => {
    // The default in this repo. A fork, or a local dev build, must never post
    // to anyone's list just by existing — so "off" has to be the shipped state.
    const fetchMock = mock(() => Promise.resolve(new Response('{}')))
    const original = globalThis.fetch
    globalThis.fetch = fetchMock as unknown as typeof fetch
    try {
      expect(await sendSignup({ firstName: 'A', lastName: 'B', email: 'a@b.co' })).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = original
    }
  })

  test('refuses anything that is not an address', async () => {
    for (const email of ['', '   ', 'nope', 'a@b', 'a b@c.co']) {
      expect(await sendSignup({ firstName: 'A', lastName: 'B', email })).toBe(false)
    }
  })
})
