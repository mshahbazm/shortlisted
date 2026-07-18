import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Section } from '../components'
import { QueueItem, jobUrlKey, uid } from '../../lib/types'
import { sendMsg } from '../../lib/messaging'
import { runScoreFit, ScoreFitResult } from '../../ai/run'

export function ApplyTab() {
  const t = useContent('apply')
  const [queue, saveQueue] = useStore('queue')
  const [apps, saveApps] = useStore('applications')
  const [settings] = useStore('settings')
  const [profile] = useStore('profile')
  const [fitScores] = useStore('fitScores')

  const [pasteText, setPasteText] = useState('')
  const [notice, setNotice] = useState('')

  const todo = queue.filter((q) => q.status === 'todo')

  const addPasted = () => {
    const urls = pasteText.split(/[\n,\s]+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s))
    const existing = new Set(queue.map((q) => q.url))
    const fresh: QueueItem[] = urls
      .filter((u) => !existing.has(u))
      .map((url) => ({ id: uid(), url, tags: [], status: 'todo', addedAt: Date.now() }))
    saveQueue([...queue, ...fresh])
    setPasteText('')
    if (fresh.length) setNotice(t.addedJobs(fresh.length))
  }

  const fillCurrent = async () => {
    setNotice('')
    const granted = await chrome.permissions.request({ origins: ['<all_urls>'] }).catch(() => false)
    if (!granted) {
      setNotice(t.permissionDeclined)
      return
    }
    const res = await sendMsg<{ ok?: boolean; error?: string }>({ type: 'fillCurrentTab' })
    setNotice(res?.error ?? t.lookForPanel)
  }

  const setStatus = (id: string, status: QueueItem['status']) =>
    saveQueue(queue.map((q) => (q.id === id ? { ...q, status } : q)))

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><b>{todo.length}</b><span>{t.inQueue}</span></div>
        <div className="stat"><b>{apps.length}</b><span>{t.applied}</span></div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
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
                </div>
                <select
                  value={a.status}
                  style={{ width: 105 }}
                  onChange={(e) =>
                    saveApps(apps.map((x) => (x.id === a.id ? { ...x, status: e.target.value as typeof a.status } : x)))
                  }
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 700 }}>{result.fit.overallScore}<span style={{ fontSize: 14, color: 'var(--muted)' }}>/10</span></span>
            <span style={{ fontSize: 13 }}>{result.fit.verdict}</span>
          </div>
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
