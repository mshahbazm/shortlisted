// On-page panel: fill button, results, inline answering of unknown questions.
// Rendered in a shadow root so host-page CSS can't touch it.

import { FormField, flashField, optionsOf } from './fields'
import { FillResult } from './engine'
import { FIT_COLORS, FitBand, fitBand, fitPercent } from '../lib/fitBands'
import type { tMerged } from '../i18n/content'

export type tOverlayContent = tMerged<'overlay'>

export interface OverlayCallbacks {
  onFill: () => void
  onAnswer: (field: FormField, answer: string) => void
  onPickResume: (resumeId: string) => void
  onUploadResume: (file: File) => void
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
    width: 320px; max-height: 70vh; display: flex; flex-direction: column; overflow: hidden;
    background: #ffffff; color: #1f1f1f; border: 1px solid #e7e7e4;
    border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.06);
    font-size: 13px; line-height: 1.5;
  }
  .head { display:flex; align-items:center; justify-content:space-between; flex: none;
    padding: 10px 12px; border-bottom: 1px solid #e7e7e4; background:#fff; }
  .head b { font-size: 13px; font-weight: 650; }
  .head .min { cursor:pointer; border:none; background:none; color:#a1a1aa; font-size:15px; }
  .actions { flex: none; padding: 12px; border-bottom: 1px solid #e7e7e4; }
  .actions:empty { display: none; }
  .body { padding: 12px; overflow-y: auto; min-height: 0; }
  .body > :first-child { margin-top: 0; }
  .fillBtn { width: 100%; padding: 9px 0; border: none; border-radius: 8px;
    background: #18181b; color: #fff; font-weight: 600; font-size: 13px; cursor: pointer; }
  .fillBtn:hover { background:#333336; }
  .stat { margin: 12px 0 4px; color: #71717a; font-size: 12px; }
  .item { padding: 8px 9px; margin: 6px 0; border-radius: 8px; background: #fafaf9; border: 1px solid #e7e7e4; }
  .item.review { border-color: #f0d9a8; background: #fffdf5; }
  .item.unknown { border-color: #d6ccff; background: #f7f5ff; }
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
  .item select { width:100%; font-size:12.5px; padding:6px 8px; }
  .item select:focus { outline:none; border-color:#18181b; }
  .note { color:#71717a; font-size:11.5px; margin-top:10px; }
  .collapsed .body, .collapsed .actions, .collapsed .langnote { display:none; }
  .scoreBtn { width: 100%; margin-top: 8px; padding: 8px 0; border: 1px solid #e7e7e4; border-radius: 8px;
    background: #fff; color: #1f1f1f; font-weight: 600; font-size: 12.5px; cursor: pointer; }
  .scoreBtn:hover { background: #f6f6f4; }
  .scoreBtn:disabled { opacity: 0.5; cursor: default; }
  .fitScore { border-radius: 10px; padding: 12px 14px; border: 1px solid; }
  .fitScore .row1 { display: flex; align-items: baseline; gap: 8px; margin-bottom: 6px; }
  .fitScore .pct { font-size: 24px; font-weight: 750; letter-spacing: -0.02em; }
  .fitScore .word {
    margin-left: auto; font-size: 11px; font-weight: 700;
    letter-spacing: 0.05em; text-transform: uppercase;
  }
  .fitVerdict { font-size: 12.5px; line-height: 1.5; }
  .fitSection { margin-top: 12px; }
  .fitH {
    font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em;
    text-transform: uppercase; color: #a1a1aa; margin-bottom: 5px;
  }
  .fitLi { display: flex; gap: 7px; font-size: 12px; line-height: 1.45; margin: 4px 0; color: #3f3f46; }
  .fitLi .ic { flex: none; font-weight: 700; }
  .langnote {
    display: none; padding: 8px 12px; font-size: 12px; line-height: 1.45;
    background: #fffdf5; border-bottom: 1px solid #f0d9a8; color: #7c5a10;
  }
  .langnote.on { display: block; }
  .scoring { text-align: center; padding: 22px 0 16px; }
  .scoring .label { font-weight: 600; font-size: 13.5px; }
  .spinner {
    width: 24px; height: 24px; margin: 0 auto 12px; border-radius: 50%;
    border: 3px solid #e7e7e4; border-top-color: #3d11ff;
    animation: sl-spin 0.7s linear infinite;
  }
  @keyframes sl-spin { to { transform: rotate(360deg); } }
`

export class Overlay {
  private host: HTMLDivElement
  private root: ShadowRoot
  private panel: HTMLDivElement
  private actions: HTMLDivElement
  private body: HTMLDivElement
  private cb: OverlayCallbacks
  private t: tOverlayContent
  private langNote!: HTMLDivElement
  private unknownRefs = new Map<
    FormField,
    { item: HTMLElement; input: HTMLTextAreaElement | HTMLSelectElement; save: HTMLButtonElement }
  >()

  constructor(t: tOverlayContent, cb: OverlayCallbacks) {
    this.cb = cb
    this.t = t
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
    title.textContent = 'Shortlisted'
    const min = document.createElement('button')
    min.className = 'min'
    min.textContent = '—'
    min.onclick = () => this.panel.classList.toggle('collapsed')
    head.append(title, min)

    this.actions = document.createElement('div')
    this.actions.className = 'actions'

    this.body = document.createElement('div')
    this.body.className = 'body'

    this.langNote = document.createElement('div')
    this.langNote.className = 'langnote'

    this.panel.append(head, this.langNote, this.actions, this.body)
    this.root.appendChild(this.panel)
    document.documentElement.appendChild(this.host)
    this.renderIdle()
  }

  renderIdle() {
    this.actions.replaceChildren()
    this.body.replaceChildren()
    const btn = document.createElement('button')
    btn.className = 'fillBtn'
    btn.textContent = this.t.fillApplication
    btn.onclick = () => this.cb.onFill()
    this.actions.append(btn, this.scoreButton())
    const note = document.createElement('div')
    note.className = 'note'
    note.textContent = this.t.idleNote
    this.body.append(note)
  }

  private scoreButton(): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'scoreBtn'
    btn.textContent = this.t.howDoIScore
    btn.onclick = () => this.cb.onScoreFit()
    return btn
  }

  // Scoring takes over the whole panel: one spinner, one label — the buttons
  // come back with the result.
  renderFitLoading() {
    this.actions.replaceChildren()
    this.body.replaceChildren()
    const wrap = document.createElement('div')
    wrap.className = 'scoring'
    const spin = document.createElement('div')
    spin.className = 'spinner'
    const label = document.createElement('div')
    label.className = 'label'
    label.textContent = this.t.scoringFit
    wrap.append(spin, label)
    this.body.append(wrap)
  }

  renderFitResult(fit: QuickFitDisplay | null, error?: string) {
    // Rebuild the panel: the pinned action bar on top, the score (or the
    // error) scrolling beneath it.
    this.actions.replaceChildren()
    this.body.replaceChildren()
    const fill = document.createElement('button')
    fill.className = 'fillBtn'
    fill.textContent = this.t.fillApplication
    fill.onclick = () => this.cb.onFill()
    this.actions.append(fill)

    const box = document.createElement('div')
    box.id = 'fitbox'
    if (!fit) {
      this.actions.append(this.scoreButton())
      box.className = 'note'
      box.textContent = error ?? this.t.scoringFailed
      this.body.append(box)
      return
    }
    // Percentage + band word in a light traffic-light box, verdict beneath.
    const band = fitBand(fit.score)
    const colors = FIT_COLORS[band]
    const words: Record<FitBand, string> = {
      longShot: this.t.fitLongShot,
      borderline: this.t.fitBorderline,
      worthAShot: this.t.fitWorthAShot,
      goodFit: this.t.fitGoodFit,
      strongFit: this.t.fitStrongFit,
    }
    const score = document.createElement('div')
    score.className = 'fitScore'
    score.style.background = colors.bg
    score.style.borderColor = colors.border
    const row1 = document.createElement('div')
    row1.className = 'row1'
    const pct = document.createElement('span')
    pct.className = 'pct'
    pct.style.color = colors.fg
    pct.textContent = fitPercent(fit.score)
    const word = document.createElement('span')
    word.className = 'word'
    word.style.color = colors.fg
    word.textContent = words[band]
    row1.append(pct, word)
    const verdict = document.createElement('div')
    verdict.className = 'fitVerdict'
    verdict.textContent = fit.verdict
    score.append(row1, verdict)
    box.append(score)

    box.append(
      this.fitList(this.t.leadWithHeader, fit.strengths, '✓', '#16a34a'),
      this.fitList(this.t.gapsHeader, fit.gaps, '–', '#b45309'),
    )
    this.body.append(box)
  }

  private fitList(header: string, items: string[], icon: string, color: string): HTMLElement {
    const section = document.createElement('div')
    if (!items.length) return section
    section.className = 'fitSection'
    const h = document.createElement('div')
    h.className = 'fitH'
    h.textContent = header
    section.append(h)
    for (const item of items) {
      const li = document.createElement('div')
      li.className = 'fitLi'
      const ic = document.createElement('span')
      ic.className = 'ic'
      ic.textContent = icon
      ic.style.color = color
      const txt = document.createElement('span')
      txt.textContent = item
      li.append(ic, txt)
      section.append(li)
    }
    return section
  }

  private fitBox(): HTMLElement | null {
    return this.root.getElementById?.('fitbox') ?? this.body.querySelector('#fitbox')
  }

  renderResult(
    result: FillResult,
    resumes: { id: string; label: string; isDefault: boolean }[],
    attachedResumeLabel: string | null,
  ) {
    this.actions.replaceChildren()
    this.body.replaceChildren()
    this.unknownRefs.clear()

    const again = document.createElement('button')
    again.className = 'fillBtn'
    again.textContent = this.t.fillAgain
    again.onclick = () => this.cb.onFill()
    this.actions.append(again, this.scoreButton())

    const stat = document.createElement('div')
    stat.className = 'stat'
    stat.textContent = this.t.filledFields(result.filled.length)
    this.body.append(stat)

    // The form wants a CV but none is saved: ask for it right here, like any
    // other unanswered question. Upload saves it to the bank AND attaches it.
    if (result.resumeFields.length > 0 && resumes.length === 0) {
      const wrap = document.createElement('div')
      wrap.className = 'item review'
      const q = document.createElement('div')
      q.className = 'q'
      q.textContent = this.t.cvMissing
      const pick = document.createElement('button')
      pick.className = 'save'
      pick.textContent = this.t.uploadCv
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/pdf'
      input.style.display = 'none'
      pick.onclick = () => input.click()
      input.onchange = () => {
        const file = input.files?.[0]
        if (!file) return
        pick.disabled = true
        this.cb.onUploadResume(file)
      }
      wrap.append(q, pick, input)
      this.body.append(wrap)
    }

    if (result.resumeFields.length > 0 && resumes.length > 0) {
      const wrap = document.createElement('div')
      wrap.className = 'item'
      const q = document.createElement('div')
      q.className = 'q'
      q.textContent = attachedResumeLabel ? this.t.cvAttached(attachedResumeLabel) : this.t.attachWhichCv
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
      attach.textContent = attachedResumeLabel ? this.t.swap : this.t.attach
      attach.onclick = () => this.cb.onPickResume(sel.value)
      row.append(sel, attach)
      wrap.append(q, row)
      this.body.append(wrap)
    }

    const fromBank = result.filled.filter((f) => f.source === 'bank-fuzzy')
    if (fromBank.length) {
      const h = document.createElement('div')
      h.className = 'stat'
      h.textContent = this.t.fromBankHeader
      this.body.append(h)
      for (const f of fromBank) {
        const item = document.createElement('div')
        item.className = 'item review'
        const q = document.createElement('div')
        q.className = 'q'
        q.textContent = f.field.label
        const src = document.createElement('div')
        src.className = 'src'
        src.textContent = this.t.usedSimilarAnswer
        item.append(q, src)
        item.onclick = () => {
          f.field.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          flashField(f.field.el)
        }
        this.body.append(item)
      }
    }

    if (result.unknown.length) {
      const h = document.createElement('div')
      h.className = 'stat'
      h.textContent = this.t.newQuestionsHeader
      this.body.append(h)
      for (const field of result.unknown) {
        this.body.append(this.unknownItem(field))
      }
    }

    if (result.skipped.length) {
      const note = document.createElement('div')
      note.className = 'note'
      note.textContent = this.t.skippedDemographic(result.skipped.length)
      this.body.append(note)
    }

    if (!result.unknown.length && !fromBank.length) {
      const note = document.createElement('div')
      note.className = 'note'
      note.textContent = this.t.allDone
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
    q.onclick = () => {
      field.el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      flashField(field.el)
    }
    // Fields with fixed choices get the page's real options — free text could
    // never be applied to them. Everything else gets a textarea.
    const opts = optionsOf(field)
    let input: HTMLTextAreaElement | HTMLSelectElement
    if (opts && opts.length > 0) {
      const sel = document.createElement('select')
      const ph = document.createElement('option')
      ph.value = ''
      ph.textContent = this.t.pickOne
      ph.disabled = true
      ph.selected = true
      sel.append(ph)
      for (const o of opts) {
        const opt = document.createElement('option')
        opt.value = o
        opt.textContent = o
        sel.append(opt)
      }
      input = sel
    } else {
      const ta = document.createElement('textarea')
      ta.placeholder = this.t.answerPlaceholder
      input = ta
    }
    const save = document.createElement('button')
    save.className = 'save'
    save.textContent = this.t.saveAndFill
    save.onclick = () => {
      const answer = input.value.trim()
      if (!answer) return
      this.cb.onAnswer(field, answer)
      item.style.opacity = '0.55'
      save.textContent = this.t.saved
      save.disabled = true
    }
    item.append(q, input, save)
    this.unknownRefs.set(field, { item, input, save })
    return item
  }

  /** The user answered this question directly in the form — reflect it. */
  markAnsweredFromForm(field: FormField, value: string) {
    const r = this.unknownRefs.get(field)
    if (!r) return
    r.input.value = value
    r.item.style.opacity = '0.55'
    r.save.textContent = this.t.saved
    r.save.disabled = true
  }

  /** AI answered this field: show the value for review; Save banks it. */
  markAiFilled(field: FormField, value: string) {
    const r = this.unknownRefs.get(field)
    if (!r) return
    r.input.value = value
    r.item.style.borderColor = '#3d11ff'
    if (!r.item.querySelector('.ai-src')) {
      const note = document.createElement('div')
      note.className = 'src ai-src'
      note.textContent = this.t.aiFilled
      r.item.insertBefore(note, r.input)
    }
  }

  /** Transient status line for the assist pass; empty message hides it. */
  aiNote(message: string) {
    let n = this.body.querySelector('#ainote') as HTMLElement | null
    if (!message) {
      n?.remove()
      return
    }
    if (!n) {
      n = document.createElement('div')
      n.id = 'ainote'
      n.className = 'note'
      this.body.append(n)
    }
    n.textContent = message
  }

  /** Amber strip under the header: "this job is in a language you don't list". */
  showLanguageNotice(message: string) {
    this.langNote.textContent = message
    this.langNote.classList.add('on')
  }

  setBusy() {
    this.actions.replaceChildren()
    this.body.replaceChildren()
    const note = document.createElement('div')
    note.className = 'note'
    note.textContent = this.t.filling
    this.body.append(note)
  }
}
