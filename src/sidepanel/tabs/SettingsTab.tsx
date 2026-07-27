import { useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Body, Button, Checkbox, Row, ScreenHead, Select, useStack } from '../ui'
import { StorageShape, probeMatches, storageDefaults } from '../../lib/types'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../../i18n'
import { AiSetup, probeMessage } from '../AiSetup'
import * as store from '../../lib/store'

const LEDE = 'm-0 text-[12.5px] leading-normal text-muted'

export function SettingsTab({ onClose }: { onClose: () => void }) {
  const t = useContent('settings')
  const ta = useContent('ai')
  const nav = useStack()
  const [settings] = useStore('settings')
  const importRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const s = settings
  // Merge against LIVE storage (read-modify-write), never a blind full object
  // from React state — a stale copy here would otherwise clobber a field written
  // elsewhere, e.g. a probe result saved while this screen is open.
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

  if (nav.screen === 'ai') {
    return (
      <Screen title={ta.settingsTitle} onBack={nav.back} t={t}>
        <AiSetup onSaved={nav.back} />
      </Screen>
    )
  }

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

  if (nav.screen === 'backup') {
    return (
      <Screen title={t.backupTitle} onBack={nav.back} t={t}>
        <p className={LEDE}>{t.backupHint}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={exportAll}>{t.exportJson}</Button>
          <Button variant="ghost" onClick={() => importRef.current?.click()}>{t.importJson}</Button>
        </div>
        {importInput}
        {msg && <p className="text-xs text-faint">{msg}</p>}
      </Screen>
    )
  }

  if (nav.screen === 'reset') {
    return (
      <Screen title={t.resetTitle} onBack={nav.back} t={t}>
        <p className={LEDE}>{t.resetHint}</p>
        <Button variant="ghost" onClick={exportAll}>{t.exportJson}</Button>
        <Button
          variant="destructive"
          wide
          onClick={() => {
            void store.clearAllData()
            setMsg(t.resetDone)
          }}
        >
          {t.resetConfirm}
        </Button>
        {msg && <p className="text-xs text-faint">{msg}</p>}
      </Screen>
    )
  }

  // The AI row's subtitle is the one place the setup state is visible without
  // opening it: the model name when it works, and what is wrong when it doesn't.
  const aiSub = !s.aiModel
    ? t.aiNotSet
    : !probeMatches(s)
      ? `${s.aiModel} · ${t.aiUntested}`
      : probeMessage(s.aiProbe!, ta).bad
        ? `${s.aiModel} · ${ta.resultFailed}`
        : s.aiModel

  return (
    <>
      <ScreenHead title={t.title} onBack={onClose} backLabel={t.back} />
      <Body screen={nav.screen}>
        <p className={LEDE}>{t.hint}</p>

        <div className="overflow-hidden rounded-card border border-line bg-bg">
          {/* AI leads: it is the only thing here that has to be set up. */}
          <Row title={ta.settingsTitle} sub={aiSub} onClick={() => nav.push('ai')} />
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
          <Row title={t.resetTitle} sub={t.resetSummary} onClick={() => nav.push('reset')} />
        </div>
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
