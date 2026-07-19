// Field discovery + native value setting. Framework-agnostic: works on plain
// forms and React/Vue-controlled inputs (Greenhouse, Ashby, Workable are SPAs).

import { comboboxContainer, comboboxLabel, comboboxOptionsSync, isCombobox } from './combobox'

export type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export interface FormField {
  el: Fillable
  kind:
    | 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select'
    | 'file' | 'checkbox' | 'radio' | 'date'
    // A dropdown built out of divs — react-select, MUI, Vuetify and the rest.
    // Behaves like 'select' to the user and to us; see content/combobox.ts.
    | 'combobox'
  label: string
  required: boolean
  radioGroup?: HTMLInputElement[] // all radios sharing this name
}

const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'password', 'search'])

// Secrets we refuse to touch. Chrome gives an extension with host access the
// same reach over a password box as over any other input — nothing in the
// browser stops us reading one. So the line has to be drawn here, and drawn at
// COLLECTION: a field that never enters the field list can't be filled, can't
// be written to the answer bank, can't be mirrored to the account, and can't
// be sent to the model, no matter what any later code does.
//
// This deliberately costs us a little filling. Some applications really do ask
// for a national ID or bank details for payroll; the user types those in
// themselves. Holding someone's passport number is not worth saving them a
// keystroke.
const SENSITIVE_AUTOCOMPLETE = /^(cc-|new-password|current-password|one-time-code)/
// Anchored at BOTH ends. Label text arrives as concatenated DOM nodes, so a
// short token matching mid-word is not hypothetical: Lever's resume input
// reads "Resume/CV" + "Couldn't auto-read resume", which runs together as
// "CVCouldn't" and matched a trailing-unanchored /cvc/. That silently dropped
// the CV field and the attach step did nothing.
// Every entry must be a term that is ONLY ever a secret. Bare "pin" and "nino"
// were dropped for being ordinary words first ("pin your top achievement", and
// a given name) — a real PIN field is type=password anyway, and NI numbers are
// already covered by the spelled-out phrase.
const SENSITIVE_LABEL =
  /\b(?:password|passcode|cvv|cvc|iban|ssn|pin\s*(?:code|number)|card\s*number|credit\s*card|debit\s*card|security\s*code|sort\s*code|routing\s*number|account\s*number|social\s*security|passport\s*number|national\s*insurance|tax\s*id|verification\s*code|one[\s-]?time\s*code)\b/i

/**
 * True for anything that looks like a credential, a payment detail or a
 * government identifier. Checked against the field's own attributes AND its
 * visible label, because plenty of forms carry no useful attributes at all.
 */
export function isSensitiveField(el: Fillable): boolean {
  const autocomplete = (el.getAttribute('autocomplete') ?? '').toLowerCase()
  if (SENSITIVE_AUTOCOMPLETE.test(autocomplete)) return true
  if ((el as HTMLInputElement).type === 'password') return true
  // A file input is never a password, card or ID field — those are typed, not
  // uploaded. Exempting it keeps the CV attach, the single most valuable thing
  // we do, out of reach of a label-text false positive entirely.
  if ((el as HTMLInputElement).type === 'file') return false
  return SENSITIVE_LABEL.test(`${el.name} ${el.id} ${labelFor(el)}`)
}

export function labelFor(el: Fillable): string {
  const texts: string[] = []
  const push = (t: string | null | undefined) => {
    const clean = (t ?? '').replace(/\s+/g, ' ').trim()
    if (clean) texts.push(clean)
  }

  if (el.id) {
    const lab = el.ownerDocument.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    push(lab?.textContent)
  }
  const aria = el.getAttribute('aria-label')
  push(aria)
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) {
      push(el.ownerDocument.getElementById(id)?.textContent)
    }
  }
  if (texts.length === 0) {
    const wrapping = el.closest('label')
    if (wrapping) {
      const clone = wrapping.cloneNode(true) as HTMLElement
      clone.querySelectorAll('input,textarea,select').forEach((n) => n.remove())
      push(clone.textContent)
    }
  }
  if (texts.length === 0) {
    // Walk up a few levels looking for a label/legend/heading sibling above the input.
    let node: HTMLElement | null = el.parentElement
    for (let depth = 0; node && depth < 4 && texts.length === 0; depth++, node = node.parentElement) {
      const cand = node.querySelector(':scope > label, :scope > legend, :scope > .label, :scope > span, :scope > div > label')
      if (cand && !cand.contains(el)) push(cand.textContent)
    }
  }
  if (texts.length === 0) {
    // Nearest preceding text block: at each ancestor level, scan the previous
    // siblings of the branch we came up through for an element with real text
    // and no form controls. This is how most ATS custom questions are built —
    // e.g. Lever's <div class="application-label">Question?</div> right above
    // the input's wrapper.
    let child: HTMLElement | null = el
    for (let depth = 0; child && depth < 4 && texts.length === 0; depth++) {
      let sib = child.previousElementSibling as HTMLElement | null
      while (sib && texts.length === 0) {
        if (!sib.querySelector('input,textarea,select')) {
          const t = sib.textContent?.replace(/\s+/g, ' ').trim() ?? ''
          if (t.length > 2 && t.length < 400) push(t)
        }
        sib = sib.previousElementSibling as HTMLElement | null
      }
      child = child.parentElement
    }
  }
  if (texts.length === 0) push((el as HTMLInputElement).placeholder)
  if (texts.length === 0) push(el.getAttribute('name')?.replace(/[_\-\[\]]/g, ' '))

  return (texts[0] ?? '').slice(0, 300)
}

const PLACEHOLDER_OPTION = /^(select|choose|please select|pick one|--)/i

/** The real answer choices of a select/radio field; undefined for free-text fields. */
export function optionsOf(f: FormField): string[] | undefined {
  // A custom dropdown can only list its options by opening the popup and
  // waiting a frame for the component to render it, which this synchronous
  // call cannot do. Answer only when a backing <select> makes it free;
  // otherwise the panel falls through to "pick it on the page", and the form
  // watcher records whatever the user chooses.
  if (f.kind === 'combobox') return comboboxOptionsSync(f.el)
  if (f.el instanceof HTMLSelectElement) {
    return Array.from(f.el.options)
      .filter((o) => o.value !== '' && !PLACEHOLDER_OPTION.test(o.textContent?.trim() ?? ''))
      .map((o) => o.textContent?.trim() ?? '')
      .filter(Boolean)
      .slice(0, 80)
  }
  if (f.radioGroup) {
    return f.radioGroup.map((r) => labelFor(r) || r.value).filter(Boolean).slice(0, 80)
  }
  return undefined
}

export function collectFields(root: ParentNode): FormField[] {
  const els = Array.from(root.querySelectorAll<Fillable>('input, textarea, select'))
  const fields: FormField[] = []
  const seenRadioNames = new Set<string>()
  // One custom dropdown renders several controls — react-select pairs a
  // visible combobox input with a hidden <select>, and Select2 keeps the
  // original <select> alongside its own. Collecting each of them turns one
  // question into two or three identical rows in the panel, which is what the
  // duplicated "Pronouns" entries were.
  const claimed = new Set<Element>()

  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) continue
    if (isSensitiveField(el)) continue
    if (el.disabled) continue
    if (claimed.has(el)) continue

    if (isCombobox(el)) {
      const box = comboboxContainer(el)
      if (claimed.has(box)) continue
      claimed.add(box)
      // Everything else inside this widget belongs to it, not to the form.
      for (const inner of box.querySelectorAll('input, textarea, select')) claimed.add(inner)
      fields.push({
        el,
        kind: 'combobox',
        label: comboboxLabel(el) || labelFor(el),
        required: el.getAttribute('aria-required') === 'true' || el.required || /\*\s*$/.test(labelFor(el)),
      })
      continue
    }

    // Readonly is normally a display-only field, but it comes AFTER the
    // combobox check: Vuetify and Element Plus make their dropdown input
    // readonly on purpose.
    if ((el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) && el.readOnly) continue
    const style = el.ownerDocument.defaultView?.getComputedStyle(el)
    const hidden = style && (style.display === 'none' || style.visibility === 'hidden')
    // Keep hidden file inputs (ATSes hide them behind styled buttons); skip other hidden inputs.
    if (hidden && !(el instanceof HTMLInputElement && el.type === 'file')) continue

    const required =
      el.required || el.getAttribute('aria-required') === 'true' || /\*\s*$/.test(labelFor(el))

    if (el instanceof HTMLInputElement && el.type === 'radio') {
      const name = el.name
      if (!name || seenRadioNames.has(name)) continue
      seenRadioNames.add(name)
      const group = Array.from(
        root.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${CSS.escape(name)}"]`),
      )
      // Label of a radio group = the question, not the option: look above the group.
      const groupLabel = groupQuestionLabel(el) || labelFor(el)
      fields.push({ el, kind: 'radio', label: groupLabel, required, radioGroup: group })
      continue
    }

    const kind: FormField['kind'] =
      el instanceof HTMLTextAreaElement
        ? 'textarea'
        : el instanceof HTMLSelectElement
          ? 'select'
          : el.type === 'file'
            ? 'file'
            : el.type === 'checkbox'
              ? 'checkbox'
              : el.type === 'email'
                ? 'email'
                : el.type === 'tel'
                  ? 'tel'
                  : el.type === 'url'
                    ? 'url'
                    : el.type === 'number'
                      ? 'number'
                      : el.type === 'date'
                        ? 'date'
                        : 'text'

    fields.push({ el, kind, label: labelFor(el), required })
  }
  return fields
}

function groupQuestionLabel(radio: HTMLInputElement): string {
  let node: HTMLElement | null = radio.parentElement
  for (let depth = 0; node && depth < 6; depth++, node = node.parentElement) {
    const legend = node.querySelector(':scope > legend, :scope > .label, :scope > label:first-child, :scope > div:first-child > label')
    if (legend && !legend.querySelector('input')) {
      const t = legend.textContent?.replace(/\s+/g, ' ').trim()
      if (t && t.length > 3) return t.slice(0, 300)
    }
  }
  return ''
}

/**
 * Pulse a brand-colored outline on a field so the user can see exactly which
 * element the panel is talking about. Inline styles with !important so host
 * page CSS can't suppress it; restores the element's style afterwards.
 */
export function flashField(el: HTMLElement): void {
  const isTiny = el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')
  const target = isTiny ? ((el.closest('fieldset, li, div') as HTMLElement) ?? el) : el
  const prev = target.getAttribute('style')
  target.style.setProperty('outline', '3px solid #3d11ff', 'important')
  target.style.setProperty('outline-offset', '3px', 'important')
  target.style.setProperty('border-radius', '6px', 'important')
  target.style.setProperty('transition', 'outline-color 0.5s ease', 'important')
  window.setTimeout(() => target.style.setProperty('outline-color', 'transparent', 'important'), 1600)
  window.setTimeout(() => {
    if (prev) target.setAttribute('style', prev)
    else target.removeAttribute('style')
  }, 2200)
}

// React instruments the value property per-node and swallows updates whose
// value matches its tracker — resetting the tracker forces it to see ours.
type Tracked = { _valueTracker?: { setValue(v: string): void } }

// Set a value the way a user would: real focus, a keystroke lifecycle with a
// proper InputEvent, real blur. Validation layers variously watch keyup,
// beforeinput/input, change, or blur — feed them all so the value registers
// no matter which one the form listens to.
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const keyInit = { bubbles: true, cancelable: true, key: value.slice(-1) || 'a' }
  el.focus({ preventScroll: true })
  el.dispatchEvent(new KeyboardEvent('keydown', keyInit))
  setter?.call(el, value)
  ;(el as unknown as Tracked)._valueTracker?.setValue('')
  el.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: value }))
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
  el.dispatchEvent(new KeyboardEvent('keyup', keyInit))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
}

export function setSelectValue(el: HTMLSelectElement, wanted: string): boolean {
  const target = wanted.toLowerCase().trim()
  let chosen: HTMLOptionElement | null = null
  for (const opt of Array.from(el.options)) {
    const text = opt.textContent?.toLowerCase().trim() ?? ''
    const val = opt.value.toLowerCase().trim()
    if (text === target || val === target) {
      chosen = opt
      break
    }
    if (!chosen && text && (text.includes(target) || target.includes(text))) chosen = opt
  }
  if (!chosen) return false
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set
  el.focus({ preventScroll: true })
  setter?.call(el, chosen.value)
  ;(el as unknown as Tracked)._valueTracker?.setValue('')
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.blur()
  return true
}

export function setRadioValue(group: HTMLInputElement[], wanted: string): boolean {
  const target = wanted.toLowerCase().trim()
  const yes = /^(yes|true|y)$/i.test(target)
  const no = /^(no|false|n)$/i.test(target)
  for (const radio of group) {
    const lab = labelFor(radio).toLowerCase().trim()
    const val = radio.value.toLowerCase().trim()
    const hit =
      lab === target ||
      val === target ||
      (yes && /^yes\b/.test(lab)) ||
      (no && /^no\b/.test(lab)) ||
      (!!lab && lab.includes(target))
    if (hit) {
      radio.click()
      radio.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    }
  }
  return false
}

export function attachFile(el: HTMLInputElement, bytes: Uint8Array, fileName: string): void {
  const file = new File([bytes as BlobPart], fileName, { type: 'application/pdf' })
  const dt = new DataTransfer()
  dt.items.add(file)
  el.files = dt.files
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}
