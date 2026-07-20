import { FillState } from '../lib/messaging'
import { matchQuestion } from '../lib/questions'
import { Adapter, findFormRoot } from './adapters'
import { comboboxValue, selectComboboxOption } from './combobox'
import {
  FormField,
  attachFile,
  collectFields,
  fileFieldRole,
  setNativeValue,
  setRadioValue,
  setSelectValue,
} from './fields'
import { DEMOGRAPHIC_RE, profileValueFor } from './profileMap'

export type FillSource = 'profile' | 'bank' | 'bank-fuzzy' | 'resume'

export interface FillResult {
  filled: { field: FormField; source: FillSource; value: string; bankAnswerId?: string }[]
  unknown: FormField[] // needs the user (captured to pending questions)
  resumeFields: FormField[] // file inputs wanting a CV
  skipped: FormField[] // demographic/consent fields we never auto-touch
}

export async function fillForm(adapter: Adapter, state: FillState): Promise<FillResult> {
  const root = findFormRoot(adapter)
  const fields = collectFields(root)
  const result: FillResult = { filled: [], unknown: [], resumeFields: [], skipped: [] }
  // File inputs that name neither a CV nor a cover letter. A form with exactly
  // one file input and no wording at all is asking for a CV; a form with
  // several is ambiguous, and guessing there risks putting the CV in a slot
  // meant for something else.
  const unnamedFiles: FormField[] = []

  for (const field of fields) {
    const label = field.label

    if (field.kind === 'file') {
      const role = fileFieldRole(field.el as HTMLInputElement, label)
      if (role === 'cover-letter') continue // never auto-attach cover letters
      if (role === 'resume') result.resumeFields.push(field)
      else unnamedFiles.push(field)
      continue
    }

    if (DEMOGRAPHIC_RE.test(label)) {
      // EEO/demographic surveys: the user answers these by hand, once per form.
      result.skipped.push(field)
      continue
    }

    if (alreadyFilled(field)) continue

    // 1) Deterministic profile mapping.
    const profileValue = profileValueFor(label, state.profile)
    if (profileValue && (await applyValue(field, profileValue))) {
      result.filled.push({ field, source: 'profile', value: profileValue })
      continue
    }

    // 2) Answer bank (exact then fuzzy).
    const match = label.length > 4 ? matchQuestion(label, state.answerBank) : null
    if (match && (await applyValue(field, match.answer.polished ?? match.answer.answer))) {
      result.filled.push({
        field,
        source: match.exact ? 'bank' : 'bank-fuzzy',
        value: match.answer.polished ?? match.answer.answer,
        bankAnswerId: match.answer.id,
      })
      continue
    }

    // 3) Unknown -> the learning loop. Only capture real questions, not
    // unlabeled decorative inputs.
    if (label.length > 4 && field.kind !== 'checkbox') {
      result.unknown.push(field)
    }
  }

  if (result.resumeFields.length === 0 && unnamedFiles.length === 1) {
    result.resumeFields.push(unnamedFiles[0])
  }

  return result
}

function alreadyFilled(field: FormField): boolean {
  // Its .value is always "" — asking the element would say "empty" for a
  // dropdown the user has already answered, and we would offer to fill it
  // again and list it as an open question.
  if (field.kind === 'combobox') return comboboxValue(field.el) !== ''
  if (field.kind === 'radio') return field.radioGroup?.some((r) => r.checked) ?? false
  if (field.kind === 'checkbox') return (field.el as HTMLInputElement).checked
  if (field.kind === 'select') {
    const sel = field.el as HTMLSelectElement
    return sel.selectedIndex > 0 && sel.value !== ''
  }
  return (field.el as HTMLInputElement | HTMLTextAreaElement).value.trim() !== ''
}

export async function applyValue(field: FormField, value: string): Promise<boolean> {
  try {
    switch (field.kind) {
      case 'select':
        return setSelectValue(field.el as HTMLSelectElement, value)
      // Setting .value does nothing on these — the component owns its state,
      // so the option has to be clicked the way a person would.
      case 'combobox':
        return selectComboboxOption(field.el, value)
      case 'radio':
        return field.radioGroup ? setRadioValue(field.radioGroup, value) : false
      case 'checkbox': {
        const wantChecked = /^(yes|true|y|1)$/i.test(value.trim())
        const box = field.el as HTMLInputElement
        if (box.checked !== wantChecked) box.click()
        return true
      }
      case 'number': {
        const num = value.replace(/[^\d.]/g, '')
        if (!num) return false
        setNativeValue(field.el as HTMLInputElement, num)
        return true
      }
      default:
        setNativeValue(field.el as HTMLInputElement | HTMLTextAreaElement, value)
        return true
    }
  } catch {
    return false
  }
}

export function attachResume(field: FormField, base64: string, fileName: string): boolean {
  try {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    attachFile(field.el as HTMLInputElement, bytes, fileName)
    return true
  } catch {
    return false
  }
}

export function fieldContext(field: FormField, adapterName: string): string {
  return [field.kind, field.required ? 'required' : 'optional', adapterName].join(', ')
}

export function watchSubmit(adapter: Adapter, onSubmit: () => void): void {
  const handler = (ev: Event) => {
    const target = ev.target as HTMLElement | null
    if (!target) return
    const btn = target.closest(adapter.submitSelectors.join(','))
    if (btn) onSubmit()
  }
  document.addEventListener('click', handler, true)
}
