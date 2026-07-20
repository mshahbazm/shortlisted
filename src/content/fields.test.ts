// Secrets must never reach the field list. Everything downstream — filling,
// the answer bank, the account mirror, the model call — reads from that list,
// so keeping a field out of it is what makes "we never touch your password"
// true by construction rather than by good intentions.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { Window, Element as HappyElement } from 'happy-dom'
import { collectFields, fileFieldRole, isSensitiveField } from './fields'

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

  // Regression: Lever renders the CV input with its status messages inside the
  // same label region, so the text arrives as "Resume/CV" + "Couldn't auto-read
  // resume" concatenated into "...RESUME/CVCouldn't...". A /cvc/ pattern that
  // was not anchored at its end matched that, the field was dropped as a credit
  // card, and the CV silently stopped attaching on every Lever application.
  test('Lever resume input survives (real label text)', () => {
    const doc2 = new Window({ url: 'https://jobs.lever.co/acme/123/apply' }).document as unknown as Document
    doc2.body.innerHTML = `
      <label for="resume-upload-input">Resume/CV</label>
      <input id="resume-upload-input" name="resume" type="file"
             class="application-file-input invisible-resume-upload">
      <span>ATTACH RESUME/CV</span><span>Couldn't auto-read resume.</span>
    `
    const el = doc2.getElementById('resume-upload-input') as HTMLInputElement
    expect(isSensitiveField(el)).toBe(false)
  })

  test('a file input is never treated as a secret', () => {
    doc.body.innerHTML = `
      <label for="f">Upload proof of your passport number</label>
      <input id="f" type="file">
    `
    expect(isSensitiveField(doc.getElementById('f') as HTMLInputElement)).toBe(false)
  })

  // Short tokens must not match inside a longer run of text — the failure mode
  // above, generalised.
  test('short tokens do not match mid-word', () => {
    doc.body.innerHTML = `
      <label for="a">RESUME/CVCouldn't auto-read</label><input id="a">
      <label for="b">Which iBank branch</label><input id="b">
      <label for="c">Pinterest profile</label><input id="c">
      <label for="d">Sponsorship needed</label><input id="d">
    `
    const el = (id: string) => doc.getElementById(id) as HTMLInputElement
    for (const id of ['a', 'b', 'c', 'd']) expect(isSensitiveField(el(id))).toBe(false)
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

// Which file input is the CV. Greenhouse labels BOTH its CV and cover-letter
// inputs "Attach" — the label is the button you press — so reading the label
// alone recognises neither, and the CV silently never attaches. The id is the
// thing that actually says what the field is for.
describe('telling a CV slot from a cover-letter slot', () => {
  const fileInput = (html: string, id: string) => {
    doc.body.innerHTML = html
    return doc.getElementById(id) as HTMLInputElement
  }

  test('Greenhouse: label is "Attach", id carries the meaning', () => {
    const html = `
      <div>
        <label for="resume">Attach</label>
        <input id="resume" type="file" class="visually-hidden" accept=".pdf,.doc">
      </div>
      <div>
        <label for="cover_letter">Attach</label>
        <input id="cover_letter" type="file" class="visually-hidden" accept=".pdf,.doc">
      </div>`
    expect(fileFieldRole(fileInput(html, 'resume'), 'Attach')).toBe('resume')
    expect(fileFieldRole(fileInput(html, 'cover_letter'), 'Attach')).toBe('cover-letter')
  })

  test('a plainly labelled CV input', () => {
    const el = fileInput(`<label for="f">Upload your CV</label><input id="f" type="file">`, 'f')
    expect(fileFieldRole(el, 'Upload your CV')).toBe('resume')
  })

  test('cover letter wins over resume when the element names both', () => {
    const el = fileInput(`<input id="f" type="file" name="cover_letter_resume">`, 'f')
    expect(fileFieldRole(el, '')).toBe('cover-letter')
  })

  test('nearby text is used when the element itself says nothing', () => {
    const el = fileInput(`<div><h3>Resume</h3><div><input id="f" type="file"></div></div>`, 'f')
    expect(fileFieldRole(el, '')).toBe('resume')
  })

  // A shared wrapper naming both is not this field's description.
  test('an ancestor mentioning both is treated as unknown, not guessed', () => {
    const el = fileInput(
      `<div><h3>Resume and cover letter</h3><div><input id="f" type="file"></div></div>`,
      'f',
    )
    expect(fileFieldRole(el, '')).toBe('unknown')
  })

  test('a bare file input with no wording at all', () => {
    const el = fileInput(`<input id="f" type="file">`, 'f')
    expect(fileFieldRole(el, '')).toBe('unknown')
  })
})
