import { useEffect, useRef, useState } from 'react'
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
          {/* No CV: don't interrogate them yet — sign them in first, the app
              helps build the profile and CV from inside. */}
          <button className="bigchoice" onClick={() => go('done')}>
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
              {pdfBusy ? t.readingCv : t.uploadPdf}
            </div>
            <div className="bs">{pdfBusy ? t.readingCloudSub : t.uploadSubIdle}</div>
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
            spellCheck={false}
            style={{ minHeight: 110 }}
          />
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" disabled={pdfBusy || cvText.trim().length < 50} onClick={() => go('done')}>
              {t.buildProfile}
            </button>
            <button className="link" onClick={() => go('done')}>{t.skip}</button>
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
            <button className="primary" onClick={finish}>{t.continue}</button>
            <button className="link" onClick={finish}>{t.skip}</button>
          </div>
        </>
      )}

      {step === 'done' && signedUp && (
        <>
          <h1>{busy && <span className="spin" />}{t.buildingTitle}</h1>
          {!err && <p className="lead">{t.buildingLead}</p>}
          {err && (
            <>
              <p className="error">{err}</p>
              <div className="actions">
                <button className="primary" disabled={busy} onClick={extractAndReview}>{t.buildProfile}</button>
                <button className="link" disabled={busy} onClick={finish}>{t.skip}</button>
              </div>
            </>
          )}
        </>
      )}

      {step === 'done' && !signedUp && !codeSent && (
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

      {step === 'done' && !signedUp && codeSent && (
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

      <div className="wizfoot">
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
    <select
      className="langswitch"
      value={isLocale(settings.locale) ? settings.locale : 'auto'}
      onChange={(e) => {
        const v = e.target.value
        void store.update('settings', (s) => ({ ...s, locale: v === 'auto' ? undefined : v }))
      }}
    >
      <option value="auto">🌐 {t.languageAuto}</option>
      {LOCALES.map((code) => (
        <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
      ))}
    </select>
  )
}
