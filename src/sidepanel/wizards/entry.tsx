// Wizard A — "Let's get you shortlisted". Shown when logged out. A branching
// graph: the welcome screen forks three ways (import a CV / start blank / log
// in), and email OTP is shared by all three. After auth the wizard ends
// (ctx.finish) and the App router decides Home vs the Build wizard — except the
// has-CV door, which continues through building → review → answers because those
// steps depend on the in-memory CV text (it doesn't survive the auth boundary).

import { MutableRefObject, useEffect, useRef } from 'react'
import { useContent } from '../../i18n'
import { useStore } from '../hooks'
import { BigChoice, Button, Input, Label, Textarea } from '../ui'
import { StepFrame, Actions, ErrLine, Spinner, WizardShell, useWizard, wizard, type Step } from '../wizard'
import { cloudPdfText, runExtractProfile, sendLoginCode, verifyLoginCode } from '../../ai/run'
import { assessTextQuality, extractPdfTextFromFile } from '../../lib/pdfText'
import { sendMsg } from '../../lib/messaging'
import { Profile, Settings, bytesToBase64, uid } from '../../lib/types'
import * as store from '../../lib/store'
import { WizCtx, answersStep } from './steps'

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

interface EntryState {
  door: 'haveCv' | 'noCv' | 'login'
  cvText: string
  email: string
  otp: string
}
const initEntry = (): EntryState => ({ door: 'noCv', cvText: '', email: '', otp: '' })

interface EntryCtx extends WizCtx {
  profile: Profile
  setIdentity: (k: keyof Profile['identity'], v: string) => void
  sendCode: (email: string) => Promise<void>
  verify: (email: string, otp: string) => Promise<void>
  extract: (cvText: string) => Promise<void>
  onPdf: (file: File) => Promise<{ cvText: string }>
}

// Read a CV PDF's text (local layer, cloud OCR fallback) and keep the file as the
// user's first resume — re-uploading replaces it rather than stacking copies.
// No AI, no credit; the text is structured only after the account exists.
async function readCvPdf(file: File, settings: Settings, resumeIdRef: MutableRefObject<string | null>): Promise<string> {
  const buf = await file.arrayBuffer()
  const local = await extractPdfTextFromFile(file).catch(() => '')
  const text = local && assessTextQuality(local) !== 'low' ? local : (await cloudPdfText(settings, buf)).text
  const base64 = bytesToBase64(buf)
  await store.update('resumes', (resumes) => {
    const rest = resumes.filter((r) => r.id !== resumeIdRef.current)
    const id = uid()
    resumeIdRef.current = id
    return [
      ...rest,
      {
        id,
        label: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        tags: [],
        isDefault: rest.length === 0 || rest.every((r) => !r.isDefault),
        createdAt: Date.now(),
        source: 'uploaded' as const,
        dataBase64: base64,
      },
    ]
  })
  return text
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
    const ok = emailOk(s.email)
    const send = () => api.run(() => ctx.sendCode(s.email.trim()), 'code')
    return (
      <StepFrame
        title={s.door === 'login' ? ctx.t.loginTitle : ctx.t.verifyTitle}
        lead={s.door === 'login' ? ctx.t.loginLead : ctx.t.verifyLead}
      >
        <Label className="mb-2.5">{ctx.t.email}
          <Input
            type="email"
            placeholder={ctx.t.emailPlaceholder}
            value={s.email}
            autoFocus
            onChange={(e) => api.set({ email: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !api.busy && ok) void send() }}
          /></Label>
        <ErrLine msg={api.error} />
        <Actions>
          <Button disabled={api.busy || !ok} onClick={() => void send()}>{api.busy ? ctx.t.sending : ctx.t.sendCode}</Button>
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
    const run = () => api.run(() => ctx.extract(api.state.cvText), 'review', { reset: true })
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

const review: Step<EntryState, EntryCtx> = {
  next: 'answers',
  view: ({ api, ctx }) => {
    const p = ctx.profile
    return (
      <StepFrame title={ctx.t.reviewTitle} lead={ctx.t.reviewLead(p.work.length, p.skills.length)}>
        <div className="flex gap-2.5 [&>*]:flex-1">
          <Label className="mb-2.5">{ctx.t.firstName}
            <Input type="text" value={p.identity.firstName} onChange={(e) => ctx.setIdentity('firstName', e.target.value)} /></Label>
          <Label className="mb-2.5">{ctx.t.lastName}
            <Input type="text" value={p.identity.lastName} onChange={(e) => ctx.setIdentity('lastName', e.target.value)} /></Label>
        </div>
        <Label className="mb-2.5">{ctx.t.email}
          <Input type="text" value={p.identity.email} onChange={(e) => ctx.setIdentity('email', e.target.value)} /></Label>
        <div className="flex gap-2.5 [&>*]:flex-1">
          <Label className="mb-2.5">{ctx.t.phone}
            <Input type="text" value={p.identity.phone} onChange={(e) => ctx.setIdentity('phone', e.target.value)} /></Label>
          <Label className="mb-2.5">{ctx.t.location}
            <Input type="text" value={p.identity.location} onChange={(e) => ctx.setIdentity('location', e.target.value)} /></Label>
        </div>
        <Actions>
          <Button onClick={() => api.next()}>{ctx.t.looksRight}</Button>
        </Actions>
      </StepFrame>
    )
  },
}

// login / noCv / empty-CV terminal: end the wizard; the App router takes over.
const end: Step<EntryState, EntryCtx> = {
  view: ({ ctx }) => {
    useEffect(() => {
      ctx.finish()
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
  review,
  end,
  answers: answersStep<EntryState>(),
})

export function EntryWizard({ onDone }: { onDone: () => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings] = useStore('settings')
  const t = useContent('onboarding')
  const resumeId = useRef<string | null>(null)

  const ctx: EntryCtx = {
    t,
    profile,
    finish: () => {
      // The account exists now — tag the wizard's kept CV so its facts fold in.
      if (resumeId.current) void sendMsg({ type: 'intakeResume', resumeId: resumeId.current })
      onDone()
    },
    setIdentity: (k, v) => saveProfile({ ...profile, identity: { ...profile.identity, [k]: v } }),
    sendCode: (e) => sendLoginCode(settings, e),
    verify: async (e, otp) => {
      await verifyLoginCode(settings, e, otp)
      await sendMsg({ type: 'cloudPull' }) // load the account's data from the server
    },
    extract: async (cvText) => {
      const extracted = await runExtractProfile(settings, cvText)
      saveProfile({ ...extracted, facts: profile.facts })
    },
    onPdf: async (file) => ({ cvText: await readCvPdf(file, settings, resumeId) }),
  }

  const { view, canBack, busy, back } = useWizard(entryWizard, ctx, initEntry())
  return (
    <WizardShell canBack={canBack} disabled={busy} onBack={back} backLabel={t.back}>
      {view}
    </WizardShell>
  )
}
