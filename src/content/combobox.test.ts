// The custom-dropdown families, by their real DOM shapes. Each library is
// represented by the markup it actually ships, because the whole problem is
// that none of them look like a <select> and each hides its value somewhere
// different. Greenhouse's react-select is the one that started this: its input
// is opacity:0 with value "" forever, and the answer lives in a sibling div.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { Window } from 'happy-dom'
import { comboboxOptions, comboboxValue, isCombobox, selectComboboxOption } from './combobox'

const win = new Window({ url: 'https://example.com/' })
const g = globalThis as Record<string, unknown>
for (const n of ['HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'MutationObserver']) {
  g[n] = (win as unknown as Record<string, unknown>)[n]
}
const doc = win.document as unknown as Document
const render = (html: string) => {
  doc.body.innerHTML = html
  return doc
}

describe('detects dropdowns that are not <select>', () => {
  test('react-select (Greenhouse): value lives in a sibling div', () => {
    render(`
      <div class="select__control">
        <div class="select__value-container">
          <div class="select__single-value">He/him/his</div>
          <input id="cb" role="combobox" aria-haspopup="true" aria-autocomplete="list"
                 aria-expanded="false" value="" style="opacity:0;width:1px">
        </div>
      </div>`)
    const el = doc.getElementById('cb')!
    expect(isCombobox(el)).toBe(true)
    expect(comboboxValue(el)).toBe('He/him/his')
  })

  test('Ant Design: selection-item node', () => {
    render(`
      <div class="ant-select">
        <div class="ant-select-selector">
          <span class="ant-select-selection-item" title="Yes">Yes</span>
          <input id="cb" role="combobox" aria-expanded="false" value="">
        </div>
      </div>`)
    expect(comboboxValue(doc.getElementById('cb')!)).toBe('Yes')
  })

  test('Vuetify: readonly input inside a select wrapper', () => {
    render(`
      <div class="v-select v-field">
        <div class="v-select__selection">Full-time</div>
        <input id="cb" readonly value="">
      </div>`)
    const el = doc.getElementById('cb')!
    expect(isCombobox(el)).toBe(true)
    expect(comboboxValue(el)).toBe('Full-time')
  })

  test('MUI Autocomplete: the input does carry the label', () => {
    render(`
      <div class="MuiFormControl-root">
        <input id="cb" role="combobox" aria-expanded="false" value="Remote">
      </div>`)
    expect(comboboxValue(doc.getElementById('cb')!)).toBe('Remote')
  })

  test('Select2: the original <select> is still there and wins', () => {
    render(`
      <div class="select2-container">
        <span class="select2-selection__rendered">Stale text</span>
      </div>
      <select id="real"><option value="">Select…</option><option value="b" selected>Belgium</option></select>`)
    // The rendered span can lag; the backing select is authoritative.
    const span = doc.querySelector('.select2-selection__rendered')!
    expect(comboboxValue(span)).toBe('Belgium')
  })

  test('placeholder text is not an answer', () => {
    render(`
      <div class="select__control">
        <div class="select__single-value">Select...</div>
        <input id="cb" role="combobox" aria-expanded="false" value="">
      </div>`)
    expect(comboboxValue(doc.getElementById('cb')!)).toBe('')
  })

  test('a plain text input is not a combobox', () => {
    render(`<label for="t">First name</label><input id="t" type="text">`)
    expect(isCombobox(doc.getElementById('t')!)).toBe(false)
  })
})

describe('options and selection', () => {
  const listboxMarkup = `
    <div class="select__control">
      <div class="select__single-value">Select...</div>
      <input id="cb" role="combobox" aria-controls="lb" aria-expanded="true" value="">
      <div id="lb" role="listbox">
        <div role="option">He/him/his</div>
        <div role="option">She/her/hers</div>
        <div role="option">They/them/theirs</div>
      </div>
    </div>`

  test('reads options from the listbox it controls', async () => {
    render(listboxMarkup)
    expect(await comboboxOptions(doc.getElementById('cb')!)).toEqual([
      'He/him/his',
      'She/her/hers',
      'They/them/theirs',
    ])
  })

  test('options come from a backing select without opening anything', async () => {
    render(`
      <div class="select2-container"><span class="select2-selection__rendered">Select…</span></div>
      <select id="real"><option value="">Select…</option><option value="y">Yes</option><option value="n">No</option></select>`)
    expect(await comboboxOptions(doc.querySelector('.select2-selection__rendered')!)).toEqual(['Yes', 'No'])
  })

  /**
   * Wire the fixture up the way a real component behaves: clicking an option
   * updates the rendered value. selectComboboxOption verifies the selection
   * took, so a fixture that only records the click would (correctly) be
   * reported as a failed selection.
   */
  const wireSelection = (): (() => string) => {
    const display = doc.querySelector('.select__single-value')!
    let clicked = ''
    for (const o of doc.querySelectorAll('[role="option"]')) {
      o.addEventListener('click', () => {
        clicked = o.textContent ?? ''
        display.textContent = clicked
      })
    }
    return () => clicked
  }

  test('selecting clicks the option rather than setting a value', async () => {
    render(listboxMarkup)
    const clicked = wireSelection()
    expect(await selectComboboxOption(doc.getElementById('cb')!, 'She/her/hers')).toBe(true)
    expect(clicked()).toBe('She/her/hers')
  })

  test('selection matches loosely when the label is not verbatim', async () => {
    render(listboxMarkup)
    const clicked = wireSelection()
    expect(await selectComboboxOption(doc.getElementById('cb')!, 'they/them')).toBe(true)
    expect(clicked()).toBe('They/them/theirs')
  })

  test('a click that the component ignores is reported as failure', async () => {
    render(listboxMarkup) // no wiring: clicking changes nothing
    expect(await selectComboboxOption(doc.getElementById('cb')!, 'She/her/hers')).toBe(false)
  })

  test('an option that is not on offer is reported, not faked', async () => {
    render(listboxMarkup)
    expect(await selectComboboxOption(doc.getElementById('cb')!, 'Ze/zir')).toBe(false)
  })

  test('a backing select is set natively and fires change', async () => {
    render(`
      <div class="select2-container"><span id="disp" class="select2-selection__rendered">Select…</span></div>
      <select id="real"><option value="">Select…</option><option value="y">Yes</option></select>`)
    const sel = doc.getElementById('real') as HTMLSelectElement
    let fired = false
    sel.addEventListener('change', () => { fired = true })
    expect(await selectComboboxOption(doc.getElementById('disp')!, 'Yes')).toBe(true)
    expect(sel.value).toBe('y')
    expect(fired).toBe(true)
  })
})
