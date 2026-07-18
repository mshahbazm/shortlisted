// One adapter per ATS. Adapters are small configs over the shared engine:
// where the form lives, how to spot the submit button, anything site-specific.

export interface Adapter {
  id: string
  name: string
  matches: (url: URL) => boolean
  // CSS selector(s) for the application form root. First match wins;
  // falls back to document if none found.
  formRoots: string[]
  submitSelectors: string[]
  // SPA-heavy sites need a MutationObserver to catch late-rendered forms.
  observe?: boolean
}

export const ADAPTERS: Adapter[] = [
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    matches: (u) => /(^|\.)greenhouse\.io$/.test(u.hostname),
    formRoots: ['#application-form', '#application_form', 'form[action*="applications"]', '#main_fields', '#app_body'],
    submitSelectors: ['#submit_app', 'button[type=submit]', 'input[type=submit]'],
    observe: true,
  },
  {
    id: 'lever',
    name: 'Lever',
    matches: (u) => u.hostname === 'jobs.lever.co',
    formRoots: ['form#application-form', 'form.application-form', 'form[action*="apply"]'],
    submitSelectors: ['button[data-qa="btn-submit"]', 'button[type=submit]'],
  },
  {
    id: 'ashby',
    name: 'Ashby',
    matches: (u) => u.hostname === 'jobs.ashbyhq.com',
    formRoots: ['form[class*="application"]', 'div[class*="_applicationForm"]', 'form'],
    submitSelectors: ['button[class*="submit"]', 'button[type=submit]'],
    observe: true,
  },
  {
    id: 'workable',
    name: 'Workable',
    matches: (u) => u.hostname === 'apply.workable.com',
    formRoots: ['form[data-ui="application-form"]', 'form'],
    submitSelectors: ['button[data-ui="submit-application"]', 'button[type=submit]'],
    observe: true,
  },
  {
    id: 'bamboohr',
    name: 'BambooHR',
    matches: (u) => u.hostname.endsWith('.bamboohr.com'),
    formRoots: ['form#applicationForm', 'form[name="applicationForm"]', 'form'],
    submitSelectors: ['button[type=submit]'],
    observe: true,
  },
  {
    id: 'breezy',
    name: 'Breezy',
    matches: (u) => u.hostname.endsWith('.breezy.hr'),
    formRoots: ['form[name="applyForm"]', 'form.application-form', 'form'],
    submitSelectors: ['button[type=submit]', 'button.submit'],
  },
  {
    id: 'recruitee',
    name: 'Recruitee',
    matches: (u) => u.hostname.endsWith('.recruitee.com'),
    formRoots: ['form[data-testid="application-form"]', 'form'],
    submitSelectors: ['button[type=submit]'],
    observe: true,
  },
  {
    id: 'smartrecruiters',
    name: 'SmartRecruiters',
    matches: (u) => u.hostname === 'jobs.smartrecruiters.com',
    formRoots: ['form'],
    submitSelectors: ['button[type=submit]'],
    observe: true,
  },
]

export const GENERIC_ADAPTER: Adapter = {
  id: 'generic',
  name: 'this site',
  matches: () => true,
  formRoots: ['form'],
  submitSelectors: ['button[type=submit]', 'input[type=submit]'],
  observe: true,
}

export function detectAdapter(href: string): Adapter | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  return ADAPTERS.find((a) => a.matches(url)) ?? null
}

export function findFormRoot(adapter: Adapter): ParentNode {
  for (const sel of adapter.formRoots) {
    const el = document.querySelector(sel)
    if (el) return el
  }
  return document
}
