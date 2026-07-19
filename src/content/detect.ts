// Decides whether an unknown page is a job APPLICATION worth mounting the
// overlay on, unprompted.
//
// Precision beats recall. A missed form costs the user one click on "Fill
// current tab"; a false positive puts our panel on someone's checkout page.
// So the rule is deliberately strict:
//
//   1. Login and payment pages are vetoed outright, whatever else they score.
//   2. Keyword hits NEVER trigger on their own. At least one STRUCTURAL signal
//      must be present — a resume upload, an ATS fingerprint, a contact-field
//      cluster, or application-only questions. "We're hiring!" in a blog post
//      can score every keyword we have and still not qualify.
//   3. The weighted score must clear THRESHOLD.
//
// Everything is matched against the vocabulary below, which covers all eight
// locales the product ships in. These are MATCHING patterns, not user-facing
// copy, so they live here rather than in i18n/ — a German page must be
// detected no matter which language the user runs the UI in.

import { Fillable, labelFor } from './fields'

export interface Signal {
  name: string
  weight: number
}

export interface Detection {
  /** Sum of matched signal weights, minus penalties. */
  score: number
  /** True = mount the overlay without being asked. */
  confident: boolean
  /** Every signal that fired, for debugging and the dev panel. */
  signals: Signal[]
  /** Set when a hard veto fired (login page, payment page). */
  veto?: string
}

/** Score needed to mount unprompted, on top of the structural requirement. */
export const THRESHOLD = 6

// ---------------------------------------------------------------------------
// Vocabulary (en, es, fr, de, nl, pt, it, pl)
// ---------------------------------------------------------------------------

// A CV/cover-letter upload. The single most reliable tell there is: contact
// forms, newsletters and checkouts never ask for one.
const RESUME_WORDS = [
  'resume', 'resumé', 'cv', 'curriculum', 'curriculum vitae', 'cover letter', 'coverletter',
  'motivation letter', 'letter of motivation', 'upload your resume', 'attach resume',
  'lebenslauf', 'anschreiben', 'motivationsschreiben', 'bewerbungsunterlagen',
  'curriculum vitae', 'lettre de motivation', 'cv et lettre',
  'hoja de vida', 'carta de presentacion', 'carta de motivacion',
  'curriculo', 'carta de apresentacao',
  'motivatiebrief', 'sollicitatiebrief', 'cv uploaden',
  'lettera di presentazione', 'lettera motivazionale',
  'zyciorys', 'list motywacyjny', 'dokumenty aplikacyjne',
]

// Button text that means "send my application" — not just "send".
const APPLY_STRONG_WORDS = [
  'apply', 'apply now', 'apply for this job', 'submit application', 'send application',
  'submit your application', 'finish application', 'complete application',
  'bewerben', 'jetzt bewerben', 'bewerbung absenden', 'bewerbung abschicken',
  'postuler', 'envoyer ma candidature', 'soumettre ma candidature', 'deposer ma candidature',
  'solicitar', 'enviar solicitud', 'postularme', 'postular', 'enviar candidatura',
  'candidatar', 'candidatar-me', 'enviar candidatura',
  'solliciteren', 'sollicitatie versturen', 'direct solliciteren',
  'candidati', 'invia candidatura', 'candidarsi',
  'aplikuj', 'zaaplikuj', 'wyslij zgloszenie', 'aplikuj teraz',
]

// Generic form submission. Worth a point, never more — every form has one.
const SUBMIT_GENERIC_WORDS = [
  'submit', 'send', 'continue', 'next',
  'senden', 'absenden', 'weiter',
  'envoyer', 'suivant',
  'enviar', 'siguiente',
  'verzenden', 'volgende',
  'invia', 'avanti',
  'wyslij', 'dalej',
]

// A heading that names the page as an application form.
const APPLY_HEADING_WORDS = [
  'application', 'job application', 'application form', 'application details',
  'apply for', 'your application', 'submit your application',
  'bewerbung', 'bewerbungsformular', 'ihre bewerbung', 'jetzt bewerben',
  'candidature', 'formulaire de candidature', 'votre candidature', 'postuler',
  'solicitud', 'formulario de solicitud', 'postulacion', 'tu solicitud',
  'candidatura', 'formulario de candidatura', 'a sua candidatura',
  'sollicitatie', 'sollicitatieformulier', 'jouw sollicitatie',
  'domanda', 'modulo di candidatura', 'la tua candidatura',
  'aplikacja', 'formularz aplikacyjny', 'zgloszenie', 'twoje zgloszenie',
]

// Section headings that only appear in a job description. Two or more of these
// means the page is describing a role, not selling a product.
const JOB_SECTION_WORDS = [
  'responsibilities', 'what you will do', 'what youll do', 'your role', 'about the role',
  'requirements', 'qualifications', 'what we are looking for', 'what were looking for',
  'who you are', 'your profile', 'nice to have', 'what we offer', 'benefits', 'perks',
  'about the job', 'job description', 'key duties', 'the opportunity',
  'aufgaben', 'ihre aufgaben', 'deine aufgaben', 'anforderungen', 'ihr profil', 'dein profil',
  'was wir bieten', 'wir bieten', 'qualifikationen', 'stellenbeschreibung',
  'missions', 'vos missions', 'profil recherche', 'votre profil', 'ce que nous offrons',
  'competences requises', 'description du poste',
  'responsabilidades', 'requisitos', 'tu perfil', 'que ofrecemos', 'lo que ofrecemos',
  'descripcion del puesto', 'funciones',
  'o que oferecemos', 'o seu perfil', 'descricao da funcao', 'atribuicoes',
  'taken', 'functie eisen', 'wat wij bieden', 'jouw profiel', 'functieomschrijving',
  'responsabilita', 'requisiti', 'cosa offriamo', 'il tuo profilo', 'descrizione del ruolo',
  'obowiazki', 'wymagania', 'oferujemy', 'twoj profil', 'opis stanowiska', 'zakres obowiazkow',
]

// Questions that are close to exclusive to hiring. Nobody asks about your
// notice period or right to work unless they are considering employing you.
const JOB_FIELD_STRONG_WORDS = [
  'cover letter', 'work authorization', 'work authorisation', 'right to work',
  'require sponsorship', 'sponsorship', 'notice period', 'salary expectation',
  'expected salary', 'desired salary', 'salary requirement', 'willing to relocate',
  'earliest start date', 'available to start', 'why do you want to work',
  'gehaltsvorstellung', 'kundigungsfrist', 'fruhester eintrittstermin', 'arbeitserlaubnis',
  'pretention salariale', 'pretentions salariales', 'preavis', 'autorisation de travail',
  'expectativa salarial', 'pretension salarial', 'permiso de trabajo', 'preaviso',
  'pretensao salarial', 'aviso previo',
  'salarisindicatie', 'opzegtermijn', 'werkvergunning',
  'retribuzione', 'preavviso', 'permesso di lavoro',
  'oczekiwania finansowe', 'okres wypowiedzenia', 'pozwolenie na prace',
]

// Questions that FEEL like hiring but are just as common on lead-capture,
// survey and signup forms. On their own these must not carry a page — a
// "request a demo" form asking your employer and years of experience is not
// an application, and treating it as one is exactly the false positive that
// would put our panel where it does not belong.
const JOB_FIELD_WEAK_WORDS = [
  'linkedin', 'portfolio', 'github', 'personal website', 'years of experience',
  'how did you hear', 'current employer', 'current job title', 'relocation', 'visa',
  'availability', 'verfugbarkeit', 'umziehen', 'disponibilite', 'disponibilidad',
  'beschikbaarheid', 'disponibilita', 'dyspozycyjnosc',
]

// Career-site words in a hostname, subdomain or path.
const URL_WORDS = [
  'careers', 'career', 'jobs', 'job', 'apply', 'application', 'vacancy', 'vacancies',
  'openings', 'opening', 'positions', 'hiring', 'recruitment', 'recruiting', 'joinus',
  'work with us', 'workwithus', 'talent',
  'karriere', 'stellen', 'stellenangebote', 'stellenanzeige', 'jobboerse',
  'emploi', 'emplois', 'carriere', 'carrieres', 'offres', 'recrutement', 'nous rejoindre',
  'empleo', 'empleos', 'trabaja con nosotros', 'unete',
  'vagas', 'carreiras', 'trabalhe conosco',
  'werken bij', 'vacatures', 'banen', 'werkenbij',
  'lavora con noi', 'offerte di lavoro', 'posizioni aperte',
  'praca', 'kariera', 'oferty pracy', 'rekrutacja', 'dolacz',
]

// Contact fields, matched by label when the autocomplete attribute is absent.
const GIVEN_NAME_WORDS = ['first name', 'given name', 'forename', 'vorname', 'prenom', 'nombre', 'nome proprio', 'voornaam', 'imie']
const FAMILY_NAME_WORDS = ['last name', 'surname', 'family name', 'nachname', 'familienname', 'nom de famille', 'apellido', 'apelido', 'sobrenome', 'achternaam', 'cognome', 'nazwisko']
const FULL_NAME_WORDS = ['full name', 'your name', 'name', 'nom complet', 'nombre completo', 'nome completo', 'volledige naam', 'naam', 'imie i nazwisko']
const EMAIL_WORDS = ['email', 'e mail', 'mail', 'correo', 'correo electronico', 'courriel', 'e post', 'posta elettronica', 'adres email']
const PHONE_WORDS = ['phone', 'telephone', 'mobile', 'cell', 'telefon', 'telefono', 'telefoon', 'gsm', 'numero de telephone', 'numer telefonu']

// Payment fields — a hard veto. Never our page.
const PAYMENT_WORDS = [
  'card number', 'credit card', 'debit card', 'cvv', 'cvc', 'security code', 'expiry',
  'expiration date', 'iban', 'billing address', 'kartennummer', 'numero de carte',
  'numero de tarjeta', 'numero della carta', 'numer karty',
]

// Hosts that are known ATS platforms. Not a complete list and never will be —
// this is a bonus signal for white-label ATS on custom domains and for
// embedded iframes, not the detection strategy.
const ATS_HOST_RX =
  /(^|\.)(greenhouse\.io|lever\.co|ashbyhq\.com|workable\.com|bamboohr\.com|breezy\.hr|recruitee\.com|smartrecruiters\.com|myworkdayjobs\.com|myworkdaysite\.com|icims\.com|taleo\.net|successfactors\.(com|eu)|personio\.(de|com)|teamtailor\.com|jobvite\.com|jazzhr\.com|applytojob\.com|pinpointhq\.com|workatastartup\.com|rippling\.com|gusto\.com|join\.com|softgarden\.io|hibob\.com|eightfold\.ai|phenompeople\.com|avature\.net)$/i

// ---------------------------------------------------------------------------
// Matching helpers
// ---------------------------------------------------------------------------

// Letters that NFD leaves alone but that we still want folded to ASCII, so the
// Polish and Nordic vocabulary matches text as typed.
const FOLD: Record<string, string> = { ł: 'l', ø: 'o', đ: 'd', ß: 'ss', æ: 'ae', œ: 'oe', ı: 'i' }

export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u0142\u00f8\u0111\u00df\u00e6\u0153\u0131]/g, (c) => FOLD[c] ?? c)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip the accents NFD just split off
    // Drop apostrophes entirely, straight and curly, so one vocabulary entry
    // covers "what you'll do", "what you\u2019ll do" and "what youll do".
    .replace(/['\u2018\u2019\u00b4`]/g, '')
    .replace(/[\s\u00a0]+/g, ' ')
    .trim()
}

/**
 * One regex per vocabulary. Spaces in a phrase also match hyphens and
 * underscores so the same list works against prose ("cover letter") and
 * attribute values ("cover_letter", "cover-letter"). Boundaries are
 * non-alphanumeric rather than \b so short entries like "cv" can't match
 * inside "cvv" or "recv".
 */
function rx(words: string[]): RegExp {
  const alts = words
    .map((w) => norm(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s\\-_]*'))
    .sort((a, b) => b.length - a.length)
  return new RegExp(`(?:^|[^a-z0-9])(?:${alts.join('|')})(?:[^a-z0-9]|$)`)
}

const RESUME_RX = rx(RESUME_WORDS)
const APPLY_STRONG_RX = rx(APPLY_STRONG_WORDS)
const SUBMIT_GENERIC_RX = rx(SUBMIT_GENERIC_WORDS)
const APPLY_HEADING_RX = rx(APPLY_HEADING_WORDS)
const JOB_SECTION_RX = rx(JOB_SECTION_WORDS)
const JOB_FIELD_STRONG_RX = rx(JOB_FIELD_STRONG_WORDS)
const JOB_FIELD_WEAK_RX = rx(JOB_FIELD_WEAK_WORDS)
const URL_RX = rx(URL_WORDS)
const GIVEN_RX = rx(GIVEN_NAME_WORDS)
const FAMILY_RX = rx(FAMILY_NAME_WORDS)
const FULL_NAME_RX = rx(FULL_NAME_WORDS)
const EMAIL_RX = rx(EMAIL_WORDS)
const PHONE_RX = rx(PHONE_WORDS)
const PAYMENT_RX = rx(PAYMENT_WORDS)

/** Cheap visibility test — display:none subtrees have no layout boxes. */
function visible(el: Element): boolean {
  return (el as HTMLElement).getClientRects().length > 0
}

/** Text around a file input: its own attributes, its label, its wrapper. */
function fileContext(el: HTMLInputElement): string {
  const parts = [el.name, el.id, el.getAttribute('accept') ?? '', el.getAttribute('aria-label') ?? '', labelFor(el)]
  let node: HTMLElement | null = el.parentElement
  for (let i = 0; node && i < 3; i++, node = node.parentElement) {
    parts.push((node.textContent ?? '').slice(0, 160))
  }
  return norm(parts.join(' '))
}

// ---------------------------------------------------------------------------
// The scorer
// ---------------------------------------------------------------------------

export function detectJobForm(doc: Document = document, href: string = location.href): Detection {
  const signals: Signal[] = []
  const add = (name: string, weight: number) => signals.push({ name, weight })

  // --- Vetoes -------------------------------------------------------------
  // A visible password field means sign-in or registration. A hidden one is
  // just a login modal sitting in the DOM of an otherwise fine page.
  const password = [...doc.querySelectorAll('input[type="password"]')].find(visible)
  if (password) return { score: 0, confident: false, signals, veto: 'password-field' }

  const fields = [...doc.querySelectorAll<Fillable>('input, textarea, select')]
    .slice(0, 400)
    .filter((el) => {
      const type = (el as HTMLInputElement).type
      return type !== 'hidden' && visible(el)
    })

  // Nothing to fill — a job ad with no form is not an application page. This
  // check comes before the labels below because it clears the large majority
  // of pages on the web, and label resolution is by far the costliest step.
  if (fields.length < 2) return { score: 0, confident: false, signals, veto: 'no-form' }

  // Label text for every visible field, computed once — labelFor walks the DOM
  // and is the most expensive thing we do here.
  const labels = fields.map((el) => norm([el.name, el.id, el.getAttribute('autocomplete') ?? '', labelFor(el)].join(' ')))

  if (fields.some((el, i) => PAYMENT_RX.test(labels[i]) || /^cc-/.test(el.getAttribute('autocomplete') ?? ''))) {
    return { score: 0, confident: false, signals, veto: 'payment-field' }
  }

  // --- Structural signals -------------------------------------------------
  let structural = 0

  // Duck-typed rather than `instanceof HTMLInputElement`: the same document
  // can hand us elements from another realm (ATS forms live in iframes).
  const isFileInput = (el: Fillable): el is HTMLInputElement =>
    el.tagName === 'INPUT' && (el as HTMLInputElement).type === 'file'
  const resumeInput = fields.some((el) => isFileInput(el) && RESUME_RX.test(fileContext(el)))
  if (resumeInput) {
    add('resume-upload', 5)
    structural++
  }

  const url = safeUrl(href)
  const atsHost = !!url && ATS_HOST_RX.test(url.hostname)
  const atsFrame = [...doc.querySelectorAll('iframe[src]')].some((f) => {
    const src = safeUrl(f.getAttribute('src') ?? '')
    return !!src && ATS_HOST_RX.test(src.hostname)
  })
  // Deliberately NOT structural. Being on an ATS domain says the page is about
  // hiring, not that this particular page has a form worth filling — their job
  // LISTING pages live on the same host. It boosts a page that already shows
  // form structure; it can't carry one on its own.
  if (atsHost || atsFrame) add(atsHost ? 'ats-host' : 'ats-iframe', 4)

  // Contact cluster: first + last + email is the shape of an application.
  // A single "name" plus email is the shape of a contact form, so it scores
  // half. autocomplete attributes win when present — they're language-neutral.
  const ac = (el: Fillable) => (el.getAttribute('autocomplete') ?? '').toLowerCase()
  const has = (test: (el: Fillable, label: string) => boolean) => fields.some((el, i) => test(el, labels[i]))
  const hasGiven = has((el, l) => ac(el).includes('given-name') || GIVEN_RX.test(l))
  const hasFamily = has((el, l) => ac(el).includes('family-name') || FAMILY_RX.test(l))
  const hasEmail = has((el, l) => ac(el) === 'email' || (el as HTMLInputElement).type === 'email' || EMAIL_RX.test(l))
  const hasFullName = has((el, l) => ac(el) === 'name' || FULL_NAME_RX.test(l))
  const hasPhone = has((el, l) => ac(el).includes('tel') || (el as HTMLInputElement).type === 'tel' || PHONE_RX.test(l))

  if (hasGiven && hasFamily && hasEmail) {
    add('contact-cluster', 2)
    structural++
  } else if (hasEmail && (hasFullName || hasGiven || hasPhone)) {
    add('contact-partial', 1)
    structural++
  }

  // Hiring-only questions. Two is conclusive, one still counts as structure —
  // a form asking for a cover letter or a notice period is an application.
  const strongHits = labels.filter((l) => JOB_FIELD_STRONG_RX.test(l)).length
  if (strongHits >= 2) {
    add('application-questions', 3)
    structural++
  } else if (strongHits === 1) {
    add('application-question', 2)
    structural++
  }

  // Hiring-flavoured questions that are common elsewhere: worth a nudge, never
  // structure, and capped so a form full of them can't add up to a verdict.
  if (labels.filter((l) => JOB_FIELD_WEAK_RX.test(l)).length >= 2) add('profile-questions', 1)

  // --- Supporting signals -------------------------------------------------
  const buttons = [...doc.querySelectorAll('button, input[type="submit"], [role="button"], a.button, a[class*="btn" i]')]
    .slice(0, 120)
    .filter(visible)
    .map((el) => norm(el.textContent || (el as HTMLInputElement).value || el.getAttribute('aria-label') || ''))
    .filter(Boolean)

  if (buttons.some((b) => APPLY_STRONG_RX.test(b))) add('apply-button', 3)
  else if (buttons.some((b) => SUBMIT_GENERIC_RX.test(b))) add('submit-button', 1)

  const headings = [...doc.querySelectorAll('h1, h2, h3, h4, legend, [role="heading"]')]
    .slice(0, 120)
    .map((el) => norm(el.textContent ?? ''))
    .filter((t) => t.length > 0 && t.length < 200)
  const titleText = norm(doc.title ?? '')

  if (headings.some((h) => APPLY_HEADING_RX.test(h)) || APPLY_HEADING_RX.test(titleText)) {
    add('application-heading', 2)
  }

  // Job-description prose: distinct section headings, not repeats of one.
  const sectionHits = new Set(headings.filter((h) => JOB_SECTION_RX.test(h)).map((h) => h.slice(0, 40))).size
  if (sectionHits >= 4) add('job-description-prose', 3)
  else if (sectionHits >= 2) add('job-description-prose', 2)

  if (url) {
    const host = norm(url.hostname.replace(/\./g, ' '))
    const path = norm(decodeURIComponent(url.pathname).replace(/[/_+]/g, ' '))
    if (URL_RX.test(host)) add('career-host', 1)
    if (URL_RX.test(path)) add('career-path', 1)
  }

  if (hasJobPostingLd(doc)) add('jsonld-jobposting', 3)

  // --- Verdict ------------------------------------------------------------
  const score = signals.reduce((sum, s) => sum + s.weight, 0)
  const confident = structural > 0 && score >= THRESHOLD
  return { score, confident, signals }
}

function safeUrl(href: string): URL | null {
  try {
    return new URL(href, typeof location === 'undefined' ? undefined : location.href)
  } catch {
    return null
  }
}

/**
 * schema.org JobPosting in a <script type="application/ld+json">. Google Jobs
 * indexing pushes almost every real career page to publish it, which makes it
 * the cheapest high-quality signal available — and it needs no vocabulary.
 */
function hasJobPostingLd(doc: Document): boolean {
  for (const el of [...doc.querySelectorAll('script[type="application/ld+json"]')].slice(0, 20)) {
    const raw = el.textContent
    if (!raw || raw.length > 300_000) continue
    try {
      if (findJobPosting(JSON.parse(raw), 0)) return true
    } catch {
      // Malformed JSON-LD is extremely common; it's a bonus signal, so skip it.
    }
  }
  return false
}

function findJobPosting(node: unknown, depth: number): boolean {
  if (depth > 6 || node === null || typeof node !== 'object') return false
  if (Array.isArray(node)) return node.some((n) => findJobPosting(n, depth + 1))
  const type = (node as Record<string, unknown>)['@type']
  const isPosting = (t: unknown) => String(t).toLowerCase() === 'jobposting'
  if (isPosting(type) || (Array.isArray(type) && type.some(isPosting))) return true
  return Object.values(node as Record<string, unknown>).some((v) => findJobPosting(v, depth + 1))
}
