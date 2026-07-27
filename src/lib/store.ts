import { StorageShape, normalizeProfile, normalizeSettings, storageDefaults } from './types'

type Key = keyof StorageShape

// chrome.storage has no atomic read-modify-write, so two update() calls on the
// same key — e.g. the service worker provisioning a device token while the panel
// writes `onboarded` — can each read the old value and then clobber the other's
// field, silently losing the login token. Serialize every WRITE to a key through
// a per-key promise chain: a queued task runs only after the previous one has
// committed, so update()'s read always sees the latest value.
const writeChains = new Map<Key, Promise<unknown>>()

function enqueue<R>(key: Key, task: () => Promise<R>): Promise<R> {
  const prev = writeChains.get(key) ?? Promise.resolve()
  const run = prev.then(task, task) // run even if the previous task rejected
  writeChains.set(key, run.catch(() => undefined)) // a failure must not wedge the queue
  return run
}

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

export function set<K extends Key>(key: K, value: StorageShape[K]): Promise<void> {
  return enqueue(key, () => chrome.storage.local.set({ [key]: value }))
}

export function update<K extends Key>(
  key: K,
  fn: (current: StorageShape[K]) => StorageShape[K],
): Promise<StorageShape[K]> {
  // Read and write inside one queued task — and via the raw API, not set(),
  // which would re-enqueue on this key and deadlock — so the pair is atomic.
  return enqueue(key, async () => {
    const current = await get(key)
    const next = fn(current)
    await chrome.storage.local.set({ [key]: next })
    return next
  })
}

export function onChange<K extends Key>(key: K, cb: (value: StorageShape[K]) => void): () => void {
  const listener = (changes: { [k: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes[key]) cb(changes[key].newValue ?? storageDefaults()[key])
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

// The account-content keys this device caches — everything except device-level
// settings. Kept as one list so the wipe and the export can't drift apart.
function contentDefaults() {
  const d = storageDefaults()
  return {
    profile: d.profile,
    answerBank: d.answerBank,
    pendingQuestions: d.pendingQuestions,
    resumes: d.resumes,
    applications: d.applications,
    queue: d.queue,
    fitScores: d.fitScores,
    intake: d.intake,
    pendingNav: d.pendingNav,
  }
}

/**
 * Erase everything this extension knows about the user — profile, CVs,
 * applications, answer bank, saved jobs, the builder transcript. Settings (AI
 * endpoint, key, locale) are left alone: they describe the tool, not the person.
 *
 * This used to be sign-out, which had to wipe because one device held one
 * account's cache and the next person to sign in must not see it. There are no
 * accounts now and nothing leaves this machine, so the wipe is no longer a
 * safety mechanism — it is just the "start over" button, and the only way to
 * get rid of the data short of uninstalling. It cannot be undone; export first.
 */
export function clearAllData(): Promise<void> {
  return enqueue('profile', () => chrome.storage.local.set(contentDefaults()))
}
