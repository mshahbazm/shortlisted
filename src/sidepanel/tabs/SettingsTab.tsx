import { useEffect, useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Bar, Body, Button, Card, Checkbox, FIELD, Input, Label, Row, Rows, ScreenHead, Select, useStack } from '../ui'
import { cn } from '../../lib/cn'
import { StorageShape, storageDefaults } from '../../lib/types'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../../i18n'
import {
  CloudUsage,
  CreditLedgerRow,
  UsageStatsRow,
  cloudBillingPortal,
  cloudCheckout,
  cloudCreditHistory,
  cloudUsage,
  cloudUsageStats,
  sendLoginCode,
  verifyLoginCode,
} from '../../ai/run'
import { isDevInstall } from '../../lib/config'
import { sendMsg } from '../../lib/messaging'
import * as store from '../../lib/store'

const LEDE = 'm-0 text-[12.5px] leading-normal text-muted'
const LABEL = 'flex flex-col gap-[5px] text-[11.5px] font-semibold text-muted'

export function SettingsTab({ onClose }: { onClose: () => void }) {
  const t = useContent('settings')
  const nav = useStack()
  const [settings] = useStore('settings')
  const importRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const s = settings
  // Merge against LIVE storage (read-modify-write), never a blind full object
  // from React state — a stale copy here would otherwise clobber a field written
  // elsewhere, e.g. the session token stored the moment the user verifies.
  const set = (patch: Partial<typeof s>) => void store.update('settings', (cur) => ({ ...cur, ...patch }))

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

  if (nav.screen === 'cost') {
    return (
      <Screen title="Dev: real cost" onBack={nav.back} t={t}>
        <DevCosts />
      </Screen>
    )
  }

  if (nav.screen === 'history') {
    return (
      <Screen title={t.historyTitle} onBack={nav.back} t={t}>
        <CreditHistory />
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
          {s.accountEmail && (
            <Row title={t.historyTitle} sub={t.historySummary} onClick={() => nav.push('history')} />
          )}
          <Row title={t.backupTitle} sub={t.backupSummary} onClick={() => nav.push('backup')} />
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
            onClick={() => void store.clearAccount()}
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

// The user-facing credit trail: every grant, spend, and monthly expiry, newest
// first — straight from the server's credit_ledger.
function CreditHistory() {
  const [settings] = useStore('settings')
  const t = useContent('settings')
  const [rows, setRows] = useState<CreditLedgerRow[]>([])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!settings.accountEmail) return
    cloudCreditHistory(settings)
      .then((r) => { setRows(r); setErr('') })
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.accountEmail])

  return (
    <>
      <p className={LEDE}>{t.historyHint}</p>
      {err && <p className="my-1 text-[13px] text-bad">{err}</p>}
      {rows.length === 0 && !err && <p className="text-[13px] text-faint">{t.historyEmpty}</p>}
      <Rows>
        {rows.map((r, i) => (
          <Row
            key={i}
            title={r.description}
            sub={new Date(r.createdAt).toLocaleDateString()}
            right={
              <span
                className={cn(
                  'rounded-[5px] px-[7px] py-[2.5px] text-[11px] font-semibold whitespace-nowrap',
                  r.amount >= 0 ? 'bg-good-bg text-good' : 'bg-hover text-muted',
                )}
              >
                {r.amount >= 0 ? '+' : ''}{r.amount}
              </span>
            }
          />
        ))}
      </Rows>
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
  const [billBusy, setBillBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const signedIn = Boolean(settings.accountEmail)

  // Checkout / portal both hand back a Stripe URL we open in a new tab. Errors
  // (e.g. "Billing is not configured.") surface in the panel.
  const openBilling = async (get: () => Promise<{ url: string }>) => {
    setMsg('')
    setBillBusy(true)
    try {
      const { url } = await get()
      void chrome.tabs.create({ url })
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    } finally {
      setBillBusy(false)
    }
  }

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

  // Enter should submit the visible step, same as clicking the button:
  // the email field sends the code, the code field signs in.
  const submitAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (codeSent) void verify()
    else void sendCode()
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
        // A real form so Enter submits the visible step, not just a button click.
        // `contents` keeps the fields as direct flex children of the Card.
        <form onSubmit={submitAccount} className="contents">
          <p className={LEDE}>{t.accountIntro}</p>
          <Label>{t.email}
            <Input type="email" placeholder={t.emailPlaceholder} value={email}
              onChange={(e) => setEmail(e.target.value)}
            /></Label>
          {!codeSent ? (
            <Button type="submit" wide disabled={busy || !email.trim()}>
              {busy ? t.sending : t.sendCode}
            </Button>
          ) : (
            <>
              <Label>{t.codeLabel}
                <Input type="text" inputMode="numeric" placeholder={t.codePlaceholder} value={otp}
                  onChange={(e) => setOtp(e.target.value)} autoFocus
                /></Label>
              <Button type="submit" wide disabled={busy || !otp.trim()}>
                {busy ? t.checking : t.signIn}
              </Button>
              <Button type="button" variant="link" disabled={busy} onClick={sendCode}>{t.resendCode}</Button>
            </>
          )}
        </form>
      )}

      {signedIn && (
        <>
          <div className="flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1 text-[13.5px] font-semibold [overflow-wrap:anywhere]">{settings.accountEmail}</div>
            <span className="shrink-0 rounded-full bg-hover px-2 py-[3px] text-[10.5px] font-[650] whitespace-nowrap text-muted">{usage?.plan === 'pro' ? t.planPro : t.planFree}</span>
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

          {usage && usage.plan !== 'pro' && (
            <div className="flex flex-col gap-2">
              <div className="text-[12.5px] font-semibold">{t.goPro}</div>
              <Button wide disabled={billBusy} onClick={() => openBilling(() => cloudCheckout(settings, 'monthly'))}>
                {t.proMonthly}
              </Button>
              <Button variant="ghost" wide disabled={billBusy} onClick={() => openBilling(() => cloudCheckout(settings, 'annual'))}>
                {t.proAnnual}
              </Button>
              <div className="-mt-0.5 text-center text-[11.5px] leading-[1.45] text-faint">{t.proFoot}</div>
            </div>
          )}
          {usage?.plan === 'pro' && (
            <Button variant="ghost" wide disabled={billBusy} onClick={() => openBilling(() => cloudBillingPortal(settings))}>
              {t.manageSub}
            </Button>
          )}
          {!usage && <Button variant="ghost" wide onClick={refresh}>{t.checkCredits}</Button>}
        </>
      )}
      {msg && <p className="text-xs text-faint">{msg}</p>}
    </Card>
  )
}
