import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { BigChoice, Button, Input, Label, Select, Textarea } from './ui'
import { useStore } from './hooks'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../i18n'
import { cloudPdfText, runExtractProfile, sendLoginCode, verifyLoginCode } from '../ai/run'
import { assessTextQuality, extractPdfTextFromFile } from '../lib/pdfText'
import { sendMsg } from '../lib/messaging'
import { bytesToBase64, uid } from '../lib/types'
import * as store from '../lib/store'

// One question per screen. The user hands us everything up front;
// the app reveals itself afterwards.

type Step = 'welcome' | 'paste' | 'review' | 'answers' | 'done' | 'login'

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings] = useStore('settings')
  const t = useContent('onboarding')

  const [step, setStep] = useState<Step>('welcome')
  const [trail, setTrail] = useState<Step[]>([])
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
  const fileRef = useRef<HTMLInputElement>(null)
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
    setTrail((prev) => {
      const last = prev[prev.length - 1]
      if (last) setStep(last)
      return prev.slice(0, -1)
    })
    setErr('')
  }

  const STEPS: Step[] = ['welcome', 'paste', 'review', 'answers', 'done']
  const idx = STEPS.indexOf(step)

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
      if (step === 'login' || cvText.trim().length < 50) {
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
      go('review')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const setFact = (k: keyof typeof profile.facts, v: string) =>
    saveProfile({ ...profile, facts: { ...profile.facts, [k]: v } })
  const setIdentity = (k: keyof typeof profile.identity, v: string) =>
    saveProfile({ ...profile, identity: { ...profile.identity, [k]: v } })

  return (
    <div className="relative flex min-h-full w-full flex-col">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 min-h-0 flex-col justify-center overflow-y-auto px-[26px] pt-8 pb-10">
        <div className="mb-[30px] flex items-center gap-1.5">
          {STEPS.map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}
          {trail.length > 0 && (
            <button className="ml-auto cursor-pointer border-0 bg-transparent p-0 text-[12.5px] text-muted hover:text-fg disabled:cursor-default disabled:opacity-50" onClick={back} disabled={busy || pdfBusy}>{t.back}</button>
          )}
        </div>

        {step === 'welcome' && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.welcomeTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.welcomeLead}</p>
            <div className="flex flex-col gap-2.5">
              <BigChoice
                title={<>{t.importCvTitle}</>}
                sub={<>{t.importCvSub}</>}
                onClick={() => go('paste')}
              />
              {/* No CV: don't interrogate them yet — sign them in first, the app
                  helps build the profile and CV from inside. */}
              <BigChoice
                title={<>{t.startBlankTitle}</>}
                sub={<>{t.startBlankSub}</>}
                onClick={() => go('done')}
              />
            </div>
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button variant="link" onClick={() => go('login')}>{t.welcomeLoginLink}</Button>
            </div>
          </>
        )}

        {step === 'login' && !codeSent && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.loginTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.loginLead}</p>
            <Label className="mb-2.5">{t.email}
              <Input
                type="email" placeholder={t.emailPlaceholder} value={acctEmail}
                onChange={(e) => setAcctEmail(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acctEmail.trim())) sendCode() }}
              /></Label>
            {err && <p className="my-2 text-[13px] text-bad">{err}</p>}
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acctEmail.trim())}
                onClick={sendCode}>
                {busy ? t.sending : t.sendCode}
              </Button>
            </div>
          </>
        )}

        {step === 'login' && codeSent && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.inboxTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.inboxLead(acctEmail.trim())}</p>
            <Label className="mb-2.5">{t.codeLabel}
              <Input
                inputMode="numeric" autoComplete="one-time-code" placeholder={t.codePlaceholder}
                value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy && otp.trim().length >= 4) verifyCode() }}
              /></Label>
            {err && <p className="my-2 text-[13px] text-bad">{err}</p>}
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button disabled={busy || otp.trim().length < 4} onClick={verifyCode}>
                {busy ? t.checking : t.verifyStart}
              </Button>
              <Button variant="link" disabled={busy} onClick={sendCode}>{t.resendCode}</Button>
              <Button variant="link" disabled={busy} onClick={() => { setCodeSent(false); setErr('') }}>
                {t.changeEmail}
              </Button>
            </div>
          </>
        )}

        {step === 'paste' && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.pasteTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.pasteLead}</p>
            <div className="flex flex-col gap-2.5">
              <BigChoice
                title={<>{pdfBusy && <span className="mr-[7px] inline-block size-3 animate-spin rounded-full border-2 border-line border-t-fg align-[-1px]" />}
                  {pdfBusy ? t.readingCv : t.uploadPdf}</>}
                sub={<>{pdfBusy ? t.readingCloudSub : t.uploadSubIdle}</>}
                disabled={pdfBusy} onClick={() => fileRef.current?.click()}
              />
              <input
                ref={fileRef} type="file" accept="application/pdf" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onPdf(f)
                  e.target.value = ''
                }}
              />
              <Textarea className={"min-h-[150px] resize-y leading-normal"}
                placeholder={t.pastePlaceholder}
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                spellCheck={false}
              />
            </div>
            {err && <p className="my-2 text-[13px] text-bad">{err}</p>}
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button disabled={pdfBusy || cvText.trim().length < 50} onClick={() => go('done')}>
                {t.buildProfile}
              </Button>
              <Button variant="link" onClick={() => go('done')}>{t.skip}</Button>
            </div>
          </>
        )}

        {step === 'review' && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.reviewTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.reviewLead(profile.work.length, profile.skills.length)}</p>
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
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button onClick={() => go('answers')}>{t.looksRight}</Button>
            </div>
          </>
        )}

        {step === 'answers' && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.answersTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.answersLead}</p>
            <Label className="mb-2.5">{t.salaryLabel}
              <Input
                type="text" placeholder={t.salaryPlaceholder}
                value={profile.facts.salaryExpectation ?? ''}
                onChange={(e) => setFact('salaryExpectation', e.target.value)} autoFocus
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
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button onClick={finish}>{t.continue}</Button>
              <Button variant="link" onClick={finish}>{t.skip}</Button>
            </div>
          </>
        )}

        {step === 'done' && signedUp && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{busy && <span className="mr-[7px] inline-block size-3 animate-spin rounded-full border-2 border-line border-t-fg align-[-1px]" />}{t.buildingTitle}</h1>
            {!err && <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.buildingLead}</p>}
            {err && (
              <>
                <p className="my-2 text-[13px] text-bad">{err}</p>
                <div className="mt-[22px] flex items-center gap-2.5">
                  <Button disabled={busy} onClick={extractAndReview}>{t.buildProfile}</Button>
                  <Button variant="link" disabled={busy} onClick={finish}>{t.skip}</Button>
                </div>
              </>
            )}
          </>
        )}

        {step === 'done' && !signedUp && !codeSent && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.verifyTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.verifyLead}</p>
            <Label className="mb-2.5">{t.email}
              <Input
                type="email" placeholder={t.emailPlaceholder} value={acctEmail}
                onChange={(e) => setAcctEmail(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acctEmail.trim())) sendCode() }}
              /></Label>
            {err && <p className="my-2 text-[13px] text-bad">{err}</p>}
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acctEmail.trim())}
                onClick={sendCode}>
                {busy ? t.sending : t.sendCode}
              </Button>
            </div>
          </>
        )}

        {step === 'done' && !signedUp && codeSent && (
          <>
            <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{t.inboxTitle}</h1>
            <p className="mb-[26px] text-sm leading-relaxed text-muted">{t.inboxLead(acctEmail.trim())}</p>
            <Label className="mb-2.5">{t.codeLabel}
              <Input
                inputMode="numeric" autoComplete="one-time-code" placeholder={t.codePlaceholder}
                value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter' && !busy && otp.trim().length >= 4) verifyCode() }}
              /></Label>
            {err && <p className="my-2 text-[13px] text-bad">{err}</p>}
            <div className="mt-[22px] flex items-center gap-2.5">
              <Button disabled={busy || otp.trim().length < 4} onClick={verifyCode}>
                {busy ? t.checking : t.verifyStart}
              </Button>
              <Button variant="link" disabled={busy} onClick={sendCode}>{t.resendCode}</Button>
              <Button variant="link" disabled={busy} onClick={() => { setCodeSent(false); setErr('') }}>
                {t.changeEmail}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Pinned to the panel corner (not the content flow) so it stays put
          across every step instead of trailing whatever the last step renders. */}
      <div className="absolute right-3 bottom-3">
        <LocaleSwitcher />
      </div>
    </div>
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
