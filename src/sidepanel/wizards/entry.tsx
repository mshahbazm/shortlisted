// Wizard A — "Let's get you shortlisted". Shown when logged out. A branching
// graph: the welcome screen forks three ways (import a CV / start blank / log
// in), and email OTP is shared by all three. After auth the wizard ends
// (ctx.finish) and the App router decides Home vs the Build wizard — except the
// has-CV door, which continues through building → review → answers because those
// steps depend on the in-memory CV text (it doesn't survive the auth boundary).

import { useEffect, useRef } from 'react'
import { useContent } from '../../i18n'
import { useStore } from '../hooks'
import { BigChoice, Button, Input, Label, Textarea } from '../ui'
import { StepFrame, Actions, ErrLine, Spinner, WizardShell, useWizard, wizard, type Step } from '../wizard'
import { runExtractProfile, sendLoginCode, verifyLoginCode } from '../../ai/run'
import { sendMsg } from '../../lib/messaging'
import { markResumeWanted, type Profile } from '../../lib/types'
import * as store from '../../lib/store'
import { WizCtx, answersStep, reviewStep } from './steps'
import { createUploadedResume, readCvPdf } from './cv'

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

interface EntryState {
  door: 'haveCv' | 'noCv' | 'login'
  cvText: string
  cvBase64?: string // the uploaded PDF, kept until sign-in (see readCvPdf)
  cvFileName?: string
  name: string // full name typed at signup (split into first/last on save)
  email: string
  otp: string
  isNewAccount?: boolean // set by verify(): a first-ever sign-in for this email
}
const initEntry = (): EntryState => ({ door: 'noCv', cvText: '', name: '', email: '', otp: '' })

// Signup captures ONE "your name" field; split it into the profile's first/last
// on the first space. Fills identity only where it's still blank, so an existing
// value (e.g. from a parsed CV) always wins — the typed name is just a fallback
// so we never end up nameless. `authEmail` seeds identity.email when it's empty.
function seedIdentity(p: Profile, fullName: string, authEmail: string): Profile {
  const name = fullName.trim()
  const sp = name.indexOf(' ')
  const first = sp === -1 ? name : name.slice(0, sp)
  const last = sp === -1 ? '' : name.slice(sp + 1).trim()
  return {
    ...p,
    identity: {
      ...p.identity,
      firstName: p.identity.firstName || first,
      lastName: p.identity.lastName || last,
      email: p.identity.email || authEmail.trim(),
    },
  }
}

interface EntryCtx extends WizCtx {
  /** Signed in but built no resume in this flow (login / no-CV) — just close;
   *  the App router lands them on Home, where the "build" CTA still shows. */
  exit: () => void
  sendCode: (email: string) => Promise<void>
  verify: (email: string, otp: string) => Promise<{ isNewAccount: boolean }>
  extract: (cvText: string, cvBase64: string | undefined, cvFileName: string | undefined, name: string, authEmail: string) => Promise<void>
  onPdf: (file: File) => Promise<{ cvText: string; cvBase64: string; cvFileName: string }>
}

const welcome: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => (
    <StepFrame title={ctx.t.welcomeTitle} lead={ctx.t.welcomeLead}>
      <div className="flex flex-col gap-2.5">
        <BigChoice title={<>{ctx.t.importCvTitle}</>} sub={<>{ctx.t.importCvSub}</>} onClick={() => api.goto('paste', { door: 'haveCv' })} />
        <BigChoice title={<>{ctx.t.startBlankTitle}</>} sub={<>{ctx.t.startBlankSub}</>} onClick={() => api.goto('email', { door: 'noCv' })} />
      </div>
      <Actions>
        <Button variant="link" onClick={() => api.goto('email', { door: 'login' })}>{ctx.t.welcomeLoginLink}</Button>
      </Actions>
    </StepFrame>
  ),
}

const paste: Step<EntryState, EntryCtx> = {
  next: 'email',
  view: ({ api, ctx }) => {
    const fileRef = useRef<HTMLInputElement>(null)
    const s = api.state
    return (
      <StepFrame title={ctx.t.pasteTitle} lead={ctx.t.pasteLead}>
        <div className="flex flex-col gap-2.5">
          <BigChoice
            title={<>{api.busy && <Spinner />}{api.busy ? ctx.t.readingCv : ctx.t.uploadPdf}</>}
            sub={<>{api.busy ? ctx.t.readingCloudSub : ctx.t.uploadSubIdle}</>}
            disabled={api.busy}
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void api.run(() => ctx.onPdf(f))
              e.target.value = ''
            }}
          />
          <Textarea
            className="min-h-[150px] resize-y leading-normal"
            placeholder={ctx.t.pastePlaceholder}
            value={s.cvText}
            onChange={(e) => api.set({ cvText: e.target.value })}
            spellCheck={false}
          />
        </div>
        <ErrLine msg={api.error} />
        <Actions>
          <Button disabled={api.busy || s.cvText.trim().length < 50} onClick={() => api.next()}>{ctx.t.buildProfile}</Button>
          <Button variant="link" onClick={() => api.next()}>{ctx.t.skip}</Button>
        </Actions>
      </StepFrame>
    )
  },
}

const email: Step<EntryState, EntryCtx> = {
  next: 'code',
  view: ({ api, ctx }) => {
    const s = api.state
    // Returning users (login door) give email only; the two signup doors also
    // capture a name so every new account/profile has one to build a CV from.
    const isSignup = s.door !== 'login'
    const nameOk = !isSignup || s.name.trim().length > 0
    const ready = emailOk(s.email) && nameOk
    const send = () => api.run(() => ctx.sendCode(s.email.trim()), 'code')
    return (
      <StepFrame
        title={s.door === 'login' ? ctx.t.loginTitle : ctx.t.verifyTitle}
        lead={s.door === 'login' ? ctx.t.loginLead : ctx.t.verifyLead}
      >
        {isSignup && (
          <Label className="mb-2.5">{ctx.t.yourName}
            <Input
              type="text"
              placeholder={ctx.t.yourNamePlaceholder}
              value={s.name}
              autoFocus
              onChange={(e) => api.set({ name: e.target.value })}
            /></Label>
        )}
        <Label className="mb-2.5">{ctx.t.email}
          <Input
            type="email"
            placeholder={ctx.t.emailPlaceholder}
            value={s.email}
            autoFocus={!isSignup}
            onChange={(e) => api.set({ email: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !api.busy && ready) void send() }}
          /></Label>
        <ErrLine msg={api.error} />
        <Actions>
          <Button disabled={api.busy || !ready} onClick={() => void send()}>{api.busy ? ctx.t.sending : ctx.t.sendCode}</Button>
        </Actions>
      </StepFrame>
    )
  },
}

const code: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => {
    const s = api.state
    // After auth: has-CV with real text → structure it; everyone else ends here
    // and the App router takes over. reset:true so Back can't re-enter the OTP.
    const verify = () =>
      api.run(
        () => ctx.verify(s.email.trim(), s.otp),
        (st) => (st.door === 'haveCv' && st.cvText.trim().length >= 50 ? 'building' : 'end'),
        { reset: true },
      )
    // The code IS the screen — verify the moment all six digits are in.
    useEffect(() => {
      if (!api.busy && s.otp.length === 6) void verify()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [s.otp])
    return (
      <StepFrame busy={api.busy} busyTitle={ctx.t.checking} title={ctx.t.inboxTitle} lead={ctx.t.inboxLead(s.email.trim())}>
        <Label className="mb-2.5">{ctx.t.codeLabel}
          <Input
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder={ctx.t.codePlaceholder}
            value={s.otp}
            autoFocus
            onChange={(e) => api.set({ otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !api.busy && s.otp.trim().length >= 4) void verify() }}
          /></Label>
        <ErrLine msg={api.error} />
        <Actions>
          <Button disabled={api.busy || s.otp.trim().length < 4} onClick={() => void verify()}>{api.busy ? ctx.t.checking : ctx.t.verifyStart}</Button>
          <Button variant="link" disabled={api.busy} onClick={() => void api.run(() => ctx.sendCode(s.email.trim()))}>{ctx.t.resendCode}</Button>
          <Button variant="link" disabled={api.busy} onClick={() => api.back()}>{ctx.t.changeEmail}</Button>
        </Actions>
      </StepFrame>
    )
  },
}

// Transient: structure the pasted CV, then hand off to review. Entered with a
// cleared history, so there's no Back into the (now signed-in) OTP screen.
const building: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => {
    const run = () =>
      api.run(() => ctx.extract(api.state.cvText, api.state.cvBase64, api.state.cvFileName, api.state.name, api.state.email), 'review', { reset: true })
    useEffect(() => {
      void run()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return (
      <StepFrame title={<>{api.busy && <Spinner />}{ctx.t.buildingTitle}</>} lead={api.error ? undefined : ctx.t.buildingLead}>
        {api.error && (
          <>
            <ErrLine msg={api.error} />
            <Actions>
              <Button disabled={api.busy} onClick={() => void run()}>{ctx.t.buildProfile}</Button>
              <Button variant="link" disabled={api.busy} onClick={ctx.finish}>{ctx.t.skip}</Button>
            </Actions>
          </>
        )}
      </StepFrame>
    )
  },
}

// login / noCv / empty-CV terminal: set the "help wanted" flag when it applies,
// then end the wizard; the App router takes over. verify() already ran cloudPull,
// so this write lands on top of the freshly-pulled profile.
const end: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => {
    useEffect(() => {
      const s = api.state
      // We offer the guided builder to the "no CV" door, and to a brand-new
      // account signing in through the Log-in door (treated as door 2). A has-CV
      // door or an existing login keeps its own state (default: no help).
      const wantsHelp = s.door === 'noCv' || (s.door === 'login' && !!s.isNewAccount)
      void (async () => {
        // Signup doors typed a name — seed it onto the freshly-pulled profile so
        // the builder (and CV) always have a name. The login door has no name.
        if (s.door !== 'login' && s.name.trim()) await store.update('profile', (p) => seedIdentity(p, s.name, s.email))
        if (wantsHelp) await store.update('profile', markResumeWanted)
        ctx.exit()
      })()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
    return <StepFrame busy title={ctx.t.checking} />
  },
}

const entryWizard = wizard<EntryState, EntryCtx>('welcome', {
  welcome,
  paste,
  email,
  code,
  building,
  review: reviewStep<EntryState>('answers'),
  end,
  answers: answersStep<EntryState>(),
})

export function EntryWizard({ onDone }: { onDone: (builtProfile?: boolean) => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings] = useStore('settings')
  const t = useContent('onboarding')

  const ctx: EntryCtx = {
    t,
    finish: () => {
      // Reached only via the has-CV path; extract() already saved + intaked the
      // CV. No help flag — arriving with a CV is the path that skips the builder.
      // A profile was just built, so land on Profile.
      onDone(true)
    },
    // Login / no-CV terminal: nothing was built here — land on Home.
    exit: () => onDone(false),
    sendCode: (e) => sendLoginCode(settings, e),
    verify: async (e, otp) => {
      const { isNewAccount } = await verifyLoginCode(settings, e, otp) // wipes another account's cache on mismatch
      await sendMsg({ type: 'cloudPull' }) // load THIS account's data from the server
      return { isNewAccount }
    },
    extract: async (cvText, cvBase64, cvFileName, name, authEmail) => {
      // Post-verify: create the resume now so it belongs to THIS account (and
      // syncs up), resume first so it survives even if the AI pass fails.
      if (cvBase64 && cvFileName) {
        const id = await createUploadedResume(cvBase64, cvFileName)
        void sendMsg({ type: 'intakeResume', resumeId: id })
      }
      const extracted = await runExtractProfile(settings, cvText)
      // Spread the existing profile first so the extract keeps `onboarding`; the
      // CV's identity wins, and the typed name/email backfill only what it left
      // blank (so a CV that missed the name is never left nameless).
      saveProfile(seedIdentity({ ...profile, ...extracted, facts: profile.facts }, name, authEmail))
    },
    onPdf: (file) => readCvPdf(file, settings),
  }

  const { view, canBack, busy, back } = useWizard(entryWizard, ctx, initEntry())
  return (
    <WizardShell canBack={canBack} disabled={busy} onBack={back} backLabel={t.back}>
      {view}
    </WizardShell>
  )
}
