import { ReactNode, useEffect, useRef, useState } from 'react'
import { BackButton, BigChoice, Button, Input, Label, Select, Textarea } from './ui'
import { useStore } from './hooks'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../i18n'
import { cloudPdfText, runBuildProfile, runExtractProfile, sendLoginCode, verifyLoginCode } from '../ai/run'
import { assessTextQuality, extractPdfTextFromFile } from '../lib/pdfText'
import { sendMsg } from '../lib/messaging'
import { Profile, bytesToBase64, uid } from '../lib/types'
import * as store from '../lib/store'

// One question per screen. Each step is its own component below (a heading and
// its fields can never drift apart); this parent owns only the state machine
// and hands the current step whatever it needs.

type Step = 'welcome' | 'build' | 'talk' | 'probe' | 'paste' | 'review' | 'answers' | 'done' | 'login'
type Content = ReturnType<typeof useContent<'onboarding'>>

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings] = useStore('settings')
  const t = useContent('onboarding')

  const [step, setStep] = useState<Step>('welcome')
  const [trail, setTrail] = useState<Step[]>([])
  // Which door the no-CV path came through. It only changes the wording of the
  // "tell me about your work" screen, so it stays in local state, not the profile.
  const [persona, setPersona] = useState<'starting' | 'working'>('working')
  // The no-CV path signs the user in FIRST, then runs the guided builder — so we
  // remember which door was taken to branch correctly after email verification.
  const [noCv, setNoCv] = useState(false)
  // No-CV builder: the AI's follow-up questions become one dynamic step each;
  // `probeIndex` is which question we're on, `answers` is index-aligned.
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [probeIndex, setProbeIndex] = useState(0)
  const [cvText, setCvText] = useState('')
  const [busy, setBusy] = useState(false)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [err, setErr] = useState('')
  const [acctEmail, setAcctEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  // True between sign-up and the AI finishing the profile (the CV text is
  // only sent for structuring once the account exists).
  const [signedUp, setSignedUp] = useState(false)
  // The resume created from the wizard upload — re-uploading replaces it
  // instead of stacking copies.
  const wizardResumeId = useRef<string | null>(null)

  // The account screen opens with the email the CV parse found — the user has
  // already seen it on the review step, so prefilling reads as consistent, not
  // creepy. Still fully editable (CVs carry stale addresses).
  useEffect(() => {
    if (step === 'done' && !acctEmail && profile.identity.email) setAcctEmail(profile.identity.email)
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const onPdf = async (file: File) => {
    setErr('')
    setPdfBusy(true)
    try {
      const buf = await file.arrayBuffer()
      // No AI before sign-up: read the text layer locally; if it reads poorly
      // (scanned or heavily designed PDFs), the server OCRs it — still no LLM,
      // no credit. The text is structured only after the account exists.
      const local = await extractPdfTextFromFile(file).catch(() => '')
      if (local && assessTextQuality(local) !== 'low') {
        setCvText(local)
      } else {
        const { text } = await cloudPdfText(settings, buf)
        setCvText(text)
      }
      // Keep the file itself: it becomes the user's first resume, so their
      // real CV is ready to attach on the very first application.
      const base64 = bytesToBase64(buf)
      await store.update('resumes', (resumes) => {
        const rest = resumes.filter((r) => r.id !== wizardResumeId.current)
        const id = uid()
        wizardResumeId.current = id
        return [
          ...rest,
          {
            id,
            label: file.name.replace(/\.pdf$/i, ''),
            fileName: file.name,
            tags: [],
            isDefault: rest.length === 0 || rest.every((r) => !r.isDefault),
            createdAt: Date.now(),
            source: 'uploaded',
            dataBase64: base64,
          },
        ]
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setPdfBusy(false)
    }
  }

  // Navigate forward remembering where we came from; back pops the trail.
  // The flow branches (paste can skip to answers, login sits aside), so back
  // must follow the path actually taken, not the step order.
  const go = (s: Step) => {
    setTrail((prev) => [...prev, step])
    setStep(s)
  }
  const back = () => {
    // Inside the dynamic question steps, "back" walks to the previous question
    // rather than leaving the probe entirely.
    if (step === 'probe' && probeIndex > 0) {
      setProbeIndex((i) => i - 1)
      setErr('')
      return
    }
    setTrail((prev) => {
      const last = prev[prev.length - 1]
      if (last) setStep(last)
      return prev.slice(0, -1)
    })
    setErr('')
  }

  const finish = () => {
    // The account exists now — tag the wizard's kept CV and fold any facts
    // the profile build missed (additive, background).
    if (wizardResumeId.current) void sendMsg({ type: 'intakeResume', resumeId: wizardResumeId.current })
    // Read-modify-write against live storage — the settings object in this
    // closure may predate verifyLoginCode saving accountEmail.
    void store.update('settings', (s) => ({ ...s, onboarded: true })).then(onDone)
  }

  const sendCode = async () => {
    setErr('')
    setBusy(true)
    try {
      await sendLoginCode(settings, acctEmail)
      setCodeSent(true)
      setOtp('')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    setErr('')
    setBusy(true)
    try {
      await verifyLoginCode(settings, acctEmail, otp)
      // Load the account's data from the server (or push this device's up).
      await sendMsg({ type: 'cloudPull' })
      if (step === 'login') {
        finish()
        return
      }
      // No-CV path: the account comes first, THEN the guided resume builder.
      // Clear the trail so there's no "back" into the email screen they just cleared.
      if (noCv) {
        setTrail([])
        setStep('build')
        return
      }
      if (cvText.trim().length < 50) {
        finish()
        return
      }
      // Signed up with a CV waiting — NOW the AI may structure it.
      setSignedUp(true)
      void extractAndReview()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const extractAndReview = async () => {
    setErr('')
    setBusy(true)
    try {
      const extracted = await runExtractProfile(settings, cvText)
      saveProfile({ ...extracted, facts: profile.facts })
      setSignedUp(false)
      // Has-CV only now: they can confirm the parse of their own CV.
      go('review')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  // No-CV builder (workflow-backed): free-form text -> a starting profile + a few
  // tailored follow-up questions. Answering them re-runs to enrich; skipping keeps
  // the base profile. The raw text + answers are kept server-side on profile.sources.
  const buildFromFreeform = async (withAnswers?: { q: string; a: string }[]) => {
    setErr('')
    setBusy(true)
    try {
      const { profile: built, questions: qs } = await runBuildProfile(settings, cvText, persona, withAnswers)
      saveProfile({ ...built, facts: profile.facts })
      if (!withAnswers && qs.length > 0) {
        setQuestions(qs)
        setAnswers([])
        setProbeIndex(0)
        go('probe')
      } else {
        go('answers')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const setFact = (k: keyof Profile['facts'], v: string) =>
    saveProfile({ ...profile, facts: { ...profile.facts, [k]: v } })
  const setIdentity = (k: keyof Profile['identity'], v: string) =>
    saveProfile({ ...profile, identity: { ...profile.identity, [k]: v } })

  const changeEmail = () => {
    setCodeSent(false)
    setErr('')
  }

  // Each step is a whole component doing its own job; the parent only picks
  // which one to show and wires it to the state machine.
  const stepEl = ((): ReactNode => {
    switch (step) {
      case 'welcome':
        return (
          <WelcomeStep
            t={t}
            onImport={() => { setNoCv(false); go('paste') }}
            onBlank={() => { setNoCv(true); go('done') }}
            onLogin={() => go('login')}
          />
        )
      case 'build':
        return (
          <BuildStep
            t={t}
            onStarting={() => { setPersona('starting'); go('talk') }}
            onWorking={() => { setPersona('working'); go('talk') }}
          />
        )
      case 'talk':
        return (
          <TalkStep
            t={t} persona={persona} cvText={cvText} setCvText={setCvText} busy={busy} err={err}
            onBuild={() => void buildFromFreeform()} onSkip={finish}
          />
        )
      case 'probe': {
        // Answers the user has actually filled in so far.
        const provided = () =>
          questions.map((q, i) => ({ q, a: answers[i] ?? '' })).filter((x) => x.a.trim().length > 0)
        return (
          <ProbeStep
            t={t}
            question={questions[probeIndex] ?? ''}
            index={probeIndex}
            total={questions.length}
            isLast={probeIndex >= questions.length - 1}
            answer={answers[probeIndex] ?? ''}
            setAnswer={(v) => setAnswers((a) => { const n = [...a]; n[probeIndex] = v; return n })}
            busy={busy}
            err={err}
            onNext={() => {
              if (probeIndex < questions.length - 1) { setProbeIndex(probeIndex + 1); setErr('') }
              else void buildFromFreeform(provided())
            }}
            onSkip={() => { const p = provided(); if (p.length) void buildFromFreeform(p); else go('answers') }}
          />
        )
      }
      case 'paste':
        return (
          <PasteStep
            t={t} cvText={cvText} setCvText={setCvText} pdfBusy={pdfBusy} err={err}
            onFile={onPdf} onBuild={() => go('done')} onSkip={() => go('done')}
          />
        )
      case 'review':
        return <ReviewStep t={t} profile={profile} setIdentity={setIdentity} onNext={() => go('answers')} />
      case 'answers':
        return <AnswersStep t={t} profile={profile} setFact={setFact} onContinue={finish} onSkip={finish} />
      case 'login':
        return codeSent ? (
          <AccountCodeStep
            t={t} sentTo={acctEmail.trim()} otp={otp} setOtp={setOtp} busy={busy} err={err}
            onVerify={verifyCode} onResend={sendCode} onChangeEmail={changeEmail}
          />
        ) : (
          <AccountEmailStep
            t={t} title={t.loginTitle} lead={t.loginLead} email={acctEmail} setEmail={setAcctEmail}
            busy={busy} err={err} onSend={sendCode}
          />
        )
      case 'done':
        if (signedUp) return <BuildingStep t={t} busy={busy} err={err} onRetry={extractAndReview} onSkip={finish} />
        return codeSent ? (
          <AccountCodeStep
            t={t} sentTo={acctEmail.trim()} otp={otp} setOtp={setOtp} busy={busy} err={err}
            onVerify={verifyCode} onResend={sendCode} onChangeEmail={changeEmail}
          />
        ) : (
          <AccountEmailStep
            t={t} title={t.verifyTitle} lead={t.verifyLead} email={acctEmail} setEmail={setAcctEmail}
            busy={busy} err={err} onSend={sendCode}
          />
        )
      default:
        return null
    }
  })()

  return (
    <WizardShell canBack={trail.length > 0} disabled={busy || pdfBusy} onBack={back} backLabel={t.back}>
      {stepEl}
    </WizardShell>
  )
}

// ---------- shared step chrome ----------

/** The panel frame every step renders inside: centred scroll column, a back
 *  chevron when there's history, and the always-pinned language switcher. */
function WizardShell({
  canBack,
  disabled,
  onBack,
  backLabel,
  children,
}: {
  canBack: boolean
  disabled: boolean
  onBack: () => void
  backLabel: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-full w-full flex-col">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 min-h-0 flex-col justify-center overflow-y-auto px-[26px] pt-8 pb-10">
        {canBack && (
          <BackButton
            variant="pill"
            label={backLabel}
            onClick={onBack}
            disabled={disabled}
            className="mb-5 self-start"
          />
        )}
        {children}
      </div>
      <div className="absolute right-3 bottom-3">
        <LocaleSwitcher />
      </div>
    </div>
  )
}

/** Heading + optional lead + body, bound together so they can never drift. */
function StepFrame({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <>
      <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{title}</h1>
      {lead != null && <p className="mb-[26px] text-sm leading-relaxed text-muted">{lead}</p>}
      {children}
    </>
  )
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-[22px] flex items-center gap-2.5">{children}</div>
}

function ErrLine({ msg }: { msg?: string }) {
  return msg ? <p className="my-2 text-[13px] text-bad">{msg}</p> : null
}

const Spinner = () => (
  <span className="mr-[7px] inline-block size-3 animate-spin rounded-full border-2 border-line border-t-fg align-[-1px]" />
)

// ---------- steps ----------

function WelcomeStep({
  t,
  onImport,
  onBlank,
  onLogin,
}: {
  t: Content
  onImport: () => void
  onBlank: () => void
  onLogin: () => void
}) {
  return (
    <StepFrame title={t.welcomeTitle} lead={t.welcomeLead}>
      <div className="flex flex-col gap-2.5">
        <BigChoice title={<>{t.importCvTitle}</>} sub={<>{t.importCvSub}</>} onClick={onImport} />
        {/* No CV: create the account FIRST (email + code), then run the guided
            builder — a resume is what they leave with, so it follows sign-in. */}
        <BigChoice title={<>{t.startBlankTitle}</>} sub={<>{t.startBlankSub}</>} onClick={onBlank} />
      </div>
      <Actions>
        <Button variant="link" onClick={onLogin}>{t.welcomeLoginLink}</Button>
      </Actions>
    </StepFrame>
  )
}

/** No-CV step 1: encouraging reframe that doubles as the persona fork. */
function BuildStep({ t, onStarting, onWorking }: { t: Content; onStarting: () => void; onWorking: () => void }) {
  return (
    <StepFrame title={t.buildTitle} lead={t.buildLead}>
      <div className="flex flex-col gap-2.5">
        <BigChoice title={<>{t.buildStartingTitle}</>} sub={<>{t.buildStartingSub}</>} onClick={onStarting} />
        <BigChoice title={<>{t.buildWorkingTitle}</>} sub={<>{t.buildWorkingSub}</>} onClick={onWorking} />
      </div>
    </StepFrame>
  )
}

/** No-CV step 2: one free-talk box (or the "building" spinner while the AI
 *  structures it — the account already exists, so it runs straight away). */
function TalkStep({
  t,
  persona,
  cvText,
  setCvText,
  busy,
  err,
  onBuild,
  onSkip,
}: {
  t: Content
  persona: 'starting' | 'working'
  cvText: string
  setCvText: (v: string) => void
  busy: boolean
  err: string
  onBuild: () => void
  onSkip: () => void
}) {
  if (busy) {
    return <StepFrame title={<><Spinner />{t.buildingTitle}</>} lead={t.buildingLead} />
  }
  const isNew = persona === 'starting'
  return (
    <StepFrame
      title={isNew ? t.talkStartingTitle : t.talkWorkingTitle}
      lead={isNew ? t.talkStartingLead : t.talkWorkingLead}
    >
      <Textarea
        className="min-h-[168px] resize-y leading-normal"
        placeholder={isNew ? t.talkStartingPlaceholder : t.talkWorkingPlaceholder}
        value={cvText}
        onChange={(e) => setCvText(e.target.value)}
        spellCheck={false}
        autoFocus
      />
      <ErrLine msg={err} />
      <Actions>
        <Button disabled={cvText.trim().length < 50} onClick={onBuild}>{t.buildCv}</Button>
        <Button variant="link" onClick={onSkip}>{t.skip}</Button>
      </Actions>
    </StepFrame>
  )
}

/** No-CV builder: the AI's tailored follow-up questions, ONE per screen — a
 *  dynamic step per question the workflow returned. Shows the "building" wait
 *  while the answers are folded back in. */
function ProbeStep({
  t,
  question,
  index,
  total,
  isLast,
  answer,
  setAnswer,
  busy,
  err,
  onNext,
  onSkip,
}: {
  t: Content
  question: string
  index: number
  total: number
  isLast: boolean
  answer: string
  setAnswer: (v: string) => void
  busy: boolean
  err: string
  onNext: () => void
  onSkip: () => void
}) {
  if (busy) {
    return <StepFrame title={<><Spinner />{t.buildingTitle}</>} lead={t.buildingLead} />
  }
  return (
    <StepFrame title={t.probeTitle} lead={t.probeLead}>
      <div className="mb-1.5 text-[11.5px] font-semibold tracking-wide text-faint">{index + 1} / {total}</div>
      <div className="mb-2.5 text-[15px] font-medium leading-snug">{question}</div>
      <Textarea
        key={index}
        className="min-h-[84px] resize-y leading-normal"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        spellCheck
        autoFocus
      />
      <ErrLine msg={err} />
      <Actions>
        <Button onClick={onNext}>{isLast ? t.buildCv : t.probeNext}</Button>
        <Button variant="link" onClick={onSkip}>{t.skip}</Button>
      </Actions>
    </StepFrame>
  )
}

/** Has-CV intake: upload a PDF or paste the text. */
function PasteStep({
  t,
  cvText,
  setCvText,
  pdfBusy,
  err,
  onFile,
  onBuild,
  onSkip,
}: {
  t: Content
  cvText: string
  setCvText: (v: string) => void
  pdfBusy: boolean
  err: string
  onFile: (f: File) => void
  onBuild: () => void
  onSkip: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <StepFrame title={t.pasteTitle} lead={t.pasteLead}>
      <div className="flex flex-col gap-2.5">
        <BigChoice
          title={<>{pdfBusy && <Spinner />}{pdfBusy ? t.readingCv : t.uploadPdf}</>}
          sub={<>{pdfBusy ? t.readingCloudSub : t.uploadSubIdle}</>}
          disabled={pdfBusy}
          onClick={() => fileRef.current?.click()}
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFile(f)
            e.target.value = ''
          }}
        />
        <Textarea
          className="min-h-[150px] resize-y leading-normal"
          placeholder={t.pastePlaceholder}
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          spellCheck={false}
        />
      </div>
      <ErrLine msg={err} />
      <Actions>
        <Button disabled={pdfBusy || cvText.trim().length < 50} onClick={onBuild}>{t.buildProfile}</Button>
        <Button variant="link" onClick={onSkip}>{t.skip}</Button>
      </Actions>
    </StepFrame>
  )
}

/** Confirm the parsed identity before saving. */
function ReviewStep({
  t,
  profile,
  setIdentity,
  onNext,
}: {
  t: Content
  profile: Profile
  setIdentity: (k: keyof Profile['identity'], v: string) => void
  onNext: () => void
}) {
  return (
    <StepFrame title={t.reviewTitle} lead={t.reviewLead(profile.work.length, profile.skills.length)}>
      <div className="flex gap-2.5 [&>*]:flex-1">
        <Label className="mb-2.5">{t.firstName}
          <Input type="text" value={profile.identity.firstName} onChange={(e) => setIdentity('firstName', e.target.value)} /></Label>
        <Label className="mb-2.5">{t.lastName}
          <Input type="text" value={profile.identity.lastName} onChange={(e) => setIdentity('lastName', e.target.value)} /></Label>
      </div>
      <Label className="mb-2.5">{t.email}
        <Input type="text" value={profile.identity.email} onChange={(e) => setIdentity('email', e.target.value)} /></Label>
      <div className="flex gap-2.5 [&>*]:flex-1">
        <Label className="mb-2.5">{t.phone}
          <Input type="text" value={profile.identity.phone} onChange={(e) => setIdentity('phone', e.target.value)} /></Label>
        <Label className="mb-2.5">{t.location}
          <Input type="text" value={profile.identity.location} onChange={(e) => setIdentity('location', e.target.value)} /></Label>
      </div>
      <Actions>
        <Button onClick={onNext}>{t.looksRight}</Button>
      </Actions>
    </StepFrame>
  )
}

/** The answer-bank seed: things asked on nearly every application. */
function AnswersStep({
  t,
  profile,
  setFact,
  onContinue,
  onSkip,
}: {
  t: Content
  profile: Profile
  setFact: (k: keyof Profile['facts'], v: string) => void
  onContinue: () => void
  onSkip: () => void
}) {
  return (
    <StepFrame title={t.answersTitle} lead={t.answersLead}>
      <Label className="mb-2.5">{t.jobTypeLabel}
        <Input
          type="text" placeholder={t.jobTypePlaceholder}
          value={profile.facts.jobType ?? ''}
          onChange={(e) => setFact('jobType', e.target.value)} autoFocus
        /></Label>
      <Label className="mb-2.5">{t.salaryLabel}
        <Input
          type="text" placeholder={t.salaryPlaceholder}
          value={profile.facts.salaryExpectation ?? ''}
          onChange={(e) => setFact('salaryExpectation', e.target.value)}
        /></Label>
      <Label className="mb-2.5">{t.noticeLabel}
        <Input
          type="text" placeholder={t.noticePlaceholder}
          value={profile.facts.noticePeriod ?? ''}
          onChange={(e) => setFact('noticePeriod', e.target.value)}
        /></Label>
      <Label className="mb-2.5">{t.sponsorshipLabel}
        <Input
          type="text" placeholder={t.sponsorshipPlaceholder}
          value={profile.facts.needsSponsorship ?? ''}
          onChange={(e) => setFact('needsSponsorship', e.target.value)}
        /></Label>
      <Actions>
        <Button onClick={onContinue}>{t.continue}</Button>
        <Button variant="link" onClick={onSkip}>{t.skip}</Button>
      </Actions>
    </StepFrame>
  )
}

/** Email entry — shared by the returning-user login and the mid-flow sign-up. */
function AccountEmailStep({
  t,
  title,
  lead,
  email,
  setEmail,
  busy,
  err,
  onSend,
}: {
  t: Content
  title: ReactNode
  lead: ReactNode
  email: string
  setEmail: (v: string) => void
  busy: boolean
  err: string
  onSend: () => void
}) {
  const ok = emailOk(email)
  return (
    <StepFrame title={title} lead={lead}>
      <Label className="mb-2.5">{t.email}
        <Input
          type="email" placeholder={t.emailPlaceholder} value={email} autoFocus
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy && ok) onSend() }}
        /></Label>
      <ErrLine msg={err} />
      <Actions>
        <Button disabled={busy || !ok} onClick={onSend}>{busy ? t.sending : t.sendCode}</Button>
      </Actions>
    </StepFrame>
  )
}

/** 6-digit code entry — shared by login and sign-up. */
function AccountCodeStep({
  t,
  sentTo,
  otp,
  setOtp,
  busy,
  err,
  onVerify,
  onResend,
  onChangeEmail,
}: {
  t: Content
  sentTo: string
  otp: string
  setOtp: (v: string) => void
  busy: boolean
  err: string
  onVerify: () => void
  onResend: () => void
  onChangeEmail: () => void
}) {
  // The code is the whole point of this screen — the moment all six digits are
  // in (typed or pasted), verify. Making the user also click Verify is a
  // redundant step. onChange keeps otp to at most six digits, so length === 6
  // means "complete"; the busy guard stops a re-fire while a check is in flight.
  useEffect(() => {
    if (!busy && otp.length === 6) onVerify()
  }, [otp]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <StepFrame title={t.inboxTitle} lead={t.inboxLead(sentTo)}>
      <Label className="mb-2.5">{t.codeLabel}
        <Input
          inputMode="numeric" autoComplete="one-time-code" placeholder={t.codePlaceholder}
          value={otp} autoFocus
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter' && !busy && otp.trim().length >= 4) onVerify() }}
        /></Label>
      <ErrLine msg={err} />
      <Actions>
        <Button disabled={busy || otp.trim().length < 4} onClick={onVerify}>{busy ? t.checking : t.verifyStart}</Button>
        <Button variant="link" disabled={busy} onClick={onResend}>{t.resendCode}</Button>
        <Button variant="link" disabled={busy} onClick={onChangeEmail}>{t.changeEmail}</Button>
      </Actions>
    </StepFrame>
  )
}

/** The "structuring your CV" wait, with a retry path if the AI pass fails. */
function BuildingStep({
  t,
  busy,
  err,
  onRetry,
  onSkip,
}: {
  t: Content
  busy: boolean
  err: string
  onRetry: () => void
  onSkip: () => void
}) {
  return (
    <StepFrame title={<>{busy && <Spinner />}{t.buildingTitle}</>} lead={err ? undefined : t.buildingLead}>
      {err && (
        <>
          <ErrLine msg={err} />
          <Actions>
            <Button disabled={busy} onClick={onRetry}>{t.buildProfile}</Button>
            <Button variant="link" disabled={busy} onClick={onSkip}>{t.skip}</Button>
          </Actions>
        </>
      )}
    </StepFrame>
  )
}

/**
 * Always-visible language picker. The default follows the browser language
 * (chrome.i18n); picking one persists in settings.locale and re-renders the
 * whole panel instantly — the wizard is exactly where a wrong auto-detected
 * language must be fixable.
 */
function LocaleSwitcher() {
  const [settings] = useStore('settings')
  const t = useContent('settings')
  return (
    <Select
      className="mx-auto w-auto border-0 bg-transparent px-1.5 py-1 text-xs text-muted hover:text-fg"
      value={isLocale(settings.locale) ? settings.locale : 'auto'}
      onChange={(v) => void store.update('settings', (s) => ({ ...s, locale: v === 'auto' ? undefined : v }))}
      options={[
        { value: 'auto', label: `🌐 ${t.languageAuto}` },
        ...LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] })),
      ]}
    />
  )
}
