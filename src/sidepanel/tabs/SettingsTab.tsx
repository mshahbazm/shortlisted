import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Section } from '../components'
import { StorageShape, storageDefaults } from '../../lib/types'
import { CLOUD_URL_DEFAULT } from '../../lib/config'
import { CloudUsage, cloudUsage, sendLoginCode, verifyLoginCode } from '../../ai/run'
import { sendMsg } from '../../lib/messaging'

export function SettingsTab() {
  const [settings, saveSettings] = useStore('settings')
  const importRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const s = settings
  const set = (patch: Partial<typeof s>) => saveSettings({ ...s, ...patch })

  const importAll = async (file: File) => {
    setMsg('')
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Partial<StorageShape>
      const defaults = storageDefaults()
      const known: (keyof StorageShape)[] = ['profile', 'answerBank', 'pendingQuestions', 'resumes', 'applications', 'queue', 'settings']
      const toSet: Record<string, unknown> = {}
      for (const k of known) if (data[k] !== undefined) toSet[k] = data[k] ?? defaults[k]
      await chrome.storage.local.set(toSet)
      setMsg('Imported.')
    } catch (e) {
      setMsg(`Import failed: ${e instanceof Error ? e.message : e}`)
    }
  }

  const exportAll = async () => {
    const all = await chrome.storage.local.get(null)
    const a = document.createElement('a')
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(all, null, 2))
    a.download = `shortlisted-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <div>
      <h2>Settings</h2>
      <p className="hint">Filling works with no setup. Your account unlocks AI (CV import, tailoring, fit scores).</p>

      <Section
        title="Account"
        summary={s.accountEmail ?? 'not signed in'}
        defaultOpen={!s.accountEmail}
      >
        <AccountPanel />
      </Section>

      <Section title="Backup" summary="export / import everything">
        <div className="row">
          <button className="ghost small" onClick={exportAll}>Export JSON</button>
          <button className="ghost small" onClick={() => importRef.current?.click()}>Import JSON</button>
        </div>
        <input
          ref={importRef} type="file" accept="application/json" style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void importAll(f)
            e.target.value = ''
          }}
        />
        {msg && <p className="microhint">{msg}</p>}
      </Section>

      <Section
        title="Cloud server"
        summary={s.cloudUrl?.trim() ? s.cloudUrl : `${CLOUD_URL_DEFAULT} (default)`}
      >
        <label className="f"><span>Custom URL — leave empty for the default ({CLOUD_URL_DEFAULT})</span>
          <input
            type="url"
            value={s.cloudUrl}
            placeholder={CLOUD_URL_DEFAULT}
            onChange={(e) => set({ cloudUrl: e.target.value, cloudToken: undefined })}
          /></label>
      </Section>

      <Section title="The rules" summary="no auto-submit, no lies">
        <p className="microhint">
          You click submit — always. CAPTCHAs are yours. CV tailoring only rearranges
          what's true — it cannot invent skills or experience.
        </p>
      </Section>
    </div>
  )
}

function AccountPanel() {
  const [settings, saveSettings] = useStore('settings')
  const [usage, setUsage] = useState<CloudUsage | null>(null)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const signedIn = Boolean(settings.accountEmail)

  const refresh = async () => {
    setMsg('')
    try {
      setUsage(await cloudUsage(settings))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    if (signedIn) void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn])

  const sendCode = async () => {
    setMsg('')
    setBusy(true)
    try {
      await sendLoginCode(settings, email.trim())
      setCodeSent(true)
      setMsg('Code sent — check your email.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const verify = async () => {
    setMsg('')
    setBusy(true)
    try {
      const res = await verifyLoginCode(settings, email.trim(), otp.trim())
      setUsage(res)
      setOtp('')
      setCodeSent(false)
      // Load this account's data from the server (or push local data up).
      await sendMsg({ type: 'cloudPull' })
      setMsg('Signed in.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginTop: 4 }}>
      {!signedIn && (
        <>
          <p className="microhint">
            Sign in with your email to unlock AI and keep your data in your
            account. Free: 10 credits. Pro ($9/mo): 100 credits/month.
          </p>
          <label className="f"><span>Email</span>
            <input
              type="email" placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
            /></label>
          {!codeSent ? (
            <button className="primary small" disabled={busy || !email.trim()} onClick={sendCode}>
              {busy ? 'Sending…' : 'Send me a code'}
            </button>
          ) : (
            <>
              <label className="f"><span>The 6-digit code from your email</span>
                <input
                  type="text" inputMode="numeric" placeholder="123456" value={otp}
                  onChange={(e) => setOtp(e.target.value)} autoFocus
                /></label>
              <div className="row">
                <button className="primary small" disabled={busy || !otp.trim()} onClick={verify}>
                  {busy ? 'Checking…' : 'Sign in'}
                </button>
                <button className="link small" disabled={busy} onClick={sendCode}>Resend code</button>
              </div>
            </>
          )}
        </>
      )}

      {signedIn && (
        <>
          <p className="microhint">Signed in as <b>{settings.accountEmail}</b>.</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost small" onClick={refresh}>Check my credits</button>
          </div>
          {usage && (
            <p className="microhint">
              {usage.plan === 'pro' ? 'Pro' : 'Free'} · {usage.creditsUsed} of {usage.creditsLimit} credits used
              {usage.plan === 'free' ? ' (lifetime)' : ' this month'}
            </p>
          )}
          <button
            className="link small" style={{ marginTop: 6 }}
            onClick={() => saveSettings({ ...settings, accountEmail: undefined, cloudToken: undefined })}
          >
            Sign out on this device
          </button>
        </>
      )}
      {msg && <p className="microhint">{msg}</p>}
    </div>
  )
}
