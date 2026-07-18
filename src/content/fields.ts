// Field discovery + native value setting. Framework-agnostic: works on plain
// forms and React/Vue-controlled inputs (Greenhouse, Ashby, Workable are SPAs).

export type Fillable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

export interface FormField {
  el: Fillable
  kind: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select' | 'file' | 'checkbox' | 'radio' | 'date'
  label: string
  required: boolean
  radioGroup?: HTMLInputElement[] // all radios sharing this name
}

const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'image', 'password', 'search'])

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
  if (texts.length === 0) push((el as HTMLInputElement).placeholder)
  if (texts.length === 0) push(el.getAttribute('name')?.replace(/[_\-\[\]]/g, ' '))

  return (texts[0] ?? '').slice(0, 300)
}

export function collectFields(root: ParentNode): FormField[] {
  const els = Array.from(root.querySelectorAll<Fillable>('input, textarea, select'))
  const fields: FormField[] = []
  const seenRadioNames = new Set<string>()

  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) continue
    if (el.disabled) continue
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

// Set a value the way a user would, so React/Vue state updates too.
export function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
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
  setter?.call(el, chosen.value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
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
