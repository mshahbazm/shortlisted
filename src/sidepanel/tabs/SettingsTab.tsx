import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Body, Row, ScreenHead, useStack } from '../ui'
import { StorageShape, storageDefaults } from '../../lib/types'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../../i18n'
import { CloudUsage, UsageStatsRow, cloudUsage, cloudUsageStats, sendLoginCode, verifyLoginCode } from '../../ai/run'
import { cloudBaseUrl, cloudUrlDefault, isDevInstall } from '../../lib/config'
import { sendMsg } from '../../lib/messaging'

export function SettingsTab({ onClose }: { onClose: () => void }) {
  const t = useContent('settings')
  const nav = useStack()
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

  const importInput = (
    <input
      ref={importRef} type="file" accept="application/json" style={{ display: 'none' }}
      onChange={(e) => {
        const f = e.target.files?.[0]
        if (f) void importAll(f)
        e.target.value = ''
      }}
    />
  )

  if (nav.screen === 'language') {
    return (
      <Screen title={t.languageTitle} onBack={nav.back} t={t}>
        <select
          value={isLocale(s.locale) ? s.locale : 'auto'}
          onChange={(e) => set({ locale: e.target.value === 'auto' ? undefined : e.target.value })}
        >
          <option value="auto">{t.languageAuto}</option>
          {LOCALES.map((code) => (
            <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
          ))}
        </select>
      </Screen>
    )
  }

  if (nav.screen === 'detect') {
    return (
      <Screen title={t.whereILook} onBack={nav.back} t={t}>
        <p className="lede">{t.detectHint}</p>
        <label className="ct-row">
          <input
            type="checkbox"
            checked={s.detectEverywhere !== false}
            onChange={(e) => set({ detectEverywhere: e.target.checked })}
          />
          <span>{t.detectToggle}</span>
        </label>
      </Screen>
    )
  }

  if (nav.screen === 'server') {
    return (
      <Screen title={t.serverTitle} onBack={nav.back} t={t}>
        <p className="lede">{isDevInstall() ? t.serverDevHint : t.serverProdHint}</p>
        <label className="fl">{t.serverUrlLabel}
          <input
            className="fin"
            type="text"
            placeholder={cloudUrlDefault()}
            value={s.cloudUrl ?? ''}
            onChange={(e) => set({ cloudUrl: e.target.value })}
            spellCheck={false}
          />
        </label>
        {s.cloudUrl?.trim() && (
          <button className="ghost wide" onClick={() => set({ cloudUrl: '' })}>{t.serverReset}</button>
        )}
      </Screen>
    )
  }

  if (nav.screen === 'cost') {
    return (
      <Screen title="Dev: real cost" onBack={nav.back} t={t}>
        <DevCosts />
      </Screen>
    )
  }

  if (nav.screen === 'backup') {
    return (
      <Screen title={t.backupTitle} onBack={nav.back} t={t}>
        <p className="lede">{t.backupSummary}</p>
        <div className="duo tight">
          <button className="ghost" onClick={exportAll}>{t.exportJson}</button>
          <button className="ghost" onClick={() => importRef.current?.click()}>{t.importJson}</button>
        </div>
        {importInput}
        {msg && <p className="microhint">{msg}</p>}
      </Screen>
    )
  }

  return (
    <>
      <ScreenHead title={t.title} onBack={onClose} backLabel={t.back} />
      <Body screen={nav.screen}>
        {/* Account leads: this is where the money is. */}
        <AccountPanel />

        <div className="rows nav">
          <Row
            title={t.languageTitle}
            sub={isLocale(s.locale) ? LOCALE_LABELS[s.locale] : t.languageAuto}
            onClick={() => nav.push('language')}
          />
          <Row
            title={t.whereILook}
            sub={s.detectEverywhere === false ? t.detectOff : t.detectOn}
            onClick={() => nav.push('detect')}
          />
          <Row title={t.backupTitle} sub={t.backupSummary} onClick={() => nav.push('backup')} />
          {/* Which server we talk to, always visible. A wrong endpoint used to
              be invisible until a request failed with a URL nobody had chosen. */}
          <Row title={t.serverTitle} sub={cloudBaseUrl(s)} onClick={() => nav.push('server')} />
          {/* DEV ONLY — what this account has actually cost us. Deliberately
              untranslated; remove before launch. */}
          {isDevInstall() && (
            <Row title="⚙ Dev: real cost" sub="Provider spend on this account" onClick={() => nav.push('cost')} />
          )}
        </div>

        {s.accountEmail && (
          <button
            className="plain wide danger"
            onClick={() => saveSettings({ ...settings, accountEmail: undefined, cloudToken: undefined })}
          >
            {t.signOutDevice}
          </button>
        )}
      </Body>
    </>
  )
}

function Screen({
  title,
  onBack,
  t,
  children,
}: {
  title: string
  onBack: () => void
  t: ReturnType<typeof useContent<'settings'>>
  children: React.ReactNode
}) {
  return (
    <>
      <ScreenHead title={title} onBack={onBack} backLabel={t.back} />
      <Body screen={title}>{children}</Body>
    </>
  )
}

// DEV ONLY — real money each AI action has cost us, straight from the server's
// ledger. Deliberately not translated; remove before launch.
function DevCosts() {
  const [settings] = useStore('settings')
  const [rows, setRows] = useState<UsageStatsRow[]>([])
  const [err, setErr] = useState('')

  const refresh = () => {
    if (!settings.accountEmail) return // settings still loading, or signed out
    cloudUsageStats(settings)
      .then((r) => { setRows(r); setErr('') })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }
  useEffect(refresh, [settings.accountEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  const total = rows.reduce((s, r) => s + r.costUsd, 0)
  const totalTokens = rows.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0)

  return (
    <>
      <p className="lede">
        What your account has actually cost us so far (provider prices). Dev build only.
      </p>
      <div className="meter">
        <div className="meter-top">
          <span>Total</span>
          <b>${total.toFixed(4)} · {(totalTokens / 1000).toFixed(1)}k tok</b>
        </div>
      </div>
      {err && <p className="error">{err}</p>}
      <div className="rows">
        {[...rows].sort((a, b) => b.costUsd - a.costUsd).map((r) => (
          <Row
            key={`${r.kind}:${r.endpoint}`}
            title={`${r.endpoint}${r.kind !== 'llm' ? ` (${r.kind})` : ''}`}
            sub={`${r.calls}× · ${r.inputTokens.toLocaleString()} in / ${r.outputTokens.toLocaleString()} out`}
            right={<span className="minichip">${r.costUsd.toFixed(4)}</span>}
          />
        ))}
      </div>
      <button className="ghost wide" onClick={refresh}>Refresh</button>
    </>
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

  const left = usage ? Math.max(0, usage.creditsLimit - usage.creditsUsed) : 0
  const pct = usage && usage.creditsLimit > 0 ? (left / usage.creditsLimit) * 100 : 0

  return (
    <div className="acct">
      {!signedIn && (
        <>
          <p className="lede">{t.accountIntro}</p>
          <label className="fl">{t.email}
            <input
              className="fin" type="email" placeholder={t.emailPlaceholder} value={email}
              onChange={(e) => setEmail(e.target.value)}
            /></label>
          {!codeSent ? (
            <button className="primary wide" disabled={busy || !email.trim()} onClick={sendCode}>
              {busy ? t.sending : t.sendCode}
            </button>
          ) : (
            <>
              <label className="fl">{t.codeLabel}
                <input
                  className="fin" type="text" inputMode="numeric" placeholder={t.codePlaceholder} value={otp}
                  onChange={(e) => setOtp(e.target.value)} autoFocus
                /></label>
              <button className="primary wide" disabled={busy || !otp.trim()} onClick={verify}>
                {busy ? t.checking : t.signIn}
              </button>
              <button className="link" disabled={busy} onClick={sendCode}>{t.resendCode}</button>
            </>
          )}
        </>
      )}

      {signedIn && (
        <>
          <div className="acct-top">
            <div>
              <div className="acct-l">{t.signedInLabel}</div>
              <div className="acct-e">{settings.accountEmail}</div>
            </div>
            <span className="pill flat">{usage?.plan === 'pro' ? t.planPro : t.planFree}</span>
          </div>

          {/* Credits as a bar, not a sentence — it's the thing you check. */}
          {usage && (
            <div className="cred">
              <div className="cred-top">
                <span>{t.creditsLeft}</span>
                <b>{left} {t.creditsOf} {usage.creditsLimit}</b>
              </div>
              <div className="meter-bar"><i style={{ width: `${pct}%` }} /></div>
            </div>
          )}

          {usage?.plan !== 'pro' && (
            <>
              <button className="primary wide">{t.goPro}</button>
              <div className="acct-f">{t.proFoot}</div>
            </>
          )}
          {!usage && <button className="ghost wide" onClick={refresh}>{t.checkCredits}</button>}
        </>
      )}
      {msg && <p className="microhint">{msg}</p>}
    </div>
  )
}
