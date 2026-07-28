// Onboarding progress, derived rather than tracked.
//
// Lives here rather than beside the wizard so it can be tested: importing the
// wizard drags in React and the pdf.js worker, and a pure branch this
// load-bearing should not need either to be checked.

import { aiConfigured, hasProfileContent, type Profile, type Settings } from './types'

/**
 * Where a returning user picks up.
 *
 * Every step here writes what it learns somewhere durable — the door into
 * settings, the name onto the profile, the address into `signedUpAt`, the
 * endpoint into settings — so "what have they already answered" can be read
 * back rather than tracked. Closing the panel halfway through therefore costs
 * the current screen, not the whole flow.
 *
 * The one thing that cannot survive is the pasted CV text: it lives in wizard
 * state and never touches storage until it has been parsed. So a `haveCv` door
 * with nothing on the profile yet resumes at `paste` — asking for the CV again
 * is right, because we genuinely never got it.
 */
export function startAt(p: Profile, s: Settings): string {
  if (!s.onboardingDoor) return 'welcome'
  if (s.onboardingDoor === 'haveCv' && !hasProfileContent(p)) return 'paste'
  if (!p.identity.firstName.trim()) return 'name'
  if (!aiConfigured(s)) return 'ai'
  // Nothing left to ask. Reached only if `onboarded` was never written — the
  // end step sets it and closes.
  return 'end'
}
