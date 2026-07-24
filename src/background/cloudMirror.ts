// Mirrors the extension's data to the user's account on Shortlisted Cloud.
// chrome.storage stays the working copy (content scripts need instant reads and
// the panel must work offline), but once an account is linked the server is the
// source of truth: every local change is pushed (debounced), and pullFromCloud()
// overwrites local with the server's data on startup/sign-in.
//
// Durability: the push queue and its bookkeeping live in `storage.sync`
// (SyncState), not just memory, so an evicted MV3 worker resumes exactly where
// it left off; a failed push is retried through chrome.alarms, which survives
// eviction where a setTimeout would not.
//
// Deletes are EXPLICIT: the client diffs each collection against the ids the
// server last confirmed (`knownIds`) and sends the removed ids. The server never
// delete-by-absence, so a second device pushing a list that predates a row this
// device just added can't wipe it — the cornerstone of safe multi-device sync.

import { fetchCloudData, fetchResumePdf, pushCloudData } from '../ai/run'
import * as store from '../lib/store'
import { StorageShape, SyncState, emptyProfile, hasProfileContent } from '../lib/types'

/** local storage key → /v1/data wire key */
const SYNCED = {
  profile: 'profile',
  resumes: 'resumes',
  applications: 'applications',
  queue: 'savedJobs',
  answerBank: 'answers',
  pendingQuestions: 'pendingQuestions',
  fitScores: 'fitScores',
} as const

type SyncedKey = keyof typeof SYNCED

// Wire keys synced as id'd rows — the ones that use explicit-delete diffing.
// (profile/pendingQuestions are single documents; fitScores is upsert-only,
// keyed and regenerable, so none of them need delete tracking.)
const ID_COLLECTIONS = ['resumes', 'applications', 'savedJobs', 'answers'] as const
const RETRY_ALARM = 'shortlisted-sync-retry'
// Skip an incidental worker-wake pull if we pulled within this window; a genuine
// sign-in / explicit refresh passes { force: true } and ignores it.
const PULL_MIN_INTERVAL = 60_000

// ── in-memory mirror of the persisted SyncState (rehydrated on worker start) ──
const expectedEchoes = new Map<string, number>()
let pending = new Map<string, unknown>() // wire key → full collection value owed to the server
let knownIds: Record<string, string[]> = {}
let lastPullAt = 0
let mirrorOwner: string | undefined
let pushTimer: ReturnType<typeof setTimeout> | undefined
let ready: Promise<void> | undefined

const collectionIds = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((r) => (r as { id?: string }).id).filter((id): id is string => Boolean(id)) : []

/** Persist the live queue + bookkeeping so a worker eviction loses nothing. */
async function persist(): Promise<void> {
  const state: SyncState = { owner: mirrorOwner, outbox: Object.fromEntries(pending), knownIds, lastPullAt }
  await store.set('sync', state)
}

async function hydrate(): Promise<void> {
  const s = await store.get('sync')
  mirrorOwner = s.owner
  knownIds = s.knownIds ?? {}
  lastPullAt = s.lastPullAt ?? 0
  // Merge, don't replace: a change the listener queued while this awaited is
  // newer than the persisted copy, so it must win and survive hydration.
  const restored = new Map(Object.entries(s.outbox ?? {}))
  for (const [k, v] of pending) restored.set(k, v)
  pending = restored
  if (pending.size) schedulePush(0) // drain writes left over from a prior worker life
}

function ensureReady(): Promise<void> {
  return ready ?? Promise.resolve()
}

/** Write a value pulled from the server, marking it so the change listener does
 *  not bounce it straight back up as if it were a local edit. */
async function applyRemote<K extends SyncedKey>(key: K, value: StorageShape[K]): Promise<void> {
  expectedEchoes.set(key, (expectedEchoes.get(key) ?? 0) + 1)
  try {
    await store.set(key, value)
  } catch (e) {
    // No echo will arrive — drop the phantom count so it can't swallow the next
    // real edit on this key.
    expectedEchoes.set(key, (expectedEchoes.get(key) ?? 1) - 1)
    throw e
  }
}

export function startCloudMirror() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return
    let queued = false
    for (const [key, change] of Object.entries(changes)) {
      const wireKey = SYNCED[key as SyncedKey]
      if (!wireKey) continue
      const echo = expectedEchoes.get(key) ?? 0
      if (echo > 0) {
        expectedEchoes.set(key, echo - 1) // our own pull landing — don't bounce it back
        continue
      }
      pending.set(wireKey, change.newValue)
      queued = true
    }
    if (queued) {
      void persist() // durable before the debounce, so an eviction mid-wait loses nothing
      schedulePush()
    }
  })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === RETRY_ALARM) void flush()
  })
  ready = hydrate()
}

// Short debounce: batch a burst of keystrokes, but keep local and the server
// (the source of truth) converged within a fraction of a second, not seconds.
function schedulePush(delayMs = 400) {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void flush(), delayMs)
}

/** Push any queued local changes to the server NOW. Called before a pull so the
 *  server can never overwrite a local edit that hadn't reached it yet. */
export async function flushPending(): Promise<void> {
  clearTimeout(pushTimer)
  await flush()
}

async function flush() {
  await ensureReady()
  const settings = await store.get('settings')
  if (!settings.accountEmail || pending.size === 0) return
  // Not adopted yet / account is switching — defer; the imminent pull adopts the
  // owner and calls flushPending, so nothing is pushed to the wrong account.
  if (mirrorOwner !== settings.accountEmail) return

  const patch: Record<string, unknown> = {}
  const deletes: Record<string, string[]> = {}
  for (const [wireKey, value] of pending) {
    patch[wireKey] = value
    if ((ID_COLLECTIONS as readonly string[]).includes(wireKey)) {
      const gone = (knownIds[wireKey] ?? []).filter((id) => !collectionIds(value).includes(id))
      if (gone.length) deletes[wireKey] = gone
    }
  }
  if (Object.keys(deletes).length) patch.deletes = deletes

  const sent = new Map(pending)
  pending.clear()
  await persist()
  try {
    await pushCloudData(settings, patch)
    // Server now holds exactly what we sent — knownIds tracks that truth.
    for (const [wireKey, value] of sent) {
      if ((ID_COLLECTIONS as readonly string[]).includes(wireKey)) knownIds[wireKey] = collectionIds(value)
    }
    await persist()
  } catch (e) {
    console.error('[shortlisted] cloud save failed, will retry:', e)
    for (const [k, v] of sent) if (!pending.has(k)) pending.set(k, v)
    await persist()
    chrome.alarms.create(RETRY_ALARM, { delayInMinutes: 1 }) // survives worker eviction
  }
}

/**
 * Load the account's data from the server into local storage. The server is the
 * SOURCE OF TRUTH: local mirrors it exactly. We never push local "up" to fill an
 * empty remote — doing that adopted one account's leftover local data into
 * another (the cross-account leak). An empty remote for a key clears that key
 * locally. This account's own genuine edits reach the server via `pending` /
 * `flushPending` (called first), never via this pull.
 */
export async function pullFromCloud(opts?: { force?: boolean }): Promise<void> {
  await ensureReady()
  const settings = await store.get('settings')
  if (!settings.accountEmail) return

  // Account changed since this worker last synced (or first wake)? Drop any
  // queued writes and bookkeeping from the previous account so nothing crosses
  // over into the new one — and always pull fresh, throttle be damned.
  const switched = settings.accountEmail !== mirrorOwner
  if (switched) {
    pending.clear()
    expectedEchoes.clear()
    knownIds = {}
    clearTimeout(pushTimer)
    mirrorOwner = settings.accountEmail
    await persist()
  } else if (!opts?.force && Date.now() - lastPullAt < PULL_MIN_INTERVAL) {
    return // incidental worker-wake and we pulled moments ago — skip the churn
  }

  // Flush THIS account's pending writes first, so the authoritative fetch below
  // can't lose an edit that hadn't reached the server yet.
  await flushPending()
  const remote = await fetchCloudData(settings)
  const local = await store.getAll()

  if (remote.profile) await applyRemote('profile', remote.profile)
  else if (hasProfileContent(local.profile)) await applyRemote('profile', emptyProfile())

  // Resume rows arrive WITHOUT their PDF bytes (dataBase64 empty). Fill them from
  // the local cache where we already have them (an id's bytes never change — a
  // regenerated CV gets a new id), and fetch the rest on demand. So a steady-state
  // sync transfers no PDF bytes at all.
  const hydratedResumes = await hydrateResumeBytes(settings, remote.resumes, local.resumes)
  await reconcile('resumes', hydratedResumes, local.resumes)
  await reconcile('applications', remote.applications, local.applications)
  await reconcile('queue', remote.savedJobs, local.queue)
  await reconcile('answerBank', remote.answers, local.answerBank)
  await reconcile('pendingQuestions', remote.pendingQuestions, local.pendingQuestions)

  if (Object.keys(remote.fitScores).length) await applyRemote('fitScores', remote.fitScores)
  else if (Object.keys(local.fitScores).length) await applyRemote('fitScores', {})

  // Server truth is now local truth — reset delete-diffing baselines to match.
  knownIds.resumes = collectionIds(remote.resumes)
  knownIds.applications = collectionIds(remote.applications)
  knownIds.savedJobs = collectionIds(remote.savedJobs)
  knownIds.answers = collectionIds(remote.answers)
  lastPullAt = Date.now()
  await persist()
}

/** Fill each remote resume's PDF bytes: reuse the local cache when we already
 *  have them (bytes are immutable per id), else fetch on demand. Inline (dev)
 *  rows already carry their bytes. A failed fetch leaves the row empty for a
 *  later sync to retry. */
async function hydrateResumeBytes(
  settings: StorageShape['settings'],
  remote: StorageShape['resumes'],
  local: StorageShape['resumes'],
): Promise<StorageShape['resumes']> {
  const cached = new Map(local.map((r) => [r.id, r.dataBase64]))
  return Promise.all(
    remote.map(async (r) => {
      if (r.dataBase64) return r
      const have = cached.get(r.id)
      if (have) return { ...r, dataBase64: have }
      try {
        return { ...r, dataBase64: await fetchResumePdf(settings, r.id) }
      } catch {
        return r
      }
    }),
  )
}

/** Mirror one array key from the server: server has rows → apply them; server is
 *  empty but local isn't → clear local. Never the other way (no push-up). */
async function reconcile<K extends SyncedKey>(localKey: K, remote: StorageShape[K], local: StorageShape[K]) {
  if (Array.isArray(remote) && remote.length) await applyRemote(localKey, remote)
  else if (Array.isArray(local) && local.length) await applyRemote(localKey, [] as unknown as StorageShape[K])
}
