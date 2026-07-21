// Mirrors the extension's data to the user's account on Shortlisted Cloud.
// chrome.storage stays the working copy (content scripts need instant reads
// and the panel must work offline), but once an account is linked the server
// is the source of truth: every local change is pushed (debounced), and
// pullFromCloud() overwrites local with the server's data on startup/sign-in.

import { fetchCloudData, pushCloudData } from '../ai/run'
import * as store from '../lib/store'
import { StorageShape, hasProfileContent } from '../lib/types'

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

// Writes we've applied FROM the server and still expect to see echoed back
// through onChanged. It lets the mirror tell its own pull apart from a genuine
// local edit deterministically — no fragile time window. Keyed by local storage
// key; each applied set() adds one expected echo, each matching change event
// consumes one.
const expectedEchoes = new Map<string, number>()
const pending = new Map<string, unknown>()
let pushTimer: ReturnType<typeof setTimeout> | undefined

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
    if (queued) schedulePush()
  })
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
  const settings = await store.get('settings')
  if (!settings.accountEmail || pending.size === 0) return
  const patch = Object.fromEntries(pending)
  pending.clear()
  try {
    await pushCloudData(settings, patch)
  } catch (e) {
    console.error('[shortlisted] cloud save failed, will retry:', e)
    for (const [k, v] of Object.entries(patch)) if (!pending.has(k)) pending.set(k, v)
    schedulePush(30_000)
  }
}

/**
 * Load the account's data from the server. Server wins wherever it has
 * content; local-only content (first run after sign-in) is pushed up instead.
 */
export async function pullFromCloud(): Promise<void> {
  const settings = await store.get('settings')
  if (!settings.accountEmail) return
  // Cloud-authoritative: flush any pending local writes FIRST, so the fetch
  // below can overwrite local without ever losing an edit that hadn't reached
  // the server yet. After this, the server is unambiguously the source of truth.
  await flushPending()
  const remote = await fetchCloudData(settings)
  const local = await store.getAll()
  const up: Record<string, unknown> = {}

  if (remote.profile) await applyRemote('profile', remote.profile)
  else if (hasProfileContent(local.profile)) up.profile = local.profile

  await applyList('resumes', remote.resumes, local.resumes, up)
  await applyList('applications', remote.applications, local.applications, up)
  await applyList('queue', remote.savedJobs, local.queue, up)
  await applyList('answerBank', remote.answers, local.answerBank, up)
  await applyList('pendingQuestions', remote.pendingQuestions, local.pendingQuestions, up)

  if (Object.keys(remote.fitScores).length) await applyRemote('fitScores', remote.fitScores)
  else if (Object.keys(local.fitScores).length) up.fitScores = local.fitScores

  if (Object.keys(up).length) await pushCloudData(settings, up)
}

async function applyList<K extends SyncedKey>(
  localKey: K,
  remote: StorageShape[K],
  local: StorageShape[K],
  up: Record<string, unknown>,
) {
  if (Array.isArray(remote) && remote.length) await applyRemote(localKey, remote)
  else if (Array.isArray(local) && local.length) up[SYNCED[localKey]] = local
}

