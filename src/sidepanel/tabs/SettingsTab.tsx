import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Bar, Body, Button, Card, Checkbox, FIELD, Input, Label, Row, Rows, ScreenHead, Select, useStack } from '../ui'
import { cn } from '../../lib/cn'
import { StorageShape, storageDefaults } from '../../lib/types'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../../i18n'
import { CloudUsage, UsageStatsRow, cloudUsage, cloudUsageStats, sendLoginCode, verifyLoginCode } from '../../ai/run'
import { cloudBaseUrl, cloudUrlDefault, isDevInstall } from '../../lib/config'
import { sendMsg } from '../../lib/messaging'

const LEDE = 'm-0 text-[12.5px] leading-normal text-muted'
const LABEL = 'flex flex-col gap-[5px] text-[11.5px] font-semibold text-muted'

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
      ref={importRef} type="file" accept="application/json" className="hidden"
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
        <Select
          value={isLocale(s.locale) ? s.locale : 'auto'}
          onChange={(v) => set({ locale: v === 'auto' ? undefined : v })}
          options={[
            { value: 'auto', label: t.languageAuto },
            ...LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] })),
          ]}
        />
      </Screen>
    )
  }

  if (nav.screen === 'detect') {
    return (
      <Screen title={t.whereILook} onBack={nav.back} t={t}>
        <p className={LEDE}>{t.detectHint}</p>
        <Checkbox
          label={t.detectToggle}
          checked={s.detectEverywhere !== false}
          onChange={(e) => set({ detectEverywhere: e.target.checked })}
        />
      </Screen>
    )
  }

  if (nav.screen === 'server') {
    return (
      <Screen title={t.serverTitle} onBack={nav.back} t={t}>
        <p className={LEDE}>{isDevInstall() ? t.serverDevHint : t.serverProdHint}</p>
        <Label>{t.serverUrlLabel}
          <Input
            type="text"
            placeholder={cloudUrlDefault()}
            value={s.cloudUrl ?? ''}
            onChange={(e) => set({ cloudUrl: e.target.value })}
            spellCheck={false}
          />
        </Label>
        {s.cloudUrl?.trim() && (
          <Button variant="ghost" wide onClick={() => set({ cloudUrl: '' })}>{t.serverReset}</Button>
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
        <p className={LEDE}>{t.backupSummary}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={exportAll}>{t.exportJson}</Button>
          <Button variant="ghost" onClick={() => importRef.current?.click()}>{t.importJson}</Button>
        </div>
        {importInput}
        {msg && <p className="text-xs text-faint">{msg}</p>}
      </Screen>
    )
  }

  return (
    <>
      <ScreenHead title={t.title} onBack={onClose} backLabel={t.back} />
      <Body screen={nav.screen}>
        {/* Account leads: this is where the money is. */}
        <AccountPanel />

        <div className="overflow-hidden rounded-card border border-line bg-bg">
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
          <Button
            variant="danger"
            wide
            onClick={() => saveSettings({ ...settings, accountEmail: undefined, cloudToken: undefined })}
          >
            {t.signOutDevice}
          </Button>
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
      <p className={LEDE}>
        What your account has actually cost us so far (provider prices). Dev build only.
      </p>
      <Card>
        <div className="flex justify-between text-[12.5px] text-muted">
          <span>Total</span>
          <b>${total.toFixed(4)} · {(totalTokens / 1000).toFixed(1)}k tok</b>
        </div>
      </Card>
      {err && <p className="my-1 text-[13px] text-bad">{err}</p>}
      <Rows>
        {[...rows].sort((a, b) => b.costUsd - a.costUsd).map((r) => (
          <Row
            key={`${r.kind}:${r.endpoint}`}
            title={`${r.endpoint}${r.kind !== 'llm' ? ` (${r.kind})` : ''}`}
            sub={`${r.calls}× · ${r.inputTokens.toLocaleString()} in / ${r.outputTokens.toLocaleString()} out`}
            right={<span className="rounded-[5px] bg-[#f5f5f3] px-[7px] py-[2.5px] text-[11px] whitespace-nowrap text-muted">${r.costUsd.toFixed(4)}</span>}
          />
        ))}
      </Rows>
      <Button variant="ghost" wide onClick={refresh}>Refresh</Button>
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
    <Card pad="md" className="gap-3">
      {!signedIn && (
        <>
          <p className={LEDE}>{t.accountIntro}</p>
          <Label>{t.email}
            <Input type="email" placeholder={t.emailPlaceholder} value={email}
              onChange={(e) => setEmail(e.target.value)}
            /></Label>
          {!codeSent ? (
            <Button wide disabled={busy || !email.trim()} onClick={sendCode}>
              {busy ? t.sending : t.sendCode}
            </Button>
          ) : (
            <>
              <Label>{t.codeLabel}
                <Input type="text" inputMode="numeric" placeholder={t.codePlaceholder} value={otp}
                  onChange={(e) => setOtp(e.target.value)} autoFocus
                /></Label>
              <Button wide disabled={busy || !otp.trim()} onClick={verify}>
                {busy ? t.checking : t.signIn}
              </Button>
              <Button variant="link" disabled={busy} onClick={sendCode}>{t.resendCode}</Button>
            </>
          )}
        </>
      )}

      {signedIn && (
        <>
          <div className="flex items-start gap-2.5">
            <div>
              <div className="text-[11px] text-faint">{t.signedInLabel}</div>
              <div className="text-[13.5px] font-semibold [overflow-wrap:anywhere]">{settings.accountEmail}</div>
            </div>
            <span className="rounded-full bg-hover px-2 py-[3px] text-[10.5px] font-[650] whitespace-nowrap text-muted">{usage?.plan === 'pro' ? t.planPro : t.planFree}</span>
          </div>

          {/* Credits as a bar, not a sentence — it's the thing you check. */}
          {usage && (
            <div className="flex flex-col gap-[7px]">
              <div className="flex justify-between text-[12.5px] text-muted">
                <span>{t.creditsLeft}</span>
                <b>{left} {t.creditsOf} {usage.creditsLimit}</b>
              </div>
              <Bar percent={pct} />
            </div>
          )}

          {usage?.plan !== 'pro' && (
            <>
              <Button wide>{t.goPro}</Button>
              <div className="-mt-1.5 text-center text-[11.5px] leading-[1.45] text-faint">{t.proFoot}</div>
            </>
          )}
          {!usage && <Button variant="ghost" wide onClick={refresh}>{t.checkCredits}</Button>}
        </>
      )}
      {msg && <p className="text-xs text-faint">{msg}</p>}
    </Card>
  )
}
