import { useRef, useState } from 'react'
import { useStore } from '../hooks'
import { Section } from '../components'
import { AiProvider, StorageShape, storageDefaults } from '../../lib/types'
import { CLOUD_URL_DEFAULT } from '../../lib/config'
import { activateLicense, cloudUsage, CloudUsage } from '../../ai/run'

export function SettingsTab() {
  const [settings, saveSettings] = useStore('settings')
  const importRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')

  const s = settings
  const set = (patch: Partial<typeof s>) => saveSettings({ ...s, ...patch })

  const providerSummary =
    s.aiProvider === 'none' ? 'not set up'
    : s.aiProvider === 'cloud' ? 'Shortlisted Cloud'
    : s.aiProvider === 'anthropic' ? 'Anthropic'
    : s.aiProvider === 'openai' ? 'OpenAI'
    : s.aiProvider === 'ollama' ? 'Ollama (local)'
    : 'Local / custom server'

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
      <p className="hint">Filling works with no setup. An AI key adds CV import and tailoring.</p>

      <Section title="AI" summary={providerSummary} defaultOpen={s.aiProvider === 'none'}>
        <label className="f"><span>Provider (your key, your cost — calls go straight to them)</span>
          <select value={s.aiProvider} onChange={(e) => set({ aiProvider: e.target.value as AiProvider })}>
            <option value="none">None</option>
            <option value="cloud">Shortlisted Cloud (no key needed)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="ollama">Ollama (local, free)</option>
            <option value="custom">LM Studio / other local server (free)</option>
          </select>
        </label>
        {s.aiProvider === 'cloud' && <CloudPanel />}
        {s.aiProvider === 'anthropic' && (
          <>
            <label className="f"><span>API key</span>
              <input type="password" value={s.anthropicKey ?? ''} onChange={(e) => set({ anthropicKey: e.target.value })} placeholder="sk-ant-…" /></label>
            <label className="f"><span>Model</span>
              <input type="text" value={s.anthropicModel} onChange={(e) => set({ anthropicModel: e.target.value })} /></label>
          </>
        )}
        {s.aiProvider === 'openai' && (
          <>
            <label className="f"><span>API key</span>
              <input type="password" value={s.openaiKey ?? ''} onChange={(e) => set({ openaiKey: e.target.value })} placeholder="sk-…" /></label>
            <label className="f"><span>Model</span>
              <input type="text" value={s.openaiModel} onChange={(e) => set({ openaiModel: e.target.value })} /></label>
          </>
        )}
        {s.aiProvider === 'ollama' && (
          <>
            <label className="f"><span>Endpoint</span>
              <input type="url" value={s.ollamaEndpoint} onChange={(e) => set({ ollamaEndpoint: e.target.value })} /></label>
            <label className="f"><span>Model</span>
              <input type="text" value={s.ollamaModel} onChange={(e) => set({ ollamaModel: e.target.value })} /></label>
            <p className="microhint">
              If Ollama refuses with a 403, run it with OLLAMA_ORIGINS="chrome-extension://*" so the extension may talk to it.
            </p>
          </>
        )}
        {s.aiProvider === 'custom' && (
          <>
            <label className="f"><span>Server URL (OpenAI-compatible)</span>
              <input type="url" placeholder="http://localhost:1234/v1" value={s.customEndpoint} onChange={(e) => set({ customEndpoint: e.target.value })} /></label>
            <label className="f"><span>Model name (exactly as your server lists it)</span>
              <input type="text" placeholder="e.g. qwen2.5-14b-instruct" value={s.customModel} onChange={(e) => set({ customModel: e.target.value })} /></label>
            <label className="f"><span>API key (only if your server needs one)</span>
              <input type="password" value={s.customKey ?? ''} onChange={(e) => set({ customKey: e.target.value })} /></label>
            <p className="microhint">
              Works with LM Studio (default URL above — turn on the local server, and enable CORS in its server settings), Jan, LocalAI, vLLM, OpenRouter.
            </p>
          </>
        )}
      </Section>

      <Section title="Job finder" summary={s.finderUrl}>
        <label className="f"><span>Local finder app URL</span>
          <input type="url" value={s.finderUrl} onChange={(e) => set({ finderUrl: e.target.value })} /></label>
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

      <Section title="The rules" summary="no auto-submit, no lies, local by default">
        <p className="microhint">
          You click submit — always. CAPTCHAs are yours. CV tailoring only rearranges
          what's true — it cannot invent skills or experience. Your profile, answers, and
          CVs live on this computer. If you use an AI provider (Cloud or your own key),
          the text needed for that task is sent to it, used to do the task, and that's it —
          Shortlisted Cloud stores nothing, sells nothing, trains on nothing.
        </p>
      </Section>
    </div>
  )
}

function CloudPanel() {
  const [settings, saveSettings] = useStore('settings')
  const [usage, setUsage] = useState<CloudUsage | null>(null)
  const [licKey, setLicKey] = useState('')
  const [msg, setMsg] = useState('')

  const refresh = async () => {
    setMsg('')
    try {
      setUsage(await cloudUsage(settings))
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  const activate = async () => {
    setMsg('')
    try {
      setUsage(await activateLicense(settings, licKey.trim()))
      setLicKey('')
      setMsg('Pro activated.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div style={{ marginTop: 4 }}>
      <p className="microhint">
        No key, no setup — AI runs on our server. Free: 10 credits to try it.
        Pro ($9/mo): 100 credits/month. One tailored CV ≈ 1 credit.
      </p>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="ghost small" onClick={refresh}>Check my credits</button>
      </div>
      {usage && (
        <p className="microhint">
          {usage.plan === 'pro' ? 'Pro' : 'Free'} · {usage.creditsUsed} of {usage.creditsLimit} credits used
          {usage.plan === 'free' ? ' (lifetime)' : ' this month'}
        </p>
      )}
      <label className="f" style={{ marginTop: 8 }}><span>Have a Pro license key?</span>
        <input type="text" placeholder="SL-…" value={licKey} onChange={(e) => setLicKey(e.target.value)} /></label>
      <button className="ghost small" disabled={!licKey.trim()} onClick={activate}>Activate Pro</button>
      {msg && <p className="microhint">{msg}</p>}
      {settings.cloudToken && (
        <button
          className="link small" style={{ marginTop: 6 }}
          onClick={() => saveSettings({ ...settings, cloudToken: undefined })}
        >
          Reset device token
        </button>
      )}
    </div>
  )
}
