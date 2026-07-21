import { StorageShape, normalizeProfile, normalizeSettings, storageDefaults } from './types'

type Key = keyof StorageShape

export async function get<K extends Key>(key: K): Promise<StorageShape[K]> {
  const res = await chrome.storage.local.get(key)
  const value = res[key] ?? storageDefaults()[key]
  // Values saved by older versions are migrated transparently on read.
  if (key === 'profile') return normalizeProfile(value) as StorageShape[K]
  if (key === 'settings') return normalizeSettings(value) as StorageShape[K]
  return value
}

export async function getAll(): Promise<StorageShape> {
  const res = await chrome.storage.local.get(null)
  const all = { ...storageDefaults(), ...res } as StorageShape
  return { ...all, settings: normalizeSettings(all.settings) }
}

export async function set<K extends Key>(key: K, value: StorageShape[K]): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function update<K extends Key>(
  key: K,
  fn: (current: StorageShape[K]) => StorageShape[K],
): Promise<StorageShape[K]> {
  const current = await get(key)
  const next = fn(current)
  await set(key, next)
  return next
}

export function onChange<K extends Key>(key: K, cb: (value: StorageShape[K]) => void): () => void {
  const listener = (changes: { [k: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes[key]) cb(changes[key].newValue ?? storageDefaults()[key])
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// There's no local-first per-user bucketing yet — this device holds one
// account's data at a time — so signing out must wipe it, or the next
// person to sign in on this device sees the previous person's CV,
// applications, and answer bank. Device-level preferences (cloudUrl
// override, locale, detectEverywhere) are left alone.
export async function clearAccount(): Promise<void> {
  const defaults = storageDefaults()
  const settings = await get('settings')
  await chrome.storage.local.set({
    profile: defaults.profile,
    answerBank: defaults.answerBank,
    pendingQuestions: defaults.pendingQuestions,
    resumes: defaults.resumes,
    applications: defaults.applications,
    queue: defaults.queue,
    fitScores: defaults.fitScores,
    pendingNav: defaults.pendingNav,
    settings: { ...settings, accountEmail: undefined, cloudToken: undefined, onboarded: undefined },
  })
}
