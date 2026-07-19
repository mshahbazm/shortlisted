// Fixture corpus for the job-application detector.
//
// The point of these tests is the FALSE POSITIVES. Any change to the
// vocabulary or the weights has to leave the "must not fire" half of this file
// passing — a contact form or a checkout that trips the detector is a far
// worse bug than a job form it misses.
//
// Run: bun test

import { expect, test, describe } from 'bun:test'
import { Window, Element as HappyElement } from 'happy-dom'
import { detectJobForm } from './detect'

// labelFor uses CSS.escape, which the browser provides but bun's global scope
// does not.
const g = globalThis as { CSS?: { escape(s: string): string } }
g.CSS ??= { escape: (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`) }

// happy-dom does no layout, so the detector's real getClientRects visibility
// test would hide every field. Stub it to "visible unless display:none".
const RECTS = [{ width: 1, height: 1 }] as unknown as DOMRectList
Object.defineProperty(HappyElement.prototype, 'getClientRects', {
  value(this: HTMLElement) {
    for (let n: HTMLElement | null = this; n; n = n.parentElement) {
      if (n.style?.display === 'none') return []
    }
    return RECTS
  },
  configurable: true,
})

function page(body: string, opts: { url?: string; title?: string } = {}) {
  const window = new Window({ url: opts.url ?? 'https://example.com/' })
  const doc = window.document as unknown as Document
  doc.title = opts.title ?? ''
  doc.body.innerHTML = body
  return detectJobForm(doc, opts.url ?? 'https://example.com/')
}

const CONTACT_FIELDS = `
  <label for="fn">First name *</label><input id="fn" name="first_name">
  <label for="ln">Last name *</label><input id="ln" name="last_name">
  <label for="em">Email *</label><input id="em" type="email" name="email">
`

describe('fires on real application forms', () => {
  test('custom-built form with job description above it', () => {
    const d = page(
      `<h1>Vue.js Developer</h1>
       <h2>What You'll Do</h2><ul><li>Build UIs</li></ul>
       <h2>What We're Looking For</h2><ul><li>Vue</li></ul>
       <h2>Work Environment</h2><p>Remote.</p>
       <h2>Application Details</h2>
       <form>${CONTACT_FIELDS}<button type="submit">Submit</button></form>`,
      { title: 'Vue.js Developer' },
    )
    expect(d.confident).toBe(true)
  })

  test('resume upload alone carries a plain form', () => {
    const d = page(
      `<form>${CONTACT_FIELDS}
        <label for="cv">Upload your resume</label><input id="cv" type="file" accept=".pdf">
        <button type="submit">Submit</button>
      </form>`,
    )
    expect(d.confident).toBe(true)
    expect(d.signals.map((s) => s.name)).toContain('resume-upload')
  })

  test('German application form', () => {
    const d = page(
      `<h1>Ihre Bewerbung</h1>
       <form>
         <label for="v">Vorname</label><input id="v" name="vorname">
         <label for="n">Nachname</label><input id="n" name="nachname">
         <label for="e">E-Mail</label><input id="e" type="email">
         <label for="l">Lebenslauf hochladen</label><input id="l" type="file">
         <button type="submit">Jetzt bewerben</button>
       </form>`,
      { url: 'https://firma.de/karriere/stelle-123' },
    )
    expect(d.confident).toBe(true)
  })

  test('French application form', () => {
    const d = page(
      `<h1>Formulaire de candidature</h1>
       <form>
         <label for="p">Prénom</label><input id="p">
         <label for="n">Nom de famille</label><input id="n">
         <label for="e">Courriel</label><input id="e" type="email">
         <label for="m">Lettre de motivation</label><textarea id="m"></textarea>
         <button type="submit">Envoyer ma candidature</button>
       </form>`,
      { url: 'https://societe.fr/emploi/dev' },
    )
    expect(d.confident).toBe(true)
  })

  test('Polish application form', () => {
    const d = page(
      `<h1>Formularz aplikacyjny</h1>
       <form>
         <label for="i">Imię</label><input id="i">
         <label for="n">Nazwisko</label><input id="n">
         <label for="e">Adres email</label><input id="e" type="email">
         <label for="c">List motywacyjny</label><input id="c" type="file">
         <button type="submit">Aplikuj teraz</button>
       </form>`,
      { url: 'https://firma.pl/kariera/oferty-pracy/dev' },
    )
    expect(d.confident).toBe(true)
  })

  test('application-only questions carry a sparse form', () => {
    const d = page(
      `<form>
         <label for="e">Email</label><input id="e" type="email">
         <label for="li">LinkedIn profile</label><input id="li">
         <label for="np">Notice period</label><input id="np">
         <label for="sal">Salary expectation</label><input id="sal">
         <button type="submit">Apply now</button>
       </form>`,
    )
    expect(d.confident).toBe(true)
  })

  test('JSON-LD JobPosting plus a form', () => {
    const d = page(
      `<script type="application/ld+json">
        {"@context":"https://schema.org","@type":"JobPosting","title":"Engineer"}
       </script>
       <form>${CONTACT_FIELDS}<button type="submit">Send</button></form>`,
    )
    expect(d.confident).toBe(true)
    expect(d.signals.map((s) => s.name)).toContain('jsonld-jobposting')
  })

  test('JSON-LD nested in an @graph', () => {
    const d = page(
      `<script type="application/ld+json">
        {"@graph":[{"@type":"Organization"},{"@type":["JobPosting"],"title":"Dev"}]}
       </script>
       <form>${CONTACT_FIELDS}<button type="submit">Send</button></form>`,
    )
    expect(d.signals.map((s) => s.name)).toContain('jsonld-jobposting')
  })

  test('embedded Greenhouse iframe on a company domain', () => {
    const d = page(
      `<h1>Careers</h1>
       <iframe src="https://boards.greenhouse.io/acme/jobs/123"></iframe>
       <form>${CONTACT_FIELDS}<button type="submit">Submit</button></form>`,
      { url: 'https://acme.com/careers/backend' },
    )
    expect(d.confident).toBe(true)
  })
})

describe('stays quiet on everything else', () => {
  test('plain contact form', () => {
    const d = page(
      `<h1>Contact us</h1>
       <form>
         <label for="n">Name</label><input id="n" name="name">
         <label for="e">Email</label><input id="e" type="email">
         <label for="m">Message</label><textarea id="m"></textarea>
         <button type="submit">Send</button>
       </form>`,
    )
    expect(d.confident).toBe(false)
  })

  test('newsletter signup', () => {
    const d = page(
      `<h2>Subscribe</h2>
       <form><input type="email" placeholder="Email"><input name="name"><button>Sign up</button></form>`,
    )
    expect(d.confident).toBe(false)
  })

  test('login page is vetoed', () => {
    const d = page(
      `<h1>Sign in to your account</h1>
       <form>
         <label for="e">Email</label><input id="e" type="email">
         <label for="p">Password</label><input id="p" type="password">
         <button type="submit">Submit</button>
       </form>`,
      { url: 'https://jobs.example.com/login' },
    )
    expect(d.veto).toBe('password-field')
    expect(d.confident).toBe(false)
  })

  test('a hidden login modal does not veto a real application page', () => {
    const d = page(
      `<div style="display:none"><input type="password"></div>
       <h1>Application Details</h1>
       <form>${CONTACT_FIELDS}
         <label for="cv">Resume</label><input id="cv" type="file">
         <button type="submit">Apply</button>
       </form>`,
    )
    expect(d.veto).toBeUndefined()
    expect(d.confident).toBe(true)
  })

  test('checkout page is vetoed even on a careers host', () => {
    const d = page(
      `<form>
         <label for="fn">First name</label><input id="fn">
         <label for="ln">Last name</label><input id="ln">
         <label for="e">Email</label><input id="e" type="email">
         <label for="cc">Card number</label><input id="cc" autocomplete="cc-number">
         <button type="submit">Submit</button>
       </form>`,
      { url: 'https://careers.example.com/checkout' },
    )
    expect(d.veto).toBe('payment-field')
  })

  test('blog post about hiring, no form', () => {
    const d = page(
      `<h1>We're hiring a Vue.js Developer!</h1>
       <h2>Responsibilities</h2><p>...</p>
       <h2>Requirements</h2><p>...</p>
       <h2>What we offer</h2><p>...</p>
       <form role="search"><input name="q" placeholder="Search"></form>`,
      { url: 'https://example.com/blog/were-hiring', title: "We're hiring" },
    )
    expect(d.confident).toBe(false)
  })

  test('job listing index with a filter form', () => {
    const d = page(
      `<h1>Open positions</h1>
       <form>
         <label for="q">Search jobs</label><input id="q" name="q">
         <label for="loc">Location</label><select id="loc"><option>Remote</option></select>
         <button type="submit">Search</button>
       </form>
       <ul><li><a href="/jobs/1">Engineer</a></li><li><a href="/jobs/2">Designer</a></li></ul>`,
      { url: 'https://example.com/careers', title: 'Careers' },
    )
    expect(d.confident).toBe(false)
  })

  test('support ticket form on a careers subdomain', () => {
    const d = page(
      `<h1>Submit a request</h1>
       <form>
         <label for="n">Your name</label><input id="n">
         <label for="e">Email</label><input id="e" type="email">
         <label for="s">Subject</label><input id="s">
         <label for="d">Description</label><textarea id="d"></textarea>
         <label for="a">Attachment</label><input id="a" type="file">
         <button type="submit">Submit</button>
       </form>`,
      { url: 'https://careers.example.com/support' },
    )
    expect(d.confident).toBe(false)
  })

  test('"cv" does not match inside cvv or other words', () => {
    const d = page(
      `<form>
         <label for="e">Email</label><input id="e" type="email">
         <label for="r">Receive our newsletter</label><input id="r" type="checkbox">
         <label for="f">Attach a file</label><input id="f" type="file" name="cvv_proof">
         <button>Send</button>
       </form>`,
    )
    expect(d.signals.map((s) => s.name)).not.toContain('resume-upload')
  })

  // Found by running the detector against the live Anthropic job board: an ATS
  // domain is context, not structure. Its LISTING pages sit on the same host as
  // its application forms, and a search box plus two filter dropdowns is not
  // something we can fill.
  test('ATS job-listing index does not fire on the host name alone', () => {
    const d = page(
      `<h1>Open Roles</h1>
       <form>
         <label for="q">Search</label><input id="q" name="q">
         <label for="dep">Department</label><select id="dep"><option>Select...</option></select>
         <label for="off">Office</label><select id="off"><option>Select...</option></select>
         <button type="submit">Submit</button>
       </form>
       <ul><li><a href="/x/jobs/1">Engineer</a></li><li><a href="/x/jobs/2">Designer</a></li></ul>`,
      { url: 'https://job-boards.greenhouse.io/acme', title: 'Jobs at Acme' },
    )
    expect(d.confident).toBe(false)
  })

  test('page with no fillable fields', () => {
    const d = page(`<h1>About us</h1><p>We are a company.</p>`)
    expect(d.veto).toBe('no-form')
  })
})
