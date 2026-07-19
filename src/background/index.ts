// Service worker: message routing, pending-questions badge, on-demand
// injection for "Fill this page" on non-ATS sites.

import { Msg } from '../lib/messaging'
import * as store from '../lib/store'
import { BankAnswer, PendingQuestion, Profile, ResumeVariant, jobUrlKey, uid } from '../lib/types'
import { normalizeQuestion, similarity } from '../lib/questions'
import { cloudFillAssist, cloudResumeIntake, polishAnswer, runQuickScore, runTailorCv } from '../ai/run'
import { renderResumePdf } from '../pdf/resumePdf'
import { pullFromCloud, startCloudMirror } from './cloudMirror'
// CRXJS: gives us the emitted content-script path for scripting.executeScript.
import contentScriptPath from '../content/index.ts?script'

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  void refreshBadge()
})

// The badge must track pendingQuestions no matter WHO writes it — the side
// panel edits the list directly, not only through messages.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.pendingQuestions) void refreshBadge()
})

// Mirror local data to the signed-in account; load the account's data
// whenever the worker wakes.
startCloudMirror()
void pullFromCloud().catch((e) => console.error('[shortlisted] cloud load failed:', e))

async function refreshBadge() {
  const pending = await store.get('pendingQuestions')
  const n = pending.length
  await chrome.action.setBadgeText({ text: n ? String(n) : '' })
  await chrome.action.setBadgeBackgroundColor({ color: '#3d11ff' })
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

    // A CV uploaded straight from the on-page panel (the form asked for one
    // and the bank was empty). First CV in becomes the default.
    case 'saveResume': {
      const entry: ResumeVariant = {
        id: uid(),
        label: msg.fileName.replace(/\.pdf$/i, ''),
        fileName: msg.fileName,
        tags: [],
        isDefault: false,
        createdAt: Date.now(),
        source: 'uploaded',
        dataBase64: msg.base64,
      }
      let list: ResumeVariant[] = []
      await store.update('resumes', (resumes) => {
        entry.isDefault = resumes.length === 0
        list = [...resumes, entry]
        return list
      })
      // Tag it and fold new facts into the profile in the background.
      void intakeResume(entry.id)
      return {
        id: entry.id,
        resumes: list.map(({ id, label, fileName, isDefault, tags }) => ({ id, label, fileName, isDefault, tags })),
      }
    }

    case 'intakeResume': {
      void intakeResume(msg.resumeId)
      return { ok: true }
    }

    // "Tailor a new CV for this job" from the on-page panel: tailor against
    // the page's job text, render in the chosen template, save it to the CV
    // list (NOT as default), hand back the id so the panel can attach it.
    case 'tailorAttach': {
      const [settings, profile] = await Promise.all([store.get('settings'), store.get('profile')])
      if (!settings.accountEmail) return { error: 'Sign in first.' }
      try {
        const result = await runTailorCv(settings, profile, msg.jobText)
        const base64 = renderResumePdf(profile, result.resume, msg.templateId)
        const safe = result.resume.label.replace(/[^\w\- ]/g, '').replace(/\s+/g, '-').slice(0, 40)
        const entry: ResumeVariant = {
          id: uid(),
          label: [result.resume.label, result.job.company].filter(Boolean).join(' — '),
          fileName: `${profile.identity.firstName}-${profile.identity.lastName}-${safe}.pdf`.replace(/\s+/g, '-'),
          tags: [result.job.role, result.job.company].filter(Boolean),
          isDefault: false,
          createdAt: Date.now(),
          source: 'generated',
          templateId: msg.templateId,
          dataBase64: base64,
          content: result.resume,
        }
        await store.update('resumes', (list) => [...list, entry])
        return { id: entry.id, label: entry.label }
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Tailoring failed.' }
      }
    }

    case 'saveAnswer': {
      const norm = normalizeQuestion(msg.questionRaw)
      await store.update('answerBank', (bank) => {
        const existing = bank.find((a) => a.questionNorm === norm || similarity(a.questionNorm, norm) >= 0.92)
        if (existing) {
          if (existing.answer !== msg.answer) existing.polished = undefined // stale polish dies with the old answer
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
      // Free-text answers get an AI polish in the background (fire and forget).
      if (msg.answerType === 'text') void polishInBackground(norm, msg.questionRaw, msg.answer)
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

    case 'fillAssist': {
      const settings = await store.get('settings')
      if (!settings.accountEmail || msg.fields.length + msg.verify.length === 0) {
        return { results: [], corrections: [] }
      }
      try {
        return await cloudFillAssist(settings, msg.fields, msg.verify)
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) }
      }
    }

    case 'addPhrasing': {
      // The AI recognized a field as a rephrasing of a known answer — record
      // the phrasing so the free deterministic matcher hits it next time.
      const norm = normalizeQuestion(msg.savedQuestion)
      await store.update('answerBank', (bank) =>
        bank.map((a) =>
          (a.questionNorm === norm || a.questionRaw.includes(msg.savedQuestion)) &&
          !a.questionRaw.includes(msg.phrasing)
            ? { ...a, questionRaw: [...a.questionRaw, msg.phrasing] }
            : a,
        ),
      )
      return { ok: true }
    }
  }
}

/**
 * Rewrite a just-saved answer into a clean sentence via the cloud (mini model,
 * free). Only stores the polish if the raw answer hasn't changed meanwhile;
 * options/booleans are never polished (their value must match the form).
 */
// Best-effort ISO codes for languages a CV plausibly lists by name.
const LANG_CODES: Record<string, string> = {
  english: 'en', dutch: 'nl', german: 'de', french: 'fr', spanish: 'es', italian: 'it',
  portuguese: 'pt', polish: 'pl', urdu: 'ur', hindi: 'hi', arabic: 'ar', chinese: 'zh',
  mandarin: 'zh', japanese: 'ja', korean: 'ko', russian: 'ru', turkish: 'tr', punjabi: 'pa',
}
const PROFICIENCIES = ['elementary', 'limited_working', 'professional_working', 'full_professional', 'native']

/**
 * Uploaded-CV intake: ask the cloud what roles the CV targets (tags) and what
 * facts it holds that the profile lacks. Merging is strictly additive — the
 * profile is never overwritten, only filled in. Fire and forget.
 */
async function intakeResume(resumeId: string): Promise<void> {
  const [settings, resumes] = await Promise.all([store.get('settings'), store.get('resumes')])
  if (!settings.accountEmail) return
  const r = resumes.find((x) => x.id === resumeId)
  if (!r) return
  try {
    const facts = await cloudResumeIntake(settings, r.dataBase64)
    if (facts.tags.length) {
      await store.update('resumes', (list) =>
        list.map((x) => (x.id === resumeId && x.tags.length === 0 ? { ...x, tags: facts.tags } : x)),
      )
    }
    await store.update('profile', (p) => {
      const has = (list: { name: string }[], name: string) =>
        list.some((x) => x.name.toLowerCase() === name.toLowerCase())
      return {
        ...p,
        skills: [
          ...p.skills,
          ...facts.newSkills.filter((n) => n.trim() && !has(p.skills, n)).map((name) => ({ name: name.trim() })),
        ],
        links: {
          ...p.links,
          website: p.links.website || facts.newLinks.website || undefined,
          github: p.links.github || facts.newLinks.github || undefined,
          linkedin: p.links.linkedin || facts.newLinks.linkedin || undefined,
          portfolio: p.links.portfolio || facts.newLinks.portfolio || undefined,
        },
        languages: [
          ...p.languages,
          ...facts.newLanguages
            .filter((l) => l.name.trim() && !has(p.languages, l.name))
            .map((l) => ({
              langCode: LANG_CODES[l.name.trim().toLowerCase()] ?? '',
              name: l.name.trim(),
              proficiency: (PROFICIENCIES.includes(l.proficiency ?? '')
                ? l.proficiency
                : 'professional_working') as Profile['languages'][number]['proficiency'],
            })),
        ],
        certifications: [
          ...p.certifications,
          ...facts.newCertifications
            .filter((c) => c.name.trim() && !has(p.certifications, c.name))
            .map((c) => ({ name: c.name.trim(), issuingOrganization: c.issuingOrganization, year: c.year })),
        ],
      }
    })
  } catch (e) {
    console.warn('[shortlisted] resume intake failed:', e)
  }
}

async function polishInBackground(questionNorm: string, questionRaw: string, answer: string): Promise<void> {
  try {
    const settings = await store.get('settings')
    if (!settings.accountEmail) return
    const bank = await store.get('answerBank')
    // Same match rule as saveAnswer (exact or fuzzy) — the entry's own norm
    // may differ from this phrasing's.
    const entry = bank.find((a) => a.questionNorm === questionNorm || similarity(a.questionNorm, questionNorm) >= 0.92)
    if (!entry || entry.answer !== answer || entry.polished) return
    const polished = await polishAnswer(settings, questionRaw, answer)
    if (!polished) return
    await store.update('answerBank', (b) =>
      b.map((a) => (a.id === entry.id && a.answer === answer ? { ...a, polished } : a)),
    )
  } catch (e) {
    console.error('[shortlisted] polish failed (answer kept as written):', e)
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
