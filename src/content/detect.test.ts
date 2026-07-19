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

  // The employer's side of a job board. Everything we score for is present —
  // careers host, jobs path, job-description headings, name and email — so
  // these have to be recognised rather than out-scored.
  test('employer "post a job" form', () => {
    const d = page(
      `<h1>Post a job</h1><h2>About the role</h2><h2>Job description</h2>
       <form>
         <label for="co">Company name</label><input id="co">
         <label for="n">Your name</label><input id="n">
         <label for="e">Work email</label><input id="e" type="email">
         <label for="jt">Job title</label><input id="jt">
         <label for="jd">Job description</label><textarea id="jd"></textarea>
         <label for="sal">Salary range</label><input id="sal">
         <button type="submit">Post job</button>
       </form>`,
      { url: 'https://jobs.example.com/post-a-job', title: 'Post a job' },
    )
    expect(d.confident).toBe(false)
    expect(d.veto).toBe('job-posting-form')
  })

  test('employer vacancy form with a generic submit button', () => {
    const d = page(
      `<h1>Post a job</h1><h2>Job description</h2><h2>Requirements</h2><h2>What we offer</h2>
       <form>
         <label for="co">Company</label><input id="co">
         <label for="fn">First name</label><input id="fn" autocomplete="given-name">
         <label for="ln">Last name</label><input id="ln" autocomplete="family-name">
         <label for="e">Email</label><input id="e" type="email">
         <label for="jd">Description</label><textarea id="jd"></textarea>
         <button type="submit">Submit</button>
       </form>`,
      { url: 'https://careers.example.com/employers/new-vacancy', title: 'Post a vacancy' },
    )
    expect(d.confident).toBe(false)
  })

  // Guards the veto above from over-reaching. A company careers page almost
  // always titles its ad section "Job description" and puts the form directly
  // underneath, so that heading must never be read as employer intent.
  test('real application under a "Job description" heading still fires', () => {
    const d = page(
      `<h1>Senior Engineer</h1>
       <h2>Job description</h2><p>We are looking for…</p>
       <h2>Requirements</h2><p>5 years…</p>
       <div>
         <div>First name</div><input name="first_name">
         <div>Last name</div><input name="last_name">
         <div>Email</div><input type="email" name="email">
         <div>Upload your CV</div><input type="file" name="resume">
         <button type="submit">Apply now</button>
       </div>`,
      { url: 'https://acme.com/careers/senior-engineer', title: 'Senior Engineer' },
    )
    expect(d.confident).toBe(true)
  })

  // The posting veto keys on the ACT of posting, never on a job title. An
  // earlier version matched a bare 'recruiter' path segment, which silently
  // killed every application for a recruiter role — a common job, and a
  // failure with no symptom beyond the panel not appearing.
  test('applying for a recruiter role is not a posting page', () => {
    for (const url of [
      'https://acme.com/careers/recruiter',
      'https://acme.com/jobs/recruiters',
      'https://acme.com/careers/hire',
      'https://acme.com/jobs/technical-recruiter/apply',
    ]) {
      const d = page(
        `<h1>Apply</h1><form>
           <label for="fn">First name</label><input id="fn" autocomplete="given-name">
           <label for="ln">Last name</label><input id="ln" autocomplete="family-name">
           <label for="e">Email</label><input id="e" type="email">
           <label for="cv">Upload your CV</label><input id="cv" type="file">
           <button type="submit">Submit application</button>
         </form>`,
        { url, title: 'Apply' },
      )
      expect({ url, fires: d.confident }).toEqual({ url, fires: true })
    }
  })

  test('employer-side paths still veto', () => {
    for (const url of [
      'https://board.com/post-a-job',
      'https://board.com/for-employers/signup',
      'https://board.com/employers/new',
    ]) {
      const d = page(
        `<h1>Create listing</h1><form>
           <label for="co">Company</label><input id="co">
           <label for="fn">First name</label><input id="fn" autocomplete="given-name">
           <label for="ln">Last name</label><input id="ln" autocomplete="family-name">
           <label for="e">Email</label><input id="e" type="email">
           <button type="submit">Submit</button>
         </form>`,
        { url, title: 'Create listing' },
      )
      expect({ url, veto: d.veto }).toEqual({ url, veto: 'job-posting-form' })
    }
  })

  test('volunteer sign-up is not an application', () => {
    const d = page(
      `<h1>Volunteer with us</h1>
       <form>
         <label for="fn">First name</label><input id="fn" autocomplete="given-name">
         <label for="ln">Last name</label><input id="ln" autocomplete="family-name">
         <label for="e">Email</label><input id="e" type="email">
         <label for="p">Phone</label><input id="p" type="tel">
         <label for="w">Why do you want to volunteer?</label><textarea id="w"></textarea>
         <button type="submit">Apply to volunteer</button>
       </form>`,
      { url: 'https://charity.example.org/get-involved/volunteer', title: 'Volunteer' },
    )
    expect(d.confident).toBe(false)
  })

  // The shape most likely to fool us now that we run on every page: a form
  // with the full first/last/email/phone cluster that has nothing to do with
  // hiring. The cluster alone must never be enough.
  test('hotel booking form', () => {
    const d = page(
      `<h1>Complete your booking</h1>
       <form>
         <label for="fn">First name</label><input id="fn" autocomplete="given-name">
         <label for="ln">Last name</label><input id="ln" autocomplete="family-name">
         <label for="e">Email</label><input id="e" type="email">
         <label for="p">Phone</label><input id="p" type="tel">
         <label for="req">Special requests</label><textarea id="req"></textarea>
         <button type="submit">Book now</button>
       </form>`,
      { url: 'https://hotels.example.com/checkout/guest-details', title: 'Booking' },
    )
    expect(d.confident).toBe(false)
  })

  test('conference registration form', () => {
    const d = page(
      `<h1>Registration</h1>
       <form>
         <label for="fn">First name</label><input id="fn" autocomplete="given-name">
         <label for="ln">Last name</label><input id="ln" autocomplete="family-name">
         <label for="e">Email</label><input id="e" type="email">
         <label for="c">Company</label><input id="c">
         <label for="jt">Job title</label><input id="jt">
         <button type="submit">Submit</button>
       </form>`,
      { url: 'https://conf.example.com/register', title: 'Register' },
    )
    expect(d.confident).toBe(false)
  })

  test('B2B lead form asking about experience', () => {
    const d = page(
      `<h1>Request a demo</h1>
       <form>
         <label for="n">Full name</label><input id="n" autocomplete="name">
         <label for="e">Work email</label><input id="e" type="email">
         <label for="y">Years of experience</label><select id="y"><option>1-3</option></select>
         <label for="emp">Current employer</label><input id="emp">
         <button type="submit">Send</button>
       </form>`,
      { url: 'https://saas.example.com/demo' },
    )
    expect(d.confident).toBe(false)
  })

  test('page with no fillable fields', () => {
    const d = page(`<h1>About us</h1><p>We are a company.</p>`)
    expect(d.veto).toBe('no-form')
  })
})
