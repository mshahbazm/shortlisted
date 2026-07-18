// Mirrors the extension's data to the user's account on Shortlisted Cloud.
// chrome.storage stays the working copy (content scripts need instant reads
// and the panel must work offline), but once an account is linked the server
// is the source of truth: every local change is pushed (debounced), and
// pullFromCloud() overwrites local with the server's data on startup/sign-in.

import { fetchCloudData, pushCloudData } from '../ai/run'
import * as store from '../lib/store'
import { StorageShape } from '../lib/types'

/** local storage key → /v1/data wire key */
const SYNCED = {
  profile: 'profile',
  resumes: 'resumes',
  applications: 'applications',
  queue: 'savedJobs',
  answerBank: 'answers',
  fitScores: 'fitScores',
} as const

type SyncedKey = keyof typeof SYNCED

let applyingRemote = false
const pending = new Map<string, unknown>()
let pushTimer: ReturnType<typeof setTimeout> | undefined

export function startCloudMirror() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || applyingRemote) return
    let queued = false
    for (const [key, change] of Object.entries(changes)) {
      const wireKey = SYNCED[key as SyncedKey]
      if (!wireKey) continue
      pending.set(wireKey, change.newValue)
      queued = true
    }
    if (queued) schedulePush()
  })
}

function schedulePush(delayMs = 1500) {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => void flush(), delayMs)
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
  const remote = await fetchCloudData(settings)
  const local = await store.getAll()
  const up: Record<string, unknown> = {}

  applyingRemote = true
  try {
    if (remote.profile) await store.set('profile', remote.profile)
    else if (hasProfileContent(local.profile)) up.profile = local.profile

    await applyList('resumes', remote.resumes, local.resumes, up)
    await applyList('applications', remote.applications, local.applications, up)
    await applyList('queue', remote.savedJobs, local.queue, up)
    await applyList('answerBank', remote.answers, local.answerBank, up)

    if (Object.keys(remote.fitScores).length) await store.set('fitScores', remote.fitScores)
    else if (Object.keys(local.fitScores).length) up.fitScores = local.fitScores
  } finally {
    // onChanged fires after the writes settle; keep the guard up briefly so
    // our own applies don't bounce straight back to the server.
    setTimeout(() => {
      applyingRemote = false
    }, 500)
  }

  if (Object.keys(up).length) await pushCloudData(settings, up)
}

async function applyList<K extends SyncedKey>(
  localKey: K,
  remote: StorageShape[K],
  local: StorageShape[K],
  up: Record<string, unknown>,
) {
  if (Array.isArray(remote) && remote.length) await store.set(localKey, remote)
  else if (Array.isArray(local) && local.length) up[SYNCED[localKey]] = local
}

function hasProfileContent(p: StorageShape['profile']): boolean {
  return Boolean(p.identity.firstName || p.headline || p.work.length || p.skills.length)
}
