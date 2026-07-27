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

// ---------------------------------------------------------------------------
// A NOTE ON THE "SECRET" BELOW, because it is easy to get wrong.
//
// Neither value is secret in the shipped extension. A .crx is a zip of
// JavaScript: anyone can install it, unpack it, and read every string in it.
// Build-time env vars change nothing about that — Vite INLINES them, so
// `import.meta.env.X` is a literal in the output file.
//
// What reading them from the environment DOES buy is that they stay out of this
// public repository: a fork, a casual reader, or a local dev build gets nothing
// and posts nowhere. That is real and useful. It is just not a security
// boundary and must never be treated as one.
//
// The token therefore raises the cost of abuse from "curl the URL" to "unpack
// the extension and find the header" — worth having, useless alone. The real
// defence lives on the receiving end: rate limits, validation, and an endpoint
// that can only ever append. See .env.example.
// ---------------------------------------------------------------------------

/**
 * Where the signup goes — anything that accepts a POST (a Cloudflare Worker in
 * front of a sheet, an Apps Script web app, Tally, Formspree). No server of
 * ours to run.
 *
 * EMPTY = the feature is off: the field still appears and the wizard still
 * works, but nothing is sent anywhere. That is what every build without a
 * `.env` gets, which is the right default for a public repo — a fork must not
 * quietly post to our list.
 */
const SIGNUP_ENDPOINT = import.meta.env.VITE_SIGNUP_ENDPOINT ?? ''

/** Sent as a header so the receiving end can drop anything that did not come
 *  from a build of ours. Not a secret (see above) — a speed bump. */
const SIGNUP_TOKEN = import.meta.env.VITE_SIGNUP_TOKEN ?? ''

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
      headers: {
        'content-type': 'application/json',
        ...(SIGNUP_TOKEN ? { 'x-shortlisted-key': SIGNUP_TOKEN } : {}),
      },
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
