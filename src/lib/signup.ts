// The one thing this extension ever sends anywhere except the user's own AI
// endpoint: a name and an email address, typed by the user, on the one screen
// that asks for them, and only when they choose to fill it in.
//
// It is NOT an account. There is no password, no session, and nothing to sign
// in to — deliberately, because "create your account" would promise that
// installing on a second machine brings your data with it, and it does not.
// This is local-first; the mailing list is a mailing list.
//
// Everything else — the CV, the answer bank, the applications, the job history —
// stays in chrome.storage and is never read by this file. Keep it that way: the
// value of the ask is that it is small and legible, and a user who later reads
// this file should find exactly what the screen told them.

/**
 * Where the signup goes. A hosted form endpoint (Buttondown, Tally, Formspree,
 * Google Forms — anything that takes a POST), so there is no server of ours to
 * run and deletion requests are handled by that provider.
 *
 * EMPTY = the feature is off: the field still appears and the wizard still
 * works, but nothing is sent anywhere. That is the correct default for a public
 * repo — a fork, or a local build, must not quietly post to our list.
 */
const SIGNUP_ENDPOINT = ''

export interface Signup {
  firstName: string
  lastName: string
  email: string
}

const looksLikeEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

/**
 * Best-effort, fire-and-forget. A signup that fails must never block or even
 * be mentioned — the user came here to build a CV, and a mailing-list outage is
 * not their problem. Returns whether anything was actually sent, for tests.
 */
export async function sendSignup(s: Signup): Promise<boolean> {
  if (!SIGNUP_ENDPOINT || !looksLikeEmail(s.email)) return false
  try {
    await fetch(SIGNUP_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: s.email.trim(),
        name: [s.firstName.trim(), s.lastName.trim()].filter(Boolean).join(' '),
      }),
    })
    return true
  } catch {
    // Offline, blocked, or the form service is down. Nothing to recover.
    return false
  }
}
