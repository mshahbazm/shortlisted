// Content script entry. Runs on known ATS pages automatically, and on any
// other page when injected on demand ("Fill this page" in the side panel).

import { FillState, Msg, sendMsg } from '../lib/messaging'
import { GENERIC_ADAPTER, detectAdapter } from './adapters'
import { attachResume, fieldContext, fillForm, watchSubmit, applyValue, FillResult } from './engine'
import { FormField } from './fields'
import { Overlay } from './overlay'

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
    boot(adapter.id === 'generic' ? GENERIC_ADAPTER : adapter)
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

function boot(adapter: ReturnType<typeof detectAdapter> & {}) {
  let state: FillState | null = null
  let lastResult: FillResult | null = null
  let attachedLabel: string | null = null

  const overlay = new Overlay(adapter.name, {
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
    },

    onAnswer: (field: FormField, answer: string) => {
      applyValue(field, answer)
      void sendMsg({
        type: 'saveAnswer',
        questionRaw: field.label,
        answer,
        answerType: field.kind === 'select' ? 'select' : field.kind === 'radio' ? 'boolean' : 'text',
        jobUrl: location.href,
      })
      void sendMsg({ type: 'resolvePending', questionRaw: field.label })
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
        overlay.renderFitResult(null, res?.error ?? 'Scoring failed — try again.')
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
