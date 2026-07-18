import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Section } from '../components'
import { StorageShape, storageDefaults } from '../../lib/types'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../../i18n'
import { CLOUD_URL_DEFAULT } from '../../lib/config'
import { CloudUsage, cloudUsage, sendLoginCode, verifyLoginCode } from '../../ai/run'
import { sendMsg } from '../../lib/messaging'

export function SettingsTab() {
  const t = useContent('settings')
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
      setMsg(t.imported)
    } catch (e) {
      setMsg(t.importFailed(e instanceof Error ? e.message : String(e)))
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
      <h2>{t.title}</h2>
      <p className="hint">{t.hint}</p>

      <Section title={t.languageTitle} summary={isLocale(s.locale) ? LOCALE_LABELS[s.locale] : t.languageAuto}>
        <label className="f"><span>{t.languageTitle}</span>
          <select
            value={isLocale(s.locale) ? s.locale : 'auto'}
            onChange={(e) => set({ locale: e.target.value === 'auto' ? undefined : e.target.value })}
          >
            <option value="auto">{t.languageAuto}</option>
            {LOCALES.map((code) => (
              <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
            ))}
          </select>
        </label>
      </Section>

      <Section
        title={t.accountTitle}
        summary={s.accountEmail ?? t.notSignedIn}
        defaultOpen={!s.accountEmail}
      >
        <AccountPanel />
      </Section>

      <Section title={t.backupTitle} summary={t.backupSummary}>
        <div className="row">
          <button className="ghost small" onClick={exportAll}>{t.exportJson}</button>
          <button className="ghost small" onClick={() => importRef.current?.click()}>{t.importJson}</button>
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
        title={t.cloudServerTitle}
        summary={s.cloudUrl?.trim() ? s.cloudUrl : t.cloudServerDefault(CLOUD_URL_DEFAULT)}
      >
        <label className="f"><span>{t.cloudServerLabel(CLOUD_URL_DEFAULT)}</span>
          <input
            type="url"
            value={s.cloudUrl}
            placeholder={CLOUD_URL_DEFAULT}
            onChange={(e) => set({ cloudUrl: e.target.value, cloudToken: undefined })}
          /></label>
      </Section>

      <Section title={t.rulesTitle} summary={t.rulesSummary}>
        <p className="microhint">{t.rulesBody}</p>
      </Section>
    </div>
  )
}

function AccountPanel() {
  const t = useContent('settings')
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
      setMsg(t.codeSent)
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
      setMsg(t.signedIn)
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
          <p className="microhint">{t.accountIntro}</p>
          <label className="f"><span>{t.email}</span>
            <input
              type="email" placeholder={t.emailPlaceholder} value={email}
              onChange={(e) => setEmail(e.target.value)}
            /></label>
          {!codeSent ? (
            <button className="primary small" disabled={busy || !email.trim()} onClick={sendCode}>
              {busy ? t.sending : t.sendCode}
            </button>
          ) : (
            <>
              <label className="f"><span>{t.codeLabel}</span>
                <input
                  type="text" inputMode="numeric" placeholder={t.codePlaceholder} value={otp}
                  onChange={(e) => setOtp(e.target.value)} autoFocus
                /></label>
              <div className="row">
                <button className="primary small" disabled={busy || !otp.trim()} onClick={verify}>
                  {busy ? t.checking : t.signIn}
                </button>
                <button className="link small" disabled={busy} onClick={sendCode}>{t.resendCode}</button>
              </div>
            </>
          )}
        </>
      )}

      {signedIn && (
        <>
          <p className="microhint">{t.signedInAs(settings.accountEmail!)}</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="ghost small" onClick={refresh}>{t.checkCredits}</button>
          </div>
          {usage && (
            <p className="microhint">
              {t.usageLine(
                usage.plan === 'pro' ? t.planPro : t.planFree,
                usage.creditsUsed,
                usage.creditsLimit,
                usage.plan === 'pro',
              )}
            </p>
          )}
          <button
            className="link small" style={{ marginTop: 6 }}
            onClick={() => saveSettings({ ...settings, accountEmail: undefined, cloudToken: undefined })}
          >
            {t.signOutDevice}
          </button>
        </>
      )}
      {msg && <p className="microhint">{msg}</p>}
    </div>
  )
}
