import type { Settings } from './types'

// Which server this extension talks to is decided by how it is INSTALLED, not
// by how it was built.
//
// Chrome injects `update_url` into the manifest for extensions installed from
// the Web Store, and only for those. An unpacked build — the dist/ folder you
// load while developing — never has it. That single fact is a reliable dev/prod
// flag, and it is the one Chrome itself gives us.
//
// A build-time flag cannot do this job. It lives in whichever dist/ was written
// last, so any production build, run for any reason, silently repoints a
// development install at the hosted origin. The only symptom is a failed fetch
// against a URL nobody chose, from code that looks correct. Reading the install
// type instead reflects reality and cannot drift.
export const CLOUD_URL_DEV = 'http://localhost:3000'
// One line to flip when the production domain is final.
export const CLOUD_URL_PROD = 'https://shortlist.id'

/**
 * True when running as an unpacked or locally-packed extension — i.e. a
 * developer's machine rather than a real install. Deliberately not cached:
 * getManifest() is a cheap synchronous call, and a value computed once at
 * module load is exactly the kind of stale state this replaced.
 */
export function isDevInstall(): boolean {
  try {
    // `chrome` is an undeclared identifier outside the extension (tests,
    // tooling), where even optional chaining would throw, so check the type.
    if (typeof chrome === 'undefined' || !chrome.runtime?.getManifest) return false
    return !('update_url' in chrome.runtime.getManifest())
  } catch {
    // Not an extension context, or the call failed. Assume production:
    // pointing a real user at localhost is the worse of the two mistakes.
    return false
  }
}

/** The built-in endpoint for this install, before any Settings override. */
export function cloudUrlDefault(): string {
  return isDevInstall() ? CLOUD_URL_DEV : CLOUD_URL_PROD
}

/** The effective cloud base URL (no trailing slash): override or built-in. */
export function cloudBaseUrl(settings: Pick<Settings, 'cloudUrl'>): string {
  return (settings.cloudUrl?.trim() || cloudUrlDefault()).replace(/\/$/, '')
}
