// The two places this client guesses about the outside world, both pure and
// both worth pinning: what an endpoint sends back, and what it will refuse to
// accept.
//
// Written after two 400s in one evening from assuming providers behave
// alike — and after a third failure mode where an unreadable 200 was retried
// four times before reporting the wrong cause.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { readReplyText, seededRefusals } from './client'

describe('readReplyText', () => {
  test('the ordinary shape', () => {
    expect(readReplyText({ choices: [{ message: { content: 'hello' } }] })).toBe('hello')
  })

  test('multimodal content: an array of parts, text joined', () => {
    const body = { choices: [{ message: { content: [{ type: 'text', text: 'he' }, { type: 'text', text: 'llo' }] } }] }
    expect(readReplyText(body)).toBe('hello')
  })

  test('ignores non-text parts rather than stringifying them', () => {
    const body = {
      choices: [{ message: { content: [{ type: 'text', text: 'a' }, { type: 'image_url', image_url: { url: 'x' } }] } }],
    }
    expect(readReplyText(body)).toBe('a')
  })

  test('text directly on the choice, as some servers do', () => {
    expect(readReplyText({ choices: [{ text: 'hello' }] })).toBe('hello')
  })

  test('a genuinely empty answer is "" — retryable, not unreadable', () => {
    // The distinction the whole function exists for: a model that said nothing
    // is a provider hiccup worth retrying.
    expect(readReplyText({ choices: [{ message: { content: '' } }] })).toBe('')
  })

  test('an error-shaped 200 is null — permanent, not empty', () => {
    expect(readReplyText({ error: { message: 'nope' } })).toBeNull()
    expect(readReplyText({ choices: [] })).toBeNull()
    expect(readReplyText({})).toBeNull()
    expect(readReplyText(null)).toBeNull()
  })

  test('a choice with no readable text at all is null', () => {
    expect(readReplyText({ choices: [{ message: { role: 'assistant' } }] })).toBeNull()
  })
})

describe('seededRefusals', () => {
  test('knows the default model refuses temperature before trying it', () => {
    expect(seededRefusals('gpt-5.6-luna')).toContain('temperature')
  })

  test('matches the reasoning families too, case-insensitively', () => {
    expect(seededRefusals('o3-mini')).toContain('temperature')
    expect(seededRefusals('O1-Preview')).toContain('temperature')
  })

  test('assumes nothing about a model it has never heard of', () => {
    // The table must never be a gate: an unknown model gets every parameter
    // and finds out by asking, which is what keeps unlisted providers working.
    expect(seededRefusals('llama-3.3-70b')).toEqual([])
    expect(seededRefusals('mistral-large')).toEqual([])
    expect(seededRefusals('')).toEqual([])
  })
})
