// On-page panel: fill button, results, inline answering of unknown questions.
// Rendered in a shadow root so host-page CSS can't touch it.

import { FormField } from './fields'
import { FillResult } from './engine'

export interface OverlayCallbacks {
  onFill: () => void
  onAnswer: (field: FormField, answer: string) => void
  onPickResume: (resumeId: string) => void
  onScoreFit: () => void
}

export interface QuickFitDisplay {
  score: number
  verdict: string
  strengths: string[]
  gaps: string[]
}

const CSS = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, system-ui, sans-serif; }
  .panel {
    position: fixed; bottom: 18px; right: 18px; z-index: 2147483646;
    width: 320px; max-height: 70vh; overflow: auto;
    background: #ffffff; color: #1f1f1f; border: 1px solid #e7e7e4;
    border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.06);
    font-size: 13px; line-height: 1.5;
  }
  .head { display:flex; align-items:center; justify-content:space-between;
    padding: 10px 12px; border-bottom: 1px solid #e7e7e4; position: sticky; top: 0; background:#fff; z-index: 1; }
  .head b { font-size: 13px; font-weight: 650; }
  .head .min { cursor:pointer; border:none; background:none; color:#a1a1aa; font-size:15px; }
  .body { padding: 12px; }
  .fillBtn { width: 100%; padding: 9px 0; border: none; border-radius: 8px;
    background: #18181b; color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; }
  .fillBtn:hover { background:#333336; }
  .stat { margin: 12px 0 4px; color: #71717a; font-size: 12px; }
  .item { padding: 8px 9px; margin: 6px 0; border-radius: 8px; background: #fafaf9; border: 1px solid #e7e7e4; }
  .item.review { border-color: #f0d9a8; background: #fffdf5; }
  .item.unknown { border-color: #c7d8f9; background: #f8faff; }
  .q { color:#1f1f1f; margin-bottom: 5px; font-weight: 550; }
  .src { color:#a1a1aa; font-size: 11px; }
  textarea { width:100%; min-height: 52px; border-radius:6px; border:1px solid #e7e7e4;
    background:#fff; color:#1f1f1f; padding:6px 8px; font-size:12.5px; resize: vertical; }
  textarea:focus { outline: none; border-color: #18181b; }
  .save { margin-top:6px; padding: 5px 12px; border:none; border-radius:6px;
    background:#18181b; color:#fff; font-weight:600; cursor:pointer; font-size:12px; }
  .save:disabled { opacity: 0.5; }
  .resumeRow { display:flex; gap:6px; align-items:center; margin-top:6px; }
  select { flex:1; background:#fff; color:#1f1f1f; border:1px solid #e7e7e4; border-radius:6px; padding:5px; }
  .note { color:#71717a; font-size:11.5px; margin-top:10px; }
  .collapsed .body { display:none; }
  .scoreBtn { width: 100%; margin-top: 8px; padding: 8px 0; border: 1px solid #e7e7e4; border-radius: 8px;
    background: #fff; color: #1f1f1f; font-weight: 600; font-size: 12.5px; cursor: pointer; }
  .scoreBtn:hover { background: #f6f6f4; }
  .scoreBtn:disabled { opacity: 0.5; cursor: default; }
  .fitRow { display: flex; align-items: baseline; gap: 8px; margin-top: 10px; }
  .fitRow b { font-size: 22px; }
  .fitRow small { color: #71717a; }
  .fitVerdict { font-size: 12.5px; margin-top: 2px; }
  .fitMeta { color: #71717a; font-size: 11.5px; margin-top: 4px; }
`

export class Overlay {
  private host: HTMLDivElement
  private root: ShadowRoot
  private panel: HTMLDivElement
  private body: HTMLDivElement
  private cb: OverlayCallbacks

  constructor(atsName: string, cb: OverlayCallbacks) {
    this.cb = cb
    this.host = document.createElement('div')
    this.host.id = 'shortlisted-overlay-host'
    this.root = this.host.attachShadow({ mode: 'closed' })
    const style = document.createElement('style')
    style.textContent = CSS
    this.root.appendChild(style)

    this.panel = document.createElement('div')
    this.panel.className = 'panel'
    const head = document.createElement('div')
    head.className = 'head'
    const title = document.createElement('b')
    title.textContent = `Shortlisted · ${atsName}`
    const min = document.createElement('button')
    min.className = 'min'
    min.textContent = '—'
    min.onclick = () => this.panel.classList.toggle('collapsed')
    head.append(title, min)

    this.body = document.createElement('div')
    this.body.className = 'body'

    this.panel.append(head, this.body)
    this.root.appendChild(this.panel)
    document.documentElement.appendChild(this.host)
    this.renderIdle()
  }

  renderIdle() {
    this.body.replaceChildren()
    const btn = document.createElement('button')
    btn.className = 'fillBtn'
    btn.textContent = 'Fill this application'
    btn.onclick = () => this.cb.onFill()
    this.body.append(btn, this.scoreButton())
    const note = document.createElement('div')
    note.className = 'note'
    note.textContent = 'Fills what it knows, asks about the rest. You review everything and click submit yourself.'
    this.body.append(note)
  }

  private scoreButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'scoreBtn'
    btn.textContent = 'How do I score for this job?'
    btn.onclick = () => this.cb.onScoreFit()
    return btn
  }

  renderFitLoading() {
    this.fitBox()?.remove()
    const box = document.createElement('div')
    box.id = 'fitbox'
    box.className = 'fitMeta'
    box.textContent = 'Scoring your fit…'
    this.body.append(box)
  }

  renderFitResult(fit: QuickFitDisplay | null, error?: string) {
    this.fitBox()?.remove()
    const box = document.createElement('div')
    box.id = 'fitbox'
    if (!fit) {
      box.className = 'note'
      box.textContent = error ?? 'Scoring failed.'
      this.body.append(box)
      return
    }
    const row = document.createElement('div')
    row.className = 'fitRow'
    const score = document.createElement('b')
    score.textContent = String(fit.score)
    const denom = document.createElement('small')
    denom.textContent = '/10 fit'
    row.append(score, denom)
    const verdict = document.createElement('div')
    verdict.className = 'fitVerdict'
    verdict.textContent = fit.verdict
    box.append(row, verdict)
    if (fit.strengths.length) {
      const s = document.createElement('div')
      s.className = 'fitMeta'
      s.textContent = `Lead with: ${fit.strengths.join(' · ')}`
      box.append(s)
    }
    if (fit.gaps.length) {
      const g = document.createElement('div')
      g.className = 'fitMeta'
      g.textContent = `Gaps: ${fit.gaps.join(', ')}`
      box.append(g)
    }
    this.body.append(box)
  }

  private fitBox(): HTMLElement | null {
    return this.root.getElementById?.('fitbox') ?? this.body.querySelector('#fitbox')
  }

  renderResult(
    result: FillResult,
    resumes: { id: string; label: string; isDefault: boolean }[],
    attachedResumeLabel: string | null,
  ) {
    this.body.replaceChildren()

    const again = document.createElement('button')
    again.className = 'fillBtn'
    again.textContent = 'Fill again'
    again.onclick = () => this.cb.onFill()
    this.body.append(again, this.scoreButton())

    const stat = document.createElement('div')
    stat.className = 'stat'
    stat.textContent = `Filled ${result.filled.length} field${result.filled.length === 1 ? '' : 's'}.`
    this.body.append(stat)

    if (result.resumeFields.length > 0 && resumes.length > 0) {
      const wrap = document.createElement('div')
      wrap.className = 'item'
      const q = document.createElement('div')
      q.className = 'q'
      q.textContent = attachedResumeLabel ? `CV attached: ${attachedResumeLabel}` : 'Attach which CV?'
      const row = document.createElement('div')
      row.className = 'resumeRow'
      const sel = document.createElement('select')
      for (const r of resumes) {
        const opt = document.createElement('option')
        opt.value = r.id
        opt.textContent = r.label
        if (r.isDefault) opt.selected = true
        sel.appendChild(opt)
      }
      const attach = document.createElement('button')
      attach.className = 'save'
      attach.textContent = attachedResumeLabel ? 'Swap' : 'Attach'
      attach.onclick = () => this.cb.onPickResume(sel.value)
      row.append(sel, attach)
      wrap.append(q, row)
      this.body.append(wrap)
    }

    const fromBank = result.filled.filter((f) => f.source === 'bank-fuzzy')
    if (fromBank.length) {
      const h = document.createElement('div')
      h.className = 'stat'
      h.textContent = 'Filled from your answer bank — double-check these:'
      this.body.append(h)
      for (const f of fromBank) {
        const item = document.createElement('div')
        item.className = 'item review'
        const q = document.createElement('div')
        q.className = 'q'
        q.textContent = f.field.label
        const src = document.createElement('div')
        src.className = 'src'
        src.textContent = `Used a similar saved answer. Edit on the page if it doesn't fit.`
        item.append(q, src)
        item.onclick = () => f.field.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        this.body.append(item)
      }
    }

    if (result.unknown.length) {
      const h = document.createElement('div')
      h.className = 'stat'
      h.textContent = `New questions — answer once, reused forever:`
      this.body.append(h)
      for (const field of result.unknown) {
        this.body.append(this.unknownItem(field))
      }
    }

    if (result.skipped.length) {
      const note = document.createElement('div')
      note.className = 'note'
      note.textContent = `${result.skipped.length} demographic/survey question(s) left for you — those are yours to answer by hand.`
      this.body.append(note)
    }

    if (!result.unknown.length && !fromBank.length) {
      const note = document.createElement('div')
      note.className = 'note'
      note.textContent = 'Everything it knows is in. Review the page, then submit when ready.'
      this.body.append(note)
    }
  }

  private unknownItem(field: FormField): HTMLElement {
    const item = document.createElement('div')
    item.className = 'item unknown'
    const q = document.createElement('div')
    q.className = 'q'
    q.textContent = field.label
    q.style.cursor = 'pointer'
    q.onclick = () => field.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const ta = document.createElement('textarea')
    ta.placeholder = 'Your answer… (saved to your bank)'
    const save = document.createElement('button')
    save.className = 'save'
    save.textContent = 'Save & fill'
    save.onclick = () => {
      const answer = ta.value.trim()
      if (!answer) return
      this.cb.onAnswer(field, answer)
      item.style.opacity = '0.55'
      save.textContent = 'Saved ✓'
      save.disabled = true
    }
    item.append(q, ta, save)
    return item
  }

  setBusy() {
    this.body.replaceChildren()
    const note = document.createElement('div')
    note.className = 'note'
    note.textContent = 'Filling…'
    this.body.append(note)
  }
}
