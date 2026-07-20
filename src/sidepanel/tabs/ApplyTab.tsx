import { useEffect, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Section } from '../components'
import { QueueItem, base64ToBytes, jobUrlKey, uid } from '../../lib/types'
import { sendMsg } from '../../lib/messaging'
import * as store from '../../lib/store'
import { cloudUsageStats, runScoreFit, ScoreFitResult, UsageStatsRow } from '../../ai/run'
import { FIT_COLORS, FitBand, fitBand, fitPercent } from '../../lib/fitBands'

type FillErrorCode = 'noTab' | 'cannotFill' | 'noForm'

const FILL_ERRORS = {
  noTab: 'fillNoTab',
  cannotFill: 'fillCannotFill',
  noForm: 'fillNoForm',
} as const

export function ApplyTab() {
  const t = useContent('apply')
  const [queue] = useStore('queue')
  const [apps] = useStore('applications')
  const [settings] = useStore('settings')
  const [profile] = useStore('profile')
  const [fitScores] = useStore('fitScores')

  const [resumes] = useStore('resumes')

  const [pasteText, setPasteText] = useState('')
  const [notice, setNotice] = useState('')

  // Open a stored CV in Chrome's PDF viewer — see exactly what was sent.
  const openPdf = (r: { dataBase64: string }) => {
    const blob = new Blob([base64ToBytes(r.dataBase64) as BlobPart], { type: 'application/pdf' })
    window.open(URL.createObjectURL(blob), '_blank')
  }

  const todo = queue.filter((q) => q.status === 'todo')

  const addPasted = () => {
    const urls = pasteText.split(/[\n,\s]+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s))
    // Dedup against the LIVE queue, not this render's copy.
    let added = 0
    void store
      .update('queue', (q) => {
        const existing = new Set(q.map((x) => x.url))
        const fresh: QueueItem[] = urls
          .filter((u) => !existing.has(u))
          .map((url) => ({ id: uid(), url, tags: [], status: 'todo', addedAt: Date.now() }))
        added = fresh.length
        return [...q, ...fresh]
      })
      .then(() => {
        if (added) setNotice(t.addedJobs(added))
      })
    setPasteText('')
  }

  const fillCurrent = async () => {
    setNotice('')
    const res = await sendMsg<{ ok?: boolean; errorCode?: FillErrorCode }>({ type: 'fillCurrentTab' })
    setNotice(res?.errorCode ? t[FILL_ERRORS[res.errorCode]] : t.lookForPanel)
  }

  const setStatus = (id: string, status: QueueItem['status']) =>
    void store.update('queue', (q) => q.map((x) => (x.id === id ? { ...x, status } : x)))

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><b>{todo.length}</b><span>{t.inQueue}</span></div>
        <div className="stat"><b>{apps.length}</b><span>{t.applied}</span></div>
      </div>

      <div className="field-row" style={{ marginBottom: 16 }}>
        <button
          className="primary"
          disabled={todo.length === 0}
          onClick={() => todo[0] && void chrome.tabs.create({ url: todo[0].url })}
        >
          {t.openNextJob}
        </button>
        <button className="ghost" onClick={fillCurrent}>{t.fillCurrentTab}</button>
      </div>
      {notice && <p className="progress">{notice}</p>}

      {todo.length > 0 && (
        <div className="list" style={{ marginBottom: 16 }}>
          {todo.slice(0, 12).map((q) => (
            <div key={q.id} className="list-item">
              <div className="grow">
                <div className="title">{q.title || urlLabel(q.url)}</div>
                <div className="sub">
                  {q.company ? `${q.company} · ` : ''}{q.title ? urlLabel(q.url) : ''}
                  {q.tags.map((t) => <span key={t} className="chip blue" style={{ marginLeft: 6 }}>{t}</span>)}
                  {fitScores[jobUrlKey(q.url)] && (
                    <span
                      className={`chip ${fitScores[jobUrlKey(q.url)].score >= 7 ? 'green' : fitScores[jobUrlKey(q.url)].score >= 5 ? 'blue' : 'amber'}`}
                      style={{ marginLeft: 6 }}
                      title={fitScores[jobUrlKey(q.url)].verdict}
                    >
                      {t.fitChip(fitScores[jobUrlKey(q.url)].score)}
                    </span>
                  )}
                </div>
              </div>
              <button className="small ghost" onClick={() => void chrome.tabs.create({ url: q.url })}>{t.open}</button>
              <button className="small link" onClick={() => setStatus(q.id, 'skipped')}>{t.skip}</button>
            </div>
          ))}
          {todo.length > 12 && <div className="list-item"><span className="sub">{t.andMore(todo.length - 12)}</span></div>}
        </div>
      )}
      {todo.length === 0 && <div className="empty">{t.emptyQueue}</div>}

      <Section title={t.addJobsTitle} summary={t.addJobsSummary}>
        <label className="f"><span>{t.jobLinksLabel}</span>
          <textarea
            rows={3}
            placeholder={'https://jobs.lever.co/…\nhttps://boards.greenhouse.io/…'}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          /></label>
        <button className="ghost small" onClick={addPasted} disabled={!pasteText.trim()}>{t.addToQueue}</button>
      </Section>

      <Section title={t.checkFitTitle} summary={t.checkFitSummary}>
        <FitChecker
          disabled={profile.work.length === 0}
          run={(jobText, onStep) => runScoreFit(settings, profile, jobText, onStep)}
        />
        {profile.work.length === 0 && <p className="microhint">{t.fillProfileFirst}</p>}
      </Section>

      <Section title={t.appliedTitle} summary={t.appliedSummary(apps.length)}>
        {apps.length === 0 && <div className="empty">{t.submitsLogged}</div>}
        {apps.length > 0 && (
          <div className="list">
            {[...apps].sort((a, b) => b.appliedAt - a.appliedAt).slice(0, 20).map((a) => (
              <div key={a.id} className="list-item">
                <div className="grow">
                  <div className="title">{a.title || a.company}</div>
                  <div className="sub">
                    {a.company} · {new Date(a.appliedAt).toLocaleDateString()} ·{' '}
                    <a href={a.jobUrl} target="_blank" rel="noreferrer">{t.pageLink}</a>
                  </div>
                  {/* Which CV actually went with this application. */}
                  {(() => {
                    const cv = a.resumeId ? resumes.find((r) => r.id === a.resumeId) : undefined
                    if (!cv) return null
                    return (
                      <div className="sub">
                        {t.cvSent}{' '}
                        <button className="link small" style={{ padding: 0 }} onClick={() => openPdf(cv)}>
                          {cv.label}
                        </button>
                      </div>
                    )
                  })()}
                </div>
                <select
                  value={a.status}
                  style={{ width: 105 }}
                  onChange={(e) => {
                    const status = e.target.value as typeof a.status
                    void store.update('applications', (list) =>
                      list.map((x) => (x.id === a.id ? { ...x, status } : x)),
                    )
                  }}
                >
                  {(['applied', 'interviewing', 'offer', 'rejected'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s === 'applied' ? t.statusApplied : s === 'interviewing' ? t.statusInterviewing : s === 'offer' ? t.statusOffer : t.statusRejected}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </Section>

      <DevCosts />
    </div>
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
    <Section
      title="⚙ Dev: real cost"
      summary={`$${total.toFixed(4)} · ${(totalTokens / 1000).toFixed(1)}k tok`}
    >
      <p className="microhint">What your account has actually cost us so far (provider prices). Dev build only.</p>
      {err && <p className="error">{err}</p>}
      <div className="list">
        {[...rows].sort((a, b) => b.costUsd - a.costUsd).map((r) => (
          <div key={`${r.kind}:${r.endpoint}`} className="list-item">
            <div className="grow">
              <div className="title">{r.endpoint}{r.kind !== 'llm' ? ` (${r.kind})` : ''}</div>
              <div className="sub">{r.calls}× · {r.inputTokens.toLocaleString()} in / {r.outputTokens.toLocaleString()} out</div>
            </div>
            <span className="chip">${r.costUsd.toFixed(4)}</span>
          </div>
        ))}
      </div>
      <div className="spacer" />
      <button className="ghost small" onClick={refresh}>Refresh</button>
    </Section>
  )
}

function FitScoreBox({ score, verdict }: { score: number; verdict: string }) {
  const t = useContent('apply')
  const band = fitBand(score)
  const c = FIT_COLORS[band]
  const words: Record<FitBand, string> = {
    longShot: t.fitLongShot,
    borderline: t.fitBorderline,
    worthAShot: t.fitWorthAShot,
    goodFit: t.fitGoodFit,
    strongFit: t.fitStrongFit,
  }
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 24, fontWeight: 750, letterSpacing: '-0.02em', color: c.fg }}>{fitPercent(score)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: c.fg }}>
          {words[band]}
        </span>
      </div>
      <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{verdict}</div>
    </div>
  )
}

function FitChecker({
  disabled,
  run,
}: {
  disabled: boolean
  run: (jobText: string, onStep: (s: string) => void) => Promise<ScoreFitResult>
}) {
  const t = useContent('apply')
  const [jobText, setJobText] = useState('')
  const [busyStep, setBusyStep] = useState('')
  const [err, setErr] = useState('')
  const [result, setResult] = useState<ScoreFitResult | null>(null)

  const go = async () => {
    setErr('')
    setResult(null)
    try {
      setResult(await run(jobText, setBusyStep))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyStep('')
    }
  }

  return (
    <>
      <textarea
        rows={4}
        placeholder={t.pasteJobPlaceholder}
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
      />
      <div className="spacer" />
      <button className="primary small" disabled={disabled || !!busyStep || jobText.trim().length < 80} onClick={go}>
        {busyStep ? t.scoring : t.scoreMyFit}
      </button>
      {busyStep && <p className="progress">{busyStep}</p>}
      {err && <p className="error">{err}</p>}
      {result && (
        <div style={{ marginTop: 12 }}>
          <FitScoreBox score={result.fit.overallScore} verdict={result.fit.verdict} />
          {result.fit.strengths.length > 0 && (
            <p className="microhint" style={{ margin: '8px 0 4px' }}>
              {t.leadWith(result.fit.strengths.join(' · '))}
            </p>
          )}
          <div className="list" style={{ marginTop: 8 }}>
            {result.fit.criteria.map((c, i) => (
              <div key={i} className="list-item">
                <div className="grow">
                  <div className="title" style={{ fontWeight: 500 }}>{c.requirement}</div>
                  {!c.notObserved && c.commentary && <div className="sub">{c.commentary}</div>}
                </div>
                {c.notObserved ? (
                  <span className="chip">{t.notShown}</span>
                ) : (
                  <>
                    <span className={`chip ${c.relevance === 'direct' ? 'green' : c.relevance === 'transferable' ? 'blue' : 'amber'}`}>
                      {c.relevance}
                    </span>
                    <span className="chip">{c.score}/5</span>
                  </>
                )}
              </div>
            ))}
          </div>
          {result.fit.gaps.length > 0 && (
            <p className="microhint" style={{ marginTop: 8 }}>
              {t.gapsHint(result.fit.gaps.join(', '))}
            </p>
          )}
          <p className="microhint" style={{ marginTop: 8 }}>{t.updateProfileHint}</p>
          <button
            className="ghost small"
            style={{ marginTop: 6 }}
            onClick={() => void store.set('pendingNav', 'tellme')}
          >
            {t.updateProfile}
          </button>
        </div>
      )}
    </>
  )
}

function urlLabel(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + u.pathname.slice(0, 30)
  } catch {
    return url.slice(0, 40)
  }
}
