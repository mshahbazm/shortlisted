import { FillState } from '../lib/messaging'
import { matchQuestion } from '../lib/questions'
import { Adapter, findFormRoot } from './adapters'
import {
  FormField,
  attachFile,
  collectFields,
  setNativeValue,
  setRadioValue,
  setSelectValue,
} from './fields'
import { COVER_LETTER_FILE_RE, DEMOGRAPHIC_RE, RESUME_FILE_RE, profileValueFor } from './profileMap'

export type FillSource = 'profile' | 'bank' | 'bank-fuzzy' | 'resume'

export interface FillResult {
  filled: { field: FormField; source: FillSource; value: string; bankAnswerId?: string }[]
  unknown: FormField[] // needs the user (captured to pending questions)
  resumeFields: FormField[] // file inputs wanting a CV
  skipped: FormField[] // demographic/consent fields we never auto-touch
}

export function fillForm(adapter: Adapter, state: FillState): FillResult {
  const root = findFormRoot(adapter)
  const fields = collectFields(root)
  const result: FillResult = { filled: [], unknown: [], resumeFields: [], skipped: [] }

  for (const field of fields) {
    const label = field.label

    if (field.kind === 'file') {
      if (COVER_LETTER_FILE_RE.test(label)) continue // never auto-attach cover letters
      if (RESUME_FILE_RE.test(label) || label === '') result.resumeFields.push(field)
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
    if (profileValue && applyValue(field, profileValue)) {
      result.filled.push({ field, source: 'profile', value: profileValue })
      continue
    }

    // 2) Answer bank (exact then fuzzy).
    const match = label.length > 4 ? matchQuestion(label, state.answerBank) : null
    if (match && applyValue(field, match.answer.answer)) {
      result.filled.push({
        field,
        source: match.exact ? 'bank' : 'bank-fuzzy',
        value: match.answer.answer,
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

  return result
}

function alreadyFilled(field: FormField): boolean {
  if (field.kind === 'radio') return field.radioGroup?.some((r) => r.checked) ?? false
  if (field.kind === 'checkbox') return (field.el as HTMLInputElement).checked
  if (field.kind === 'select') {
    const sel = field.el as HTMLSelectElement
    return sel.selectedIndex > 0 && sel.value !== ''
  }
  return (field.el as HTMLInputElement | HTMLTextAreaElement).value.trim() !== ''
}

export function applyValue(field: FormField, value: string): boolean {
  try {
    switch (field.kind) {
      case 'select':
        return setSelectValue(field.el as HTMLSelectElement, value)
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
