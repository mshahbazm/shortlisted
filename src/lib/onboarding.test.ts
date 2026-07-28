// Where a returning user picks up. Pure, so it is worth pinning: getting this
// wrong either restarts a flow someone already finished, or skips past a
// question we genuinely never got an answer to.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { startAt } from './onboarding'
import { emptyProfile, type Profile, type Settings } from './types'

const named = (): Profile => {
  const p = emptyProfile()
  return { ...p, identity: { ...p.identity, firstName: 'Ada' } }
}
const withCv = (): Profile => ({ ...named(), headline: 'Engineer' })
const ai: Settings = { aiEndpoint: 'https://x/v1', aiModel: 'gpt-5.2' }

describe('startAt', () => {
  test('a first run starts at the top', () => {
    // The state every existing install is in the moment this ships: no door
    // recorded, because the field did not exist when they last ran it.
    expect(startAt(emptyProfile(), {})).toBe('welcome')
  })

  test('a door already chosen is not asked again', () => {
    expect(startAt(emptyProfile(), { onboardingDoor: 'noCv' })).toBe('name')
  })

  test('"I have a CV" with nothing parsed yet goes back for the CV', () => {
    // The one answer that cannot survive a closed panel: CV text lives in
    // wizard state and never reaches storage until it has been parsed.
    expect(startAt(emptyProfile(), { onboardingDoor: 'haveCv' })).toBe('paste')
  })

  test('"I have a CV" with a parsed profile moves on', () => {
    expect(startAt(withCv(), { onboardingDoor: 'haveCv' })).toBe('ai')
  })

  test('a known name skips the name step', () => {
    expect(startAt(named(), { onboardingDoor: 'noCv' })).toBe('ai')
  })

  test('AI already set up leaves nothing to ask', () => {
    expect(startAt(named(), { ...ai, onboardingDoor: 'noCv' })).toBe('end')
  })
})
