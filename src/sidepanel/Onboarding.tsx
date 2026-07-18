import { useEffect, useRef, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { cloudParseResumePdf, runExtractProfile, sendLoginCode, verifyLoginCode } from '../ai/run'
import { sendMsg } from '../lib/messaging'

// One question per screen. The user hands us everything up front;
// the app reveals itself afterwards.

type Step = 'welcome' | 'paste' | 'review' | 'answers' | 'done' | 'login'

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings, saveSettings] = useStore('settings')
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
  const fileRef = useRef<HTMLInputElement>(null)

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
      // Send the PDF itself — the server deep-reads it (OCR for scanned
      // resumes) and returns the finished profile in one step.
      const { profile: extracted } = await cloudParseResumePdf(settings, await file.arrayBuffer())
      saveProfile({ ...extracted, facts: profile.facts })
      go('review')
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
    saveSettings({ ...settings, onboarded: true })
    onDone()
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
      void sendMsg({ type: 'cloudPull' })
      finish()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const runImport = async () => {
    setErr('')
    setBusy(true)
    try {
      const extracted = await runExtractProfile(settings, cvText)
      saveProfile({ ...extracted, facts: profile.facts })
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
    <div className="wizard">
      <div className="steps">
        {STEPS.map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}
        {trail.length > 0 && (
          <button className="wizback" onClick={back} disabled={busy || pdfBusy}>{t.back}</button>
        )}
      </div>

      {step === 'welcome' && (
        <>
          <h1>{t.welcomeTitle}</h1>
          <p className="lead">{t.welcomeLead}</p>
          <button className="bigchoice" onClick={() => go('paste')}>
            <div className="bt">{t.importCvTitle}</div>
            <div className="bs">{t.importCvSub}</div>
          </button>
          <button className="bigchoice" onClick={() => go('answers')}>
            <div className="bt">{t.startBlankTitle}</div>
            <div className="bs">{t.startBlankSub}</div>
          </button>
          <div className="actions">
            <button className="link" onClick={() => go('login')}>{t.welcomeLoginLink}</button>
          </div>
        </>
      )}

      {step === 'login' && !codeSent && (
        <>
          <h1>{t.loginTitle}</h1>
          <p className="lead">{t.loginLead}</p>
          <label className="f"><span>{t.email}</span>
            <input
              type="email" placeholder={t.emailPlaceholder} value={acctEmail}
              onChange={(e) => setAcctEmail(e.target.value)} autoFocus
            /></label>
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button
              className="primary"
              disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acctEmail.trim())}
              onClick={sendCode}
            >
              {busy ? t.sending : t.sendCode}
            </button>
          </div>
        </>
      )}

      {step === 'login' && codeSent && (
        <>
          <h1>{t.inboxTitle}</h1>
          <p className="lead">{t.inboxLead(acctEmail.trim())}</p>
          <label className="f"><span>{t.codeLabel}</span>
            <input
              inputMode="numeric" autoComplete="one-time-code" placeholder={t.codePlaceholder}
              value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus
            /></label>
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" disabled={busy || otp.trim().length < 4} onClick={verifyCode}>
              {busy ? t.checking : t.verifyStart}
            </button>
            <button className="link" disabled={busy} onClick={sendCode}>{t.resendCode}</button>
            <button className="link" disabled={busy} onClick={() => { setCodeSent(false); setErr('') }}>
              {t.changeEmail}
            </button>
          </div>
        </>
      )}

      {step === 'paste' && (
        <>
          <h1>{t.pasteTitle}</h1>
          <p className="lead">{t.pasteLead}</p>
          <button className="bigchoice" disabled={pdfBusy} onClick={() => fileRef.current?.click()}>
            <div className="bt">
              {pdfBusy && <span className="spin" />}
              {pdfBusy ? t.readingCv : cvText ? t.uploadAgain : t.uploadPdf}
            </div>
            <div className="bs">
              {pdfBusy ? t.readingCloudSub : cvText ? t.charsRead(cvText.length) : t.uploadSubIdle}
            </div>
          </button>
          <input
            ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPdf(f)
              e.target.value = ''
            }}
          />
          <textarea
            placeholder={t.pastePlaceholder}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            style={{ minHeight: 110 }}
          />
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" disabled={busy || pdfBusy || cvText.trim().length < 50} onClick={runImport}>
              {busy ? t.readingCv : t.buildProfile}
            </button>
            <button className="link" onClick={() => go('answers')}>{t.skip}</button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <h1>{t.reviewTitle}</h1>
          <p className="lead">{t.reviewLead(profile.work.length, profile.skills.length)}</p>
          <div className="row">
            <label className="f"><span>{t.firstName}</span>
              <input type="text" value={profile.identity.firstName} onChange={(e) => setIdentity('firstName', e.target.value)} /></label>
            <label className="f"><span>{t.lastName}</span>
              <input type="text" value={profile.identity.lastName} onChange={(e) => setIdentity('lastName', e.target.value)} /></label>
          </div>
          <label className="f"><span>{t.email}</span>
            <input type="text" value={profile.identity.email} onChange={(e) => setIdentity('email', e.target.value)} /></label>
          <div className="row">
            <label className="f"><span>{t.phone}</span>
              <input type="text" value={profile.identity.phone} onChange={(e) => setIdentity('phone', e.target.value)} /></label>
            <label className="f"><span>{t.location}</span>
              <input type="text" value={profile.identity.location} onChange={(e) => setIdentity('location', e.target.value)} /></label>
          </div>
          <div className="actions">
            <button className="primary" onClick={() => go('answers')}>{t.looksRight}</button>
          </div>
        </>
      )}

      {step === 'answers' && (
        <>
          <h1>{t.answersTitle}</h1>
          <p className="lead">{t.answersLead}</p>
          <label className="f"><span>{t.salaryLabel}</span>
            <input
              type="text" placeholder={t.salaryPlaceholder}
              value={profile.facts.salaryExpectation ?? ''}
              onChange={(e) => setFact('salaryExpectation', e.target.value)} autoFocus
            /></label>
          <label className="f"><span>{t.noticeLabel}</span>
            <input
              type="text" placeholder={t.noticePlaceholder}
              value={profile.facts.noticePeriod ?? ''}
              onChange={(e) => setFact('noticePeriod', e.target.value)}
            /></label>
          <label className="f"><span>{t.sponsorshipLabel}</span>
            <input
              type="text" placeholder={t.sponsorshipPlaceholder}
              value={profile.facts.needsSponsorship ?? ''}
              onChange={(e) => setFact('needsSponsorship', e.target.value)}
            /></label>
          <div className="actions">
            <button className="primary" onClick={() => go('done')}>{t.continue}</button>
            <button className="link" onClick={() => go('done')}>{t.skip}</button>
          </div>
        </>
      )}

      {step === 'done' && !codeSent && (
        <>
          <h1>{t.verifyTitle}</h1>
          <p className="lead">{t.verifyLead}</p>
          <label className="f"><span>{t.email}</span>
            <input
              type="email" placeholder={t.emailPlaceholder} value={acctEmail}
              onChange={(e) => setAcctEmail(e.target.value)} autoFocus
            /></label>
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button
              className="primary"
              disabled={busy || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acctEmail.trim())}
              onClick={sendCode}
            >
              {busy ? t.sending : t.sendCode}
            </button>
          </div>
        </>
      )}

      {step === 'done' && codeSent && (
        <>
          <h1>{t.inboxTitle}</h1>
          <p className="lead">{t.inboxLead(acctEmail.trim())}</p>
          <label className="f"><span>{t.codeLabel}</span>
            <input
              inputMode="numeric" autoComplete="one-time-code" placeholder={t.codePlaceholder}
              value={otp} onChange={(e) => setOtp(e.target.value)} autoFocus
            /></label>
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" disabled={busy || otp.trim().length < 4} onClick={verifyCode}>
              {busy ? t.checking : t.verifyStart}
            </button>
            <button className="link" disabled={busy} onClick={sendCode}>{t.resendCode}</button>
            <button className="link" disabled={busy} onClick={() => { setCodeSent(false); setErr('') }}>
              {t.changeEmail}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
