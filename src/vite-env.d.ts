/// <reference types="vite/client" />

// CRXJS: importing a script with ?script returns its emitted file path,
// usable with chrome.scripting.executeScript.
declare module '*?script' {
  const path: string
  export default path
}

// Build-time configuration. Vite inlines these into the bundle, so they are
// visible in the shipped extension — they exist to keep values out of this
// public repo, not to keep them secret. See src/lib/signup.ts.
interface ImportMetaEnv {
  /** POST target for the optional name/email signup. Unset = feature off. */
  readonly VITE_SIGNUP_ENDPOINT?: string
  /** Sent as `x-shortlisted-key` so the receiver can drop junk. Not a secret. */
  readonly VITE_SIGNUP_TOKEN?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
