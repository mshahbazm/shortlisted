import type { Settings } from './types'

// Build-time cloud endpoints — the URL is CONFIG, not stored state, so it can
// never go stale in chrome.storage:
//   bun run dev / bun run build:dev  → development build → local server
//   bun run build                    → production build  → hosted origin
// Settings.cloudUrl is an advanced override; empty = use the built-in default.
export const CLOUD_URL_DEV = 'http://localhost:3000'
// One line to flip when the production domain is final.
export const CLOUD_URL_PROD = 'https://shortlist.id'

// MODE (not DEV): `vite build --mode development` sets MODE='development' but
// leaves DEV=false, since DEV tracks NODE_ENV, which stays 'production' in builds.
export const CLOUD_URL_DEFAULT = import.meta.env.MODE === 'production' ? CLOUD_URL_PROD : CLOUD_URL_DEV

/** The effective cloud base URL (no trailing slash): override or built-in. */
export function cloudBaseUrl(settings: Pick<Settings, 'cloudUrl'>): string {
  return (settings.cloudUrl?.trim() || CLOUD_URL_DEFAULT).replace(/\/$/, '')
}
