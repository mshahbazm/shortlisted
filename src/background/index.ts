// Service worker: message routing, pending-questions badge, on-demand
// injection for "Fill this page" on non-ATS sites.

import { Msg } from '../lib/messaging'
import * as store from '../lib/store'
import { BankAnswer, PendingQuestion, jobUrlKey, uid } from '../lib/types'
import { normalizeQuestion, similarity } from '../lib/questions'
import { runQuickScore } from '../ai/run'
import { pullFromCloud, startCloudMirror } from './cloudMirror'
// CRXJS: gives us the emitted content-script path for scripting.executeScript.
import contentScriptPath from '../content/index.ts?script'

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  void refreshBadge()
})

// Mirror local data to the signed-in account; load the account's data
// whenever the worker wakes.
startCloudMirror()
void pullFromCloud().catch((e) => console.error('[shortlisted] cloud load failed:', e))

async function refreshBadge() {
  const pending = await store.get('pendingQuestions')
  const n = pending.length
  await chrome.action.setBadgeText({ text: n ? String(n) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' })
}

chrome.runtime.onMessage.addListener((msg: Msg, _sender, sendResponse) => {
  handle(msg)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: String(err) }))
  return true // async response
})

async function handle(msg: Msg): Promise<unknown> {
  switch (msg.type) {
    case 'getFillState': {
      const [profile, answerBank, resumes, settings] = await Promise.all([
        store.get('profile'),
        store.get('answerBank'),
        store.get('resumes'),
        store.get('settings'),
      ])
      return {
        profile,
        answerBank,
        settings,
        resumes: resumes.map(({ id, label, fileName, isDefault, tags }) => ({ id, label, fileName, isDefault, tags })),
      }
    }

    case 'getResumeData': {
      const resumes = await store.get('resumes')
      const r = resumes.find((x) => x.id === msg.resumeId)
      return r ? { base64: r.dataBase64, fileName: r.fileName } : null
    }

    case 'saveAnswer': {
      const norm = normalizeQuestion(msg.questionRaw)
      await store.update('answerBank', (bank) => {
        const existing = bank.find((a) => a.questionNorm === norm || similarity(a.questionNorm, norm) >= 0.92)
        if (existing) {
          existing.answer = msg.answer
          existing.answerType = msg.answerType
          if (!existing.questionRaw.includes(msg.questionRaw)) existing.questionRaw.push(msg.questionRaw)
          existing.timesUsed += 1
          existing.lastUsedAt = Date.now()
          if (!existing.sourceJobUrls.includes(msg.jobUrl)) existing.sourceJobUrls.push(msg.jobUrl)
          return [...bank]
        }
        const fresh: BankAnswer = {
          id: uid(),
          questionNorm: norm,
          questionRaw: [msg.questionRaw],
          answer: msg.answer,
          answerType: msg.answerType,
          timesUsed: 1,
          lastUsedAt: Date.now(),
          sourceJobUrls: [msg.jobUrl],
        }
        return [...bank, fresh]
      })
      return { ok: true }
    }

    case 'markAnswerUsed': {
      await store.update('answerBank', (bank) =>
        bank.map((a) =>
          a.id === msg.answerId
            ? {
                ...a,
                timesUsed: a.timesUsed + 1,
                lastUsedAt: Date.now(),
                sourceJobUrls: a.sourceJobUrls.includes(msg.jobUrl) ? a.sourceJobUrls : [...a.sourceJobUrls, msg.jobUrl],
              }
            : a,
        ),
      )
      return { ok: true }
    }

    case 'capturePending': {
      await store.update('pendingQuestions', (pending) => {
        const next = [...pending]
        for (const q of msg.questions) {
          const norm = normalizeQuestion(q.questionRaw)
          const dupe = next.some((p) => normalizeQuestion(p.questionRaw) === norm)
          if (!dupe) next.push({ ...q, id: uid(), capturedAt: Date.now() } satisfies PendingQuestion)
        }
        return next
      })
      await refreshBadge()
      return { ok: true }
    }

    case 'resolvePending': {
      const norm = normalizeQuestion(msg.questionRaw)
      await store.update('pendingQuestions', (pending) =>
        pending.filter((p) => normalizeQuestion(p.questionRaw) !== norm),
      )
      await refreshBadge()
      return { ok: true }
    }

    case 'recordApplication': {
      await store.update('applications', (apps) => {
        // One record per job URL; re-clicking submit updates the timestamp.
        const existing = apps.find((a) => a.jobUrl === msg.record.jobUrl)
        if (existing) {
          existing.appliedAt = Date.now()
          return [...apps]
        }
        return [...apps, { ...msg.record, id: uid(), appliedAt: Date.now(), status: 'applied' as const }]
      })
      // If this URL is in the queue, mark it applied.
      await store.update('queue', (queue) =>
        queue.map((q) => (sameJob(q.url, msg.record.jobUrl) ? { ...q, status: 'applied' as const } : q)),
      )
      return { ok: true }
    }

    case 'openSidePanel': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.windowId) await chrome.sidePanel.open({ windowId: tab.windowId })
      return { ok: true }
    }

    case 'scoreFitPage': {
      const [settings, profile] = await Promise.all([store.get('settings'), store.get('profile')])
      if (profile.work.length === 0) return { error: 'Fill your profile first (side panel → Profile).' }
      try {
        const result = await runQuickScore(settings, profile, msg.jobText)
        await store.update('fitScores', (scores) => ({
          ...scores,
          [jobUrlKey(msg.jobUrl)]: { score: result.fit.overallScore, verdict: result.fit.verdict, at: Date.now() },
        }))
        return result
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }

    case 'fillCurrentTab': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id || !tab.url) return { error: 'No active tab.' }
      if (/^(chrome|edge|about|chrome-extension):/.test(tab.url)) return { error: 'Cannot fill this page.' }
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: [contentScriptPath],
        })
        return { ok: true }
      } catch (e) {
        return { error: `Could not inject: ${String(e)}` }
      }
    }

    case 'cloudPull': {
      try {
        await pullFromCloud()
        return { ok: true }
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }
  }
}

function sameJob(a: string, b: string): boolean {
  try {
    const ua = new URL(a)
    const ub = new URL(b)
    return ua.hostname === ub.hostname && ua.pathname.replace(/\/$/, '') === ub.pathname.replace(/\/$/, '')
  } catch {
    return a === b
  }
}

// Keep the badge honest if storage changes from the side panel.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingQuestions) void refreshBadge()
})
