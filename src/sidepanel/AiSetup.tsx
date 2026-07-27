// The AI setup form: endpoint, key, model, and a real test against them.
//
// One component, two homes — the first-run wizard renders it as a step, and
// Settings renders it as a section. They differ only in what the button at the
// bottom does, which is the `onSaved` prop.

import { useState } from 'react'
import { useContent } from '../i18n'
import { useStore } from './hooks'
import { Button, Chip, Input, Label } from './ui'
import { ENDPOINT_PRESETS, normalizeEndpoint, probeCapabilities } from '../ai/client'
import { AiProbe, Settings, probeMatches } from '../lib/types'

type T = ReturnType<typeof useContent<'ai'>>

/** How the last probe should read to a user. Kept out of the component so the
 *  wizard and Settings can never describe the same result differently. */
export function probeMessage(probe: AiProbe, t: T): { text: string; bad: boolean } {
  if (probe.error) return { text: probe.error, bad: true }
  if (!probe.json) return { text: t.resultBadJson, bad: true }
  if (!probe.vision) return { text: t.resultNoVision, bad: false }
  return { text: t.resultOk, bad: false }
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] leading-[1.45] font-normal text-faint">{children}</span>
}

export function AiSetup({ onSaved, saveLabel }: { onSaved?: () => void; saveLabel?: string }) {
  const t = useContent('ai')
  const [settings, saveSettings] = useStore('settings')

  // Local draft, so a half-typed endpoint never becomes the live one — a probe
  // reads the draft, and only a successful save commits it.
  const [endpoint, setEndpoint] = useState(settings.aiEndpoint ?? '')
  const [key, setKey] = useState(settings.aiKey ?? '')
  const [model, setModel] = useState(settings.aiModel ?? '')
  const [miniModel, setMiniModel] = useState(settings.aiMiniModel ?? '')
  const [testing, setTesting] = useState(false)
  const [probe, setProbe] = useState<AiProbe | undefined>(settings.aiProbe)

  const draft: Settings = {
    ...settings,
    aiEndpoint: normalizeEndpoint(endpoint),
    aiKey: key,
    aiModel: model.trim(),
    aiMiniModel: miniModel.trim(),
  }
  const ready = Boolean(draft.aiEndpoint && draft.aiModel)
  const isLocal = /\/\/(localhost|127\.0\.0\.1)[:/]/.test(endpoint)
  // A probe describes one endpoint+model pair; editing either makes it stale.
  const fresh = probeMatches(draft, probe)

  const test = async () => {
    setTesting(true)
    try {
      const result = await probeCapabilities(draft)
      setProbe(result)
      // Save what we just proved, so a working setup survives a closed panel
      // even if the user never presses the button below.
      saveSettings({ ...draft, aiProbe: result })
    } finally {
      setTesting(false)
    }
  }

  const save = () => {
    saveSettings({ ...draft, aiProbe: fresh ? probe : undefined })
    onSaved?.()
  }

  const message = fresh && probe ? probeMessage(probe, t) : null

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-[5px]">
        <span className="text-[11.5px] font-semibold text-muted">{t.providerLabel}</span>
        <div className="flex flex-wrap gap-1.5">
          {ENDPOINT_PRESETS.map((p) => (
            <Chip
              key={p.url}
              tone={normalizeEndpoint(endpoint) === p.url ? 'accent' : 'plain'}
              onClick={() => {
                setEndpoint(p.url)
                if (!p.key) setKey('')
              }}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      <Label>
        {t.endpointLabel}
        <Input
          type="url"
          spellCheck={false}
          placeholder={t.endpointPlaceholder}
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
        />
        <Hint>{t.endpointHint}</Hint>
      </Label>

      <Label>
        {t.keyLabel}
        <Input
          type="password"
          spellCheck={false}
          autoComplete="off"
          placeholder={t.keyPlaceholder}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Hint>{isLocal ? t.keyHintLocal : t.keyHint}</Hint>
      </Label>

      <Label>
        {t.modelLabel}
        <Input
          type="text"
          spellCheck={false}
          placeholder={t.modelPlaceholder}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        />
        <Hint>{t.modelHint}</Hint>
      </Label>

      <Label>
        {t.miniModelLabel}
        <Input
          type="text"
          spellCheck={false}
          placeholder={t.miniModelPlaceholder}
          value={miniModel}
          onChange={(e) => setMiniModel(e.target.value)}
        />
        <Hint>{t.miniModelHint}</Hint>
      </Label>

      {message && (
        <div className={message.bad ? 'text-[12px] leading-[1.45] text-bad' : 'text-[12px] leading-[1.45] text-good'}>
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" disabled={!ready || testing} onClick={() => void test()}>
          {testing ? t.testing : fresh ? t.testAgain : t.test}
        </Button>
        <Button disabled={!ready} onClick={save}>
          {saveLabel ?? t.save}
        </Button>
      </div>

      <Hint>{t.whatItCostsBody}</Hint>
    </div>
  )
}
