// Content script entry. Runs on known ATS pages automatically, and on any
// other page when injected on demand ("Fill this page" in the side panel).

import { FillState, Msg, sendMsg } from '../lib/messaging'
import * as store from '../lib/store'
import { getContent, type tOverlayContent } from './i18n-bridge'
import { GENERIC_ADAPTER, detectAdapter } from './adapters'
import { attachResume, fieldContext, fillForm, watchSubmit, applyValue, FillResult } from './engine'
import { FormField, labelFor } from './fields'
import { Overlay } from './overlay'
import type { AssistField, AssistResultItem } from '../ai/capabilities/fill-assist'

declare global {
  interface Window {
    __shortlistedLoaded?: boolean
  }
}

if (!window.__shortlistedLoaded) {
  window.__shortlistedLoaded = true
  main()
}

function main() {
  const adapter = detectAdapter(location.href) ?? GENERIC_ADAPTER

  // In iframes (Greenhouse embeds), only run when a form actually exists.
  const inIframe = window !== window.top
  const hasForm = () => !!document.querySelector('form input, form textarea')

  const start = () => {
    if (inIframe && !hasForm()) return
    if (document.getElementById('shortlisted-overlay-host')) return
    void store.get('settings').then((s) => {
      if (document.getElementById('shortlisted-overlay-host')) return
      boot(adapter.id === 'generic' ? GENERIC_ADAPTER : adapter, getContent(s.locale), s.locale)
    })
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') start()
  else document.addEventListener('DOMContentLoaded', start)

  // SPA sites render the form late; watch for it.
  if (adapter.observe || adapter.id === 'generic') {
    const mo = new MutationObserver(() => {
      if (!document.getElementById('shortlisted-overlay-host') && hasForm()) start()
    })
    mo.observe(document.documentElement, { childList: true, subtree: true })
    setTimeout(() => mo.disconnect(), 60_000)
  }
}

function boot(adapter: ReturnType<typeof detectAdapter> & {}, t: tOverlayContent, uiLocale?: string) {
  let state: FillState | null = null
  let lastResult: FillResult | null = null
  let attachedLabel: string | null = null
  // Last answer saved per field — stops the form listeners from re-saving what
  // the panel just applied (applyValue fires the same change/blur events).
  const lastSaved = new WeakMap<FormField, string>()

  const answerType = (field: FormField) =>
    field.kind === 'select' ? ('select' as const) : field.kind === 'radio' ? ('boolean' as const) : ('text' as const)

  const saveAnswer = (field: FormField, answer: string) => {
    lastSaved.set(field, answer)
    void sendMsg({
      type: 'saveAnswer',
      questionRaw: field.label,
      answer,
      answerType: answerType(field),
      jobUrl: location.href,
    })
    void sendMsg({ type: 'resolvePending', questionRaw: field.label })
  }

  const readFieldValue = (field: FormField): string => {
    if (field.radioGroup) {
      const checked = field.radioGroup.find((r) => r.checked)
      return checked ? labelFor(checked) || checked.value : ''
    }
    const el = field.el
    if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked ? 'Yes' : ''
    if (el instanceof HTMLInputElement && el.type === 'file') return ''
    if (el instanceof HTMLSelectElement) {
      // A selected placeholder is not an answer ("Select...", "Choose one", empty value).
      if (!el.value) return ''
      const text = el.selectedOptions[0]?.textContent?.trim() || el.value
      return /^(select|choose|please select|pick one|--)/i.test(text) ? '' : text
    }
    return el.value.trim()
  }

  // If the user answers an open question directly in the form (instead of the
  // panel), remember it too — same bank, same one-time capture.
  const watchUnknownFields = (fields: FormField[]) => {
    for (const field of fields) {
      const capture = () => {
        const value = readFieldValue(field)
        if (!value || value === lastSaved.get(field)) return
        saveAnswer(field, value)
        overlay.markAnsweredFromForm(field, value)
      }
      for (const el of field.radioGroup ?? [field.el]) {
        el.addEventListener('change', capture)
        el.addEventListener('blur', capture)
      }
    }
  }

  const overlay = new Overlay(adapter.name, t, {
    onFill: async () => {
      overlay.setBusy()
      state = await sendMsg<FillState>({ type: 'getFillState' })
      lastResult = fillForm(adapter, state)

      // Report fresh unknowns to the pending queue (side panel badge).
      if (lastResult.unknown.length) {
        const msg: Msg = {
          type: 'capturePending',
          questions: lastResult.unknown.map((f) => ({
            questionRaw: f.label,
            fieldCtx: fieldContext(f, adapter.name),
            jobUrl: location.href,
          })),
        }
        void sendMsg(msg)
      }
      // Count reuse on bank hits.
      for (const f of lastResult.filled) {
        if (f.bankAnswerId) void sendMsg({ type: 'markAnswerUsed', answerId: f.bankAnswerId, jobUrl: location.href })
      }

      // Auto-attach the default CV if there's a resume field.
      attachedLabel = null
      const defaultResume = state.resumes.find((r) => r.isDefault) ?? state.resumes[0]
      if (defaultResume && lastResult.resumeFields.length) {
        const ok = await attachById(defaultResume.id)
        if (ok) attachedLabel = defaultResume.label
      }

      overlay.renderResult(lastResult, state.resumes, attachedLabel)
      watchUnknownFields(lastResult.unknown)
      void runFillAssist(lastResult.unknown)
    },

    onAnswer: (field: FormField, answer: string) => {
      saveAnswer(field, answer)
      applyValue(field, answer)
    },

    onPickResume: async (resumeId: string) => {
      const ok = await attachById(resumeId)
      if (ok && state && lastResult) {
        const r = state.resumes.find((x) => x.id === resumeId)
        attachedLabel = r?.label ?? null
        overlay.renderResult(lastResult, state.resumes, attachedLabel)
      }
    },

    onScoreFit: async () => {
      overlay.renderFitLoading()
      const res = await sendMsg<
        { fit?: { overallScore: number; verdict: string; strengths: string[]; gaps: string[] }; error?: string }
      >({ type: 'scoreFitPage', jobText: jobPageText(), jobUrl: location.href })
      if (res?.fit) {
        overlay.renderFitResult({
          score: res.fit.overallScore,
          verdict: res.fit.verdict,
          strengths: res.fit.strengths ?? [],
          gaps: res.fit.gaps ?? [],
        })
      } else {
        overlay.renderFitResult(null, res?.error ?? t.scoringFailedRetry)
      }
    },
  })

  async function attachById(resumeId: string): Promise<boolean> {
    if (!lastResult) return false
    const data = await sendMsg<{ base64: string; fileName: string } | null>({
      type: 'getResumeData',
      resumeId,
    })
    if (!data) return false
    let ok = false
    for (const f of lastResult.resumeFields) {
      if (attachResume(f, data.base64, data.fileName)) ok = true
    }
    return ok
  }

  // The reasoning layer: fields the deterministic pass couldn't answer go to
  // the server as one batched call (answered from the account's stored
  // profile + answer bank). AI values are applied but NOT banked — they land
  // in the panel for review; confirming or editing is what banks them.
  const runFillAssist = async (unknown: FormField[]) => {
    if (unknown.length === 0) return
    overlay.aiNote(t.aiWorking(unknown.length))
    const fields: AssistField[] = unknown.map((f, i) => ({
      id: i,
      question: f.label,
      kind: f.kind,
      required: f.required || undefined,
      options:
        f.el instanceof HTMLSelectElement
          ? Array.from(f.el.options).map((o) => o.textContent?.trim() ?? '').filter(Boolean).slice(0, 80)
          : f.radioGroup
            ? f.radioGroup.map((r) => labelFor(r) || r.value).filter(Boolean).slice(0, 80)
            : undefined,
    }))
    const res = await sendMsg<{ results?: AssistResultItem[]; error?: string }>({ type: 'fillAssist', fields })
    if (!res?.results) {
      overlay.aiNote('')
      return
    }
    let filled = 0
    for (const r of res.results) {
      if (r.value == null) continue
      const field = unknown[r.id]
      if (!field) continue
      lastSaved.set(field, r.value) // keep the form listeners from banking AI output
      if (applyValue(field, r.value)) {
        filled++
        overlay.markAiFilled(field, r.value)
        if (r.fromSavedQuestion) {
          void sendMsg({ type: 'addPhrasing', savedQuestion: r.fromSavedQuestion, phrasing: field.label })
        }
      }
    }
    overlay.aiNote(filled > 0 ? t.aiFilledNote(filled) : '')
  }

  // Flag jobs written in a language the profile doesn't list. Detection is
  // local (Chrome's built-in detector); English is assumed known — the whole
  // product operates in English-language job markets.
  void (async () => {
    try {
      const profile = (await store.get('profile')) as { languages: { langCode: string }[] }
      const known = profile.languages.map((l) => l.langCode.toLowerCase().slice(0, 2))
      if (known.length === 0) return
      const pageLang = await detectPageLanguage()
      if (!pageLang || pageLang === 'en' || known.includes(pageLang)) return
      const name =
        new Intl.DisplayNames([uiLocale ?? 'en'], { type: 'language' }).of(pageLang) ?? pageLang
      overlay.showLanguageNotice(t.languageNotice(name))
    } catch {
      // Detection is best-effort; no notice beats a wrong notice.
    }
  })()

  // Log the application when the user clicks the real submit button.
  watchSubmit(adapter, () => {
    void sendMsg({
      type: 'recordApplication',
      record: {
        jobUrl: location.href,
        company: guessCompany(),
        title: document.title.split(/[|\-–]/)[0]?.trim() ?? document.title,
        ats: adapter.name,
      },
    })
  })
}

/** Best-effort page language: the declared <html lang>, else Chrome's local detector. */
async function detectPageLanguage(): Promise<string | null> {
  const declared = document.documentElement.lang?.toLowerCase().slice(0, 2)
  if (declared) return declared
  const sample = jobPageText().slice(0, 3000)
  if (sample.length < 200 || !chrome.i18n?.detectLanguage) return null
  const res = await chrome.i18n.detectLanguage(sample)
  const top = res.languages?.[0]
  return top && top.percentage >= 60 ? top.language.toLowerCase().slice(0, 2) : null
}

// The job description for scoring: prefer the page's main content region,
// fall back to full body text. Forms/nav noise is tolerable — the model
// extracts requirements from prose.
function jobPageText(): string {
  const main =
    document.querySelector('main, article, [role=main], #content, .job-description, [class*="description" i]') ??
    document.body
  const clone = main.cloneNode(true) as HTMLElement
  clone.querySelectorAll('script, style, nav, header, footer, form, #shortlisted-overlay-host').forEach((n) => n.remove())
  const text = (clone.textContent ?? '').replace(/\s+/g, ' ').trim()
  const fallback = (document.body.textContent ?? '').replace(/\s+/g, ' ').trim()
  return (text.length > 300 ? text : fallback).slice(0, 16_000)
}

function guessCompany(): string {
  const host = location.hostname
  const path = location.pathname.split('/').filter(Boolean)
  if (host.includes('greenhouse.io') || host === 'jobs.lever.co' || host === 'jobs.ashbyhq.com')
    return path[0] ?? host
  if (host === 'apply.workable.com' || host === 'jobs.smartrecruiters.com') return path[0] ?? host
  return host.split('.')[0]
}
