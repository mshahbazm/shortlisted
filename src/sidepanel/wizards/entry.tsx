// Wizard A — "Let's get you shortlisted". Shown until the extension is set up.
// A branching graph: the welcome screen forks two ways (import a CV / start
// blank), and both doors pass through the same name + AI-setup steps.
//
// The third door used to be "log in", and the shared middle used to be an email
// OTP. There is no account to log into now — the equivalent gate is having an
// AI endpoint, because that is what everything downstream actually needs. The
// has-CV door still continues through building → review → answers in one run,
// since those steps depend on the in-memory CV text.

import { useEffect, useRef, useState } from 'react'
import { useContent } from '../../i18n'
import { useStore } from '../hooks'
import { BigChoice, Button, Input, Label, Textarea } from '../ui'
import { StepFrame, Actions, ErrLine, Spinner, WizardShell, useWizard, wizard, type Step, type StepApi } from '../wizard'
import { runExtractProfile } from '../../ai/run'
import { sendMsg } from '../../lib/messaging'
import { AiSetup } from '../AiSetup'
import { sendSignup } from '../../lib/signup'
import { aiConfigured, markResumeWanted, type Profile, type Settings } from '../../lib/types'
import * as store from '../../lib/store'
import { startAt } from '../../lib/onboarding'
import { WizCtx, answersStep, reviewStep } from './steps'

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())
import { createUploadedResume, readCvPdf } from './cv'

interface EntryState {
  door: 'haveCv' | 'noCv'
  cvText: string
  cvBase64?: string // the uploaded PDF, carried to the end of the flow
  cvFileName?: string
  firstName: string
  lastName: string
  /** Typed on the name step. Sent to the mailing list, never stored on the
   *  profile — the profile's own email comes from the CV or the user editing
   *  it, and conflating the two would put a marketing address on their CV. */
  email: string
}
// Seeded from the stored profile rather than blank, so anyone who reaches this
// screen a second time is not retyping a name we already hold.
const initEntry = (p: Profile, s: Settings): EntryState => ({
  door: s.onboardingDoor ?? 'noCv',
  cvText: '',
  firstName: p.identity.firstName ?? '',
  lastName: p.identity.lastName ?? '',
  email: '',
})


// Seed the typed name onto identity, filling only fields that are still blank —
// so an existing value (e.g. from a parsed CV) always wins and the typed name is
// just a fallback that keeps us from ever being nameless.
function seedIdentity(p: Profile, firstName: string, lastName: string): Profile {
  return {
    ...p,
    identity: {
      ...p.identity,
      firstName: p.identity.firstName || firstName.trim(),
      lastName: p.identity.lastName || lastName.trim(),
    },
  }
}

interface EntryCtx extends WizCtx {
  /** The `ai` namespace — the AI-setup step shares its wording with Settings. */
  ta: ReturnType<typeof useContent<'ai'>>
  /** Persist the typed name the moment the step is left, not at the end of the
   *  flow. Without this, `startAt` reads a blank profile on the next open and
   *  sends the user back to a screen they already filled in. */
  rememberName: (firstName: string, lastName: string) => void
  /** Record the welcome answer, then move on. Written before navigating so an
   *  immediately-closed panel still remembers which door was taken. */
  pickDoor: (door: 'haveCv' | 'noCv', api: StepApi<EntryState>) => void
  /** Hand the typed name + address to the mailing list. Best-effort and never
   *  awaited by the UI — a list outage must not stand between a user and their
   *  CV. Only called from the Continue button, never from the skip. */
  signUp: (firstName: string, lastName: string, email: string) => Promise<void>
  /** Built no resume in this flow (the no-CV door) — just close; the App router
   *  lands them on Home, where the "build" CTA still shows. */
  exit: () => void
  extract: (cvText: string, cvBase64: string | undefined, cvFileName: string | undefined, firstName: string, lastName: string) => Promise<void>
  onPdf: (file: File) => Promise<{ cvText: string; cvBase64: string; cvFileName: string }>
}

const welcome: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => (
    <StepFrame title={ctx.t.welcomeTitle} lead={ctx.t.welcomeLead}>
      <div className="flex flex-col gap-2.5">
        <BigChoice title={<>{ctx.t.importCvTitle}</>} sub={<>{ctx.t.importCvSub}</>} onClick={() => ctx.pickDoor('haveCv', api)} />
        <BigChoice title={<>{ctx.t.startBlankTitle}</>} sub={<>{ctx.t.startBlankSub}</>} onClick={() => ctx.pickDoor('noCv', api)} />
      </div>
    </StepFrame>
  ),
}

const paste: Step<EntryState, EntryCtx> = {
  next: 'name',
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

// The name, asked once. It used to ride along with the signup email; there is
// no signup any more, but a profile with no name still cannot produce a CV, so
// the question stays and the email goes.
// Two asks on one screen, and they are not the same kind of thing.
//
// The NAME is needed locally — it goes on the CV, and a profile without one
// cannot produce a document. The EMAIL is for us: updates, and the occasional
// question about how it is going. Keeping them on one screen keeps the flow
// short; keeping them clearly labelled is what stops that from being a trick.
//
// Deliberately not called an account. There is no password and nothing to sign
// in to, and "create your account" would imply that installing on a second
// machine brings your data along — it does not, and the support load from that
// misunderstanding would cost more than the signups are worth.
//
// The skip is quiet but real: plain grey, one click, and it continues with the
// email discarded. Small is a hierarchy decision. Hidden would be a dark
// pattern, and on an open-source privacy tool that is the sort of thing that
// ends up as the top comment on the launch thread.
const name: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => {
    const s = api.state
    const [settings] = useStore('settings')
    const [emailErr, setEmailErr] = useState('')
    const ready = s.firstName.trim().length > 0
    // Asked once, ever. If they gave it before, the field and its note are
    // gone entirely — a prefilled address they cannot meaningfully change is
    // just clutter, and asking again reads as though the first time failed.
    const askEmail = !settings.signedUpAt
    // Both paths go to the same place. The only difference is whether the
    // address travels, which is exactly what the two labels say.
    //
    // A typo'd address is caught here rather than dropped on the floor. The
    // sender ignores anything that isn't an address, so without this check a
    // mistyped email would look accepted and simply never arrive — the user
    // would believe they had signed up. An EMPTY field is not an error: that
    // is the same choice as the skip link, just made by not typing.
    const go = (withEmail: boolean) => {
      const email = s.email.trim()
      if (withEmail && email && !emailOk(email)) {
        setEmailErr(ctx.t.emailInvalid)
        return
      }
      if (withEmail && email) void ctx.signUp(s.firstName, s.lastName, email)
      ctx.rememberName(s.firstName, s.lastName)
      api.goto('ai', withEmail ? {} : { email: '' })
    }
    return (
      <StepFrame title={ctx.t.nameTitle} lead={ctx.t.nameLead}>
        <div className="mb-2.5 flex flex-col gap-2.5">
          <Label>{ctx.t.firstName}
            <Input type="text" value={s.firstName} autoFocus onChange={(e) => api.set({ firstName: e.target.value })} /></Label>
          <Label>{ctx.t.lastName}
            <Input type="text" value={s.lastName} onChange={(e) => api.set({ lastName: e.target.value })} /></Label>
        </div>
        {askEmail && (
          <>
            <Label className="mb-1.5">{ctx.t.emailLabel}
              <Input
                type="email"
                spellCheck={false}
                placeholder={ctx.t.emailPlaceholder}
                value={s.email}
                onChange={(e) => { setEmailErr(''); api.set({ email: e.target.value }) }}
                onKeyDown={(e) => { if (e.key === 'Enter' && ready) go(true) }}
              /></Label>
            <p className="mt-0 mb-1 text-[11px] leading-[1.45] text-faint">{ctx.t.emailWhy}</p>
          </>
        )}
        <ErrLine msg={emailErr || api.error} />
        <Actions>
          <Button disabled={api.busy || !ready} onClick={() => go(true)}>{ctx.t.continue}</Button>
          {askEmail && (
            <button
              type="button"
              disabled={api.busy || !ready}
              className="cursor-pointer border-0 bg-transparent p-0 text-[11px] text-faint underline hover:text-muted disabled:cursor-default disabled:opacity-50"
              onClick={() => go(false)}
            >
              {ctx.t.emailSkip}
            </button>
          )}
        </Actions>
      </StepFrame>
    )
  },
}

// Where sign-in used to be. Everything past this point needs a model, so this
// is the one gate the flow cannot route around — but it CAN be deferred: the
// skip link leaves the extension usable for everything that isn't AI (the
// profile editor, the answer bank, autofill from what you've already saved).
const ai: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => {
    const [settings] = useStore('settings')
    // `building` runs the extractor, so it is only a valid destination when
    // there is a model to run it on. Skipping without one has to land on `end`
    // instead — otherwise the user chooses "set this up later" and is handed
    // an error screen for the thing they just declined.
    //
    // `hasAi` is passed in rather than read from `settings` here: AiSetup has
    // only just written, and this hook's copy can still be a tick behind.
    const go = (hasAi: boolean) =>
      api.goto(
        hasAi && api.state.door === 'haveCv' && api.state.cvText.trim().length >= 50 ? 'building' : 'end',
        {},
        { reset: true },
      )
    return (
      <StepFrame title={ctx.ta.title} lead={ctx.ta.lead}>
        <AiSetup onSaved={() => go(true)} saveLabel={ctx.ta.continue} />
        <Actions>
          <Button variant="link" onClick={() => go(aiConfigured(settings))}>
            {aiConfigured(settings) ? ctx.t.skip : ctx.ta.skipForNow}
          </Button>
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
      api.run(() => ctx.extract(api.state.cvText, api.state.cvBase64, api.state.cvFileName, api.state.firstName, api.state.lastName), 'review', { reset: true })
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

// noCv / empty-CV terminal: set the "help wanted" flag when it applies, then
// end the wizard and let the App router take over.
const end: Step<EntryState, EntryCtx> = {
  view: ({ api, ctx }) => {
    useEffect(() => {
      const s = api.state
      // The guided builder is offered to the "no CV" door only — arriving with
      // a CV is the path that skips it.
      const wantsHelp = s.door === 'noCv'
      void (async () => {
        if (s.firstName.trim()) await store.update('profile', (p) => seedIdentity(p, s.firstName, s.lastName))
        if (wantsHelp) await store.update('profile', markResumeWanted)
        // Reaching `end` with a PDF in hand means the user uploaded one and
        // then skipped the AI setup — `extract` (which normally saves it) never
        // ran. Save it anyway: they handed us a file and would not expect it to
        // vanish. Only ask for the background read if there is a model to do it
        // with, so the CV list doesn't open on a card marked failed.
        if (s.cvBase64 && s.cvFileName) {
          const id = await createUploadedResume(s.cvBase64, s.cvFileName)
          if (aiConfigured(await store.get('settings'))) void sendMsg({ type: 'intakeResume', resumeId: id })
        }
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
  name,
  ai,
  building,
  review: reviewStep<EntryState>('answers'),
  end,
  answers: answersStep<EntryState>(),
})

export function EntryWizard({ onDone }: { onDone: (builtProfile?: boolean) => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings] = useStore('settings')
  const t = useContent('onboarding')
  const ta = useContent('ai')

  // Onboarding is done once the wizard closes, whichever door was taken — the
  // App router reads this flag, so without the write the welcome screen comes
  // straight back.
  const done = (builtProfile: boolean) => {
    void store.update('settings', (x) => ({ ...x, onboarded: true }))
    onDone(builtProfile)
  }

  const ctx: EntryCtx = {
    t,
    ta,
    finish: () => {
      // Reached only via the has-CV path; extract() already saved + intaked the
      // CV. No help flag — arriving with a CV is the path that skips the builder.
      // A profile was just built, so land on Profile.
      done(true)
    },
    // Login / no-CV terminal: nothing was built here — land on Home.
    exit: () => done(false),
    rememberName: (firstName, lastName) => {
      if (!firstName.trim()) return
      void store.update('profile', (p) => seedIdentity(p, firstName, lastName))
    },
    pickDoor: (door, api) => {
      void store.update('settings', (x) => ({ ...x, onboardingDoor: door }))
      api.goto(door === 'haveCv' ? 'paste' : 'name', { door })
    },
    signUp: async (firstName, lastName, email) => {
      // Only on a real send. A failed post leaves the flag unset so a later
      // run can try again, rather than silently never asking a second time.
      if (await sendSignup({ firstName, lastName, email })) {
        await store.update('settings', (x) => ({ ...x, signedUpAt: Date.now() }))
      }
    },
    extract: async (cvText, cvBase64, cvFileName, firstName, lastName) => {
      // Save the resume first, so it survives even if the AI pass fails.
      if (cvBase64 && cvFileName) {
        const id = await createUploadedResume(cvBase64, cvFileName)
        void sendMsg({ type: 'intakeResume', resumeId: id })
      }
      const extracted = await runExtractProfile(settings, cvText)
      // Spread the existing profile first so the extract keeps `onboarding`; the
      // CV's identity wins, and the typed name backfills only what it left blank
      // (so a CV that missed the name is never left nameless).
      saveProfile(seedIdentity({ ...profile, ...extracted, facts: profile.facts }, firstName, lastName))
    },
    onPdf: (file) => readCvPdf(file),
  }

  const { view, canBack, busy, back } = useWizard(
    { ...entryWizard, initial: startAt(profile, settings) },
    ctx,
    initEntry(profile, settings),
  )
  return (
    <WizardShell canBack={canBack} disabled={busy} onBack={back} backLabel={t.back}>
      {view}
    </WizardShell>
  )
}
