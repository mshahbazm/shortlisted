import { useState } from 'react'
import { useStore } from '../hooks'
import { Section } from '../components'
import { QueueItem, uid } from '../../lib/types'
import { sendMsg } from '../../lib/messaging'

export function ApplyTab() {
  const [queue, saveQueue] = useStore('queue')
  const [apps, saveApps] = useStore('applications')
  const [settings] = useStore('settings')

  const [pasteText, setPasteText] = useState('')
  const [finderQuery, setFinderQuery] = useState('')
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
    if (fresh.length) setNotice(`Added ${fresh.length} job${fresh.length === 1 ? '' : 's'}.`)
  }

  const pullFromFinder = async () => {
    setNotice('Asking your job finder…')
    try {
      const url = new URL('/api/jobs', settings.finderUrl)
      if (finderQuery.trim()) url.searchParams.set('q', finderQuery.trim())
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`finder replied ${res.status}`)
      const data = await res.json()
      const jobs: unknown[] = Array.isArray(data) ? data : (data.jobs ?? data.items ?? data.data ?? [])
      const existing = new Set(queue.map((q) => q.url))
      const fresh: QueueItem[] = []
      for (const j of jobs as Record<string, unknown>[]) {
        const jobUrl = String(j.apply_url ?? j.applyUrl ?? j.url ?? '')
        if (!/^https?:\/\//.test(jobUrl) || existing.has(jobUrl)) continue
        fresh.push({
          id: uid(), url: jobUrl,
          company: (j.company ?? j.company_name ?? '') as string,
          title: (j.title ?? j.job_title ?? '') as string,
          tags: finderQuery.trim() ? [finderQuery.trim()] : [],
          status: 'todo', addedAt: Date.now(),
        })
        if (fresh.length >= 25) break
      }
      saveQueue([...queue, ...fresh])
      setNotice(fresh.length ? `Added ${fresh.length} job(s) from the finder.` : 'No new jobs matched.')
    } catch {
      setNotice(`Couldn't reach the finder at ${settings.finderUrl} — is it running?`)
    }
  }

  const fillCurrent = async () => {
    setNotice('')
    const granted = await chrome.permissions.request({ origins: ['<all_urls>'] }).catch(() => false)
    if (!granted) {
      setNotice('Permission declined — auto-fill still works on the known job sites.')
      return
    }
    const res = await sendMsg<{ ok?: boolean; error?: string }>({ type: 'fillCurrentTab' })
    setNotice(res?.error ?? 'Look for the Shortlisted panel on the page.')
  }

  const setStatus = (id: string, status: QueueItem['status']) =>
    saveQueue(queue.map((q) => (q.id === id ? { ...q, status } : q)))

  return (
    <div>
      <div className="stat-row">
        <div className="stat"><b>{todo.length}</b><span>in queue</span></div>
        <div className="stat"><b>{apps.length}</b><span>applied</span></div>
      </div>

      <div className="row" style={{ marginBottom: 16 }}>
        <button
          className="primary"
          disabled={todo.length === 0}
          onClick={() => todo[0] && void chrome.tabs.create({ url: todo[0].url })}
        >
          Open next job
        </button>
        <button className="ghost" onClick={fillCurrent}>Fill current tab</button>
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
                </div>
              </div>
              <button className="small ghost" onClick={() => void chrome.tabs.create({ url: q.url })}>Open</button>
              <button className="small link" onClick={() => setStatus(q.id, 'skipped')}>Skip</button>
            </div>
          ))}
          {todo.length > 12 && <div className="list-item"><span className="sub">…and {todo.length - 12} more</span></div>}
        </div>
      )}
      {todo.length === 0 && <div className="empty">No jobs queued. Add some below ↓</div>}

      <Section title="Add jobs" summary="paste links, or pull from your finder">
        <label className="f"><span>Job links — one per line</span>
          <textarea
            rows={3}
            placeholder={'https://jobs.lever.co/…\nhttps://boards.greenhouse.io/…'}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          /></label>
        <button className="ghost small" onClick={addPasted} disabled={!pasteText.trim()}>Add to queue</button>
        <div className="spacer" />
        <label className="f"><span>Or from your job finder — what are you hunting?</span>
          <input
            type="text" placeholder='"ai engineer", "typescript remote"…'
            value={finderQuery} onChange={(e) => setFinderQuery(e.target.value)}
          /></label>
        <button className="ghost small" onClick={pullFromFinder}>Pull 25 jobs</button>
      </Section>

      <Section title="Applied" summary={apps.length ? `${apps.length} so far` : 'nothing yet'}>
        {apps.length === 0 && <div className="empty">Submits get logged here automatically.</div>}
        {apps.length > 0 && (
          <div className="list">
            {[...apps].sort((a, b) => b.appliedAt - a.appliedAt).slice(0, 20).map((a) => (
              <div key={a.id} className="list-item">
                <div className="grow">
                  <div className="title">{a.title || a.company}</div>
                  <div className="sub">
                    {a.company} · {new Date(a.appliedAt).toLocaleDateString()} ·{' '}
                    <a href={a.jobUrl} target="_blank" rel="noreferrer">page</a>
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
                    <option key={s} value={s}>{s}</option>
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

function urlLabel(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + u.pathname.slice(0, 30)
  } catch {
    return url.slice(0, 40)
  }
}
