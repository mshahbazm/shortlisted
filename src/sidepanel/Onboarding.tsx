import { useRef, useState } from 'react'
import { useStore } from './hooks'
import { runExtractProfile } from '../ai/run'
import { assessTextQuality, extractPdfTextFromFile } from '../lib/pdfText'
import { masterVariant, renderResumePdf } from '../pdf/resumePdf'
import { uid } from '../lib/types'

// One question per screen. The user hands us everything up front;
// the app reveals itself afterwards.

type Step = 'welcome' | 'key' | 'paste' | 'review' | 'answers' | 'done'

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [profile, saveProfile] = useStore('profile')
  const [settings, saveSettings] = useStore('settings')
  const [resumes, saveResumes] = useStore('resumes')

  const [step, setStep] = useState<Step>('welcome')
  const [cvText, setCvText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [key, setKey] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onPdf = async (file: File) => {
    setErr('')
    setBusy(true)
    try {
      const text = await extractPdfTextFromFile(file)
      setCvText(text)
      if (assessTextQuality(text) === 'low') {
        setErr('This PDF reads poorly — possibly a scanned or heavily designed document. Check the text below, or paste it yourself.')
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const STEPS: Step[] = ['welcome', 'key', 'paste', 'review', 'answers', 'done']
  const idx = STEPS.indexOf(step)

  const finish = () => {
    saveSettings({ ...settings, onboarded: true })
    onDone()
  }

  const runImport = async () => {
    setErr('')
    setBusy(true)
    try {
      const s = key.trim()
        ? { ...settings, aiProvider: 'anthropic' as const, anthropicKey: key.trim() }
        : settings
      if (key.trim()) saveSettings({ ...s, onboarded: false })
      const extracted = await runExtractProfile(s, cvText)
      saveProfile({ ...extracted, facts: profile.facts })
      setStep('review')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const chooseCloud = () => {
    saveSettings({ ...settings, aiProvider: 'cloud', onboarded: false })
    setStep('paste')
  }

  const generateCv = () => {
    try {
      const variant = masterVariant(profile)
      const base64 = renderResumePdf(profile, variant)
      const name = `${profile.identity.firstName}-${profile.identity.lastName}-CV.pdf`.replace(/\s+/g, '-')
      saveResumes([
        ...resumes,
        {
          id: uid(), label: 'Master CV', fileName: name, tags: ['master'],
          isDefault: resumes.length === 0, createdAt: Date.now(), source: 'generated',
          dataBase64: base64, content: variant,
        },
      ])
    } catch {
      // non-fatal — they can generate later from the CVs tab
    }
    finish()
  }

  const setFact = (k: keyof typeof profile.facts, v: string) =>
    saveProfile({ ...profile, facts: { ...profile.facts, [k]: v } })
  const setIdentity = (k: keyof typeof profile.identity, v: string) =>
    saveProfile({ ...profile, identity: { ...profile.identity, [k]: v } })

  return (
    <div className="wizard">
      <div className="steps">
        {STEPS.slice(0, 5).map((s, i) => <i key={s} className={i <= idx ? 'on' : ''} />)}
      </div>

      {step === 'welcome' && (
        <>
          <h1>Let's get you shortlisted.</h1>
          <p className="lead">
            Tell me about yourself once. Then every job application fills itself —
            you just review and hit submit.
          </p>
          <button className="bigchoice" onClick={() => setStep(settings.aiProvider === 'none' ? 'key' : 'paste')}>
            <div className="bt">Import my CV</div>
            <div className="bs">Paste your resume text — AI turns it into your profile. ~1 minute.</div>
          </button>
          <button className="bigchoice" onClick={() => setStep('answers')}>
            <div className="bt">Start blank</div>
            <div className="bs">Type your details by hand in the Profile tab.</div>
          </button>
          <div className="actions">
            <button className="link" onClick={finish}>Skip setup</button>
          </div>
        </>
      )}

      {step === 'key' && (
        <>
          <h1>Pick your AI.</h1>
          <p className="lead">
            Reading your CV and tailoring it per job needs AI. Two honest options:
          </p>
          <button className="bigchoice" onClick={chooseCloud}>
            <div className="bt">Shortlisted Cloud — no key, just works</div>
            <div className="bs">
              10 free AI credits. Your CV text is processed only to do the task —
              never stored, never sold, never used for training.
            </div>
          </button>
          <label className="f" style={{ marginTop: 6 }}><span>…or bring your own key (Anthropic; more providers in Settings)</span>
            <input
              type="password" placeholder="sk-ant-…" value={key}
              onChange={(e) => setKey(e.target.value)}
            /></label>
          <div className="actions">
            <button className="primary" disabled={!key.trim()} onClick={() => setStep('paste')}>Use my key</button>
            <button className="link" onClick={() => setStep('answers')}>I'll do it manually</button>
          </div>
        </>
      )}

      {step === 'paste' && (
        <>
          <h1>Your CV, please.</h1>
          <p className="lead">Upload the PDF — I read it right here on your computer. Or paste the text.</p>
          <button className="bigchoice" onClick={() => fileRef.current?.click()}>
            <div className="bt">{cvText ? 'Got it ✓ — pick a different PDF' : 'Upload PDF'}</div>
            <div className="bs">{cvText ? `${cvText.length.toLocaleString()} characters read` : 'Parsed locally, never uploaded anywhere.'}</div>
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
            placeholder="…or paste your resume text here."
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            style={{ minHeight: 110 }}
          />
          {err && <p className="error">{err}</p>}
          <div className="actions">
            <button className="primary" disabled={busy || cvText.trim().length < 50} onClick={runImport}>
              {busy ? 'Reading your CV…' : 'Build my profile'}
            </button>
            <button className="link" onClick={() => setStep('answers')}>Skip</button>
          </div>
        </>
      )}

      {step === 'review' && (
        <>
          <h1>Did I get this right?</h1>
          <p className="lead">
            Found {profile.work.length} role{profile.work.length === 1 ? '' : 's'} and{' '}
            {profile.skills.length} skills. Fix anything that's off — the rest is editable later.
          </p>
          <div className="row">
            <label className="f"><span>First name</span>
              <input type="text" value={profile.identity.firstName} onChange={(e) => setIdentity('firstName', e.target.value)} /></label>
            <label className="f"><span>Last name</span>
              <input type="text" value={profile.identity.lastName} onChange={(e) => setIdentity('lastName', e.target.value)} /></label>
          </div>
          <label className="f"><span>Email</span>
            <input type="text" value={profile.identity.email} onChange={(e) => setIdentity('email', e.target.value)} /></label>
          <div className="row">
            <label className="f"><span>Phone</span>
              <input type="text" value={profile.identity.phone} onChange={(e) => setIdentity('phone', e.target.value)} /></label>
            <label className="f"><span>Location</span>
              <input type="text" value={profile.identity.location} onChange={(e) => setIdentity('location', e.target.value)} /></label>
          </div>
          <div className="actions">
            <button className="primary" onClick={() => setStep('answers')}>Looks right</button>
          </div>
        </>
      )}

      {step === 'answers' && (
        <>
          <h1>Three questions every job asks.</h1>
          <p className="lead">Answer once here, never again on an application.</p>
          <label className="f"><span>Salary expectation</span>
            <input
              type="text" placeholder='"$4,000/month" or "Open to discussion"'
              value={profile.facts.salaryExpectation ?? ''}
              onChange={(e) => setFact('salaryExpectation', e.target.value)} autoFocus
            /></label>
          <label className="f"><span>When can you start?</span>
            <input
              type="text" placeholder='"Immediately" or "2 weeks notice"'
              value={profile.facts.noticePeriod ?? ''}
              onChange={(e) => setFact('noticePeriod', e.target.value)}
            /></label>
          <label className="f"><span>Do you need visa sponsorship?</span>
            <input
              type="text" placeholder='"No — remote contractor"'
              value={profile.facts.needsSponsorship ?? ''}
              onChange={(e) => setFact('needsSponsorship', e.target.value)}
            /></label>
          <div className="actions">
            <button className="primary" onClick={() => setStep('done')}>Continue</button>
            <button className="link" onClick={() => setStep('done')}>Skip</button>
          </div>
        </>
      )}

      {step === 'done' && (
        <>
          <h1>You're set.</h1>
          <p className="lead">
            Open any job posting and hit "Fill this application" in the little panel
            that appears. Anything I can't answer, I'll ask you once — then never again.
          </p>
          {profile.work.length > 0 ? (
            <div className="actions">
              <button className="primary" onClick={generateCv}>Generate my CV & start</button>
              <button className="link" onClick={finish}>Start without a CV</button>
            </div>
          ) : (
            <div className="actions">
              <button className="primary" onClick={finish}>Start</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
