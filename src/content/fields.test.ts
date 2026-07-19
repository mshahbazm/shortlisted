// Secrets must never reach the field list. Everything downstream — filling,
// the answer bank, the account mirror, the model call — reads from that list,
// so keeping a field out of it is what makes "we never touch your password"
// true by construction rather than by good intentions.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { Window, Element as HappyElement } from 'happy-dom'
import { collectFields, isSensitiveField } from './fields'

// collectFields is browser code: it uses `instanceof HTMLInputElement` and
// getComputedStyle. Publish one happy-dom window's constructors as globals and
// build every fixture from that same window, so instanceof matches.
const win = new Window({ url: 'https://example.com/' })
const g = globalThis as Record<string, unknown>
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'Element', 'Node']) {
  g[name] = (win as unknown as Record<string, unknown>)[name]
}
g.CSS ??= { escape: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) }

const RECTS = [{ width: 1, height: 1 }] as unknown as DOMRectList
Object.defineProperty(HappyElement.prototype, 'getClientRects', {
  value: () => RECTS,
  configurable: true,
})

const doc = win.document as unknown as Document

function fieldsOf(body: string) {
  doc.body.innerHTML = body
  return collectFields(doc)
}

const labels = (body: string) => fieldsOf(body).map((f) => f.label)

describe('sensitive fields never enter the field list', () => {
  test('password input', () => {
    const found = labels(`
      <label for="e">Email</label><input id="e" type="email">
      <label for="p">Password</label><input id="p" type="password">
    `)
    expect(found).toEqual(['Email'])
  })

  test('payment fields, by autocomplete and by label', () => {
    const found = labels(`
      <label for="n">Full name</label><input id="n">
      <label for="c">Card number</label><input id="c" autocomplete="cc-number">
      <label for="v">CVV</label><input id="v">
      <label for="i">IBAN</label><input id="i">
    `)
    expect(found).toEqual(['Full name'])
  })

  test('government identifiers', () => {
    const found = labels(`
      <label for="a">First name</label><input id="a">
      <label for="s">Social Security Number</label><input id="s">
      <label for="p">Passport number</label><input id="p">
      <label for="ni">National Insurance number</label><input id="ni">
    `)
    expect(found).toEqual(['First name'])
  })

  test('one-time codes', () => {
    const found = labels(`
      <label for="e">Email</label><input id="e" type="email">
      <label for="o">Verification code</label><input id="o" autocomplete="one-time-code">
    `)
    expect(found).toEqual(['Email'])
  })

  test('a real application form is left intact', () => {
    const found = labels(`
      <label for="fn">First name</label><input id="fn">
      <label for="ln">Last name</label><input id="ln">
      <label for="em">Email</label><input id="em" type="email">
      <label for="np">Notice period</label><input id="np">
      <label for="cl">Cover letter</label><textarea id="cl"></textarea>
    `)
    expect(found).toEqual(['First name', 'Last name', 'Email', 'Notice period', 'Cover letter'])
  })

  // "Passwordless sign-in" and similar wording must not knock out a legitimate
  // question, but anything naming an actual credential must.
  test('flags credentials without over-matching ordinary words', () => {
    doc.body.innerHTML = `
      <label for="a">Your password</label><input id="a">
      <label for="b">Pin code</label><input id="b">
      <label for="c">Company</label><input id="c">
      <label for="d">Pinterest profile</label><input id="d">
    `
    const el = (id: string) => doc.getElementById(id) as HTMLInputElement
    expect(isSensitiveField(el('a'))).toBe(true)
    expect(isSensitiveField(el('b'))).toBe(true)
    expect(isSensitiveField(el('c'))).toBe(false)
    expect(isSensitiveField(el('d'))).toBe(false)
  })
})
