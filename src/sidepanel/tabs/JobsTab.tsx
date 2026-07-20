// Jobs — the list you work through, and (soon) the ones we find for you.
//
// Split out of Home so the dashboard stops carrying a paste box. Two ways in:
// bring your own links, or take from what we've harvested. The harvested half
// is honest about not existing yet rather than pretending to be empty.

import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Body, FitChip, Icon, Row, ScreenHead, TopBar, useStack } from '../ui'
import * as store from '../../lib/store'
import { QueueItem, jobUrlKey, uid } from '../../lib/types'
import { showToast } from '../toast'
import { fitBand } from '../../lib/fitBands'

type T = ReturnType<typeof useContent<'home'>>

export function JobsTab() {
  const t = useContent('home')
  const nav = useStack()
  const [queue] = useStore('queue')
  const [fitScores] = useStore('fitScores')
  const [runAt, setRunAt] = useState(0)

  const todo = queue.filter((q) => q.status === 'todo')
  const scoreOf = (url: string) => fitScores[jobUrlKey(url)]?.score

  const addPasted = (text: string) => {
    const urls = text.split(/[\n,\s]+/).map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s))
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
      .then(() => added && showToast(t.addedJobs(added)))
  }

  const skip = (id: string) =>
    void store.update('queue', (list) => list.map((x) => (x.id === id ? { ...x, status: 'skipped' } : x)))

  /* ---------- the apply run ---------- */

  if (nav.screen === 'run') {
    const job = todo[runAt]
    if (!job) {
      return (
        <>
          <ScreenHead title={t.applyingTitle} onBack={() => { setRunAt(0); nav.back() }} backLabel={t.back} />
          <Body center screen="run-done">
            <div className="done">
              <div className="done-ring"><Icon name="check" /></div>
              <div className="done-t">{t.runDoneTitle}</div>
              <div className="done-s">{t.runDoneBody(runAt)}</div>
            </div>
            <button className="primary wide" onClick={() => { setRunAt(0); nav.back() }}>{t.backToHome}</button>
          </Body>
        </>
      )
    }
    const score = scoreOf(job.url)
    const band = score === undefined ? undefined : fitBand(score)
    const low = band === 'longShot' || band === 'borderline'
    return (
      <>
        <ScreenHead
          title={t.applyingTitle}
          onBack={nav.back}
          backLabel={t.back}
          right={t.runProgress(runAt + 1, todo.length)}
        />
        <div className="runbar"><i style={{ width: `${((runAt + 1) / todo.length) * 100}%` }} /></div>
        <Body center screen={`run-${runAt}`}>
          <div className="runcard">
            {score !== undefined && (
              <>
                <div className={`fitbig ${low ? 'low' : ''}`}>
                  <span className="fit-n">{score}</span>
                  <span className="fit-d">/10</span>
                </div>
                <div className={`fit-w ${low ? 'low' : ''}`}>{bandWord(band, t)}</div>
              </>
            )}
            <div className="run-t">{job.title || urlLabel(job.url)}</div>
            <div className="run-c">{job.company || urlLabel(job.url)}</div>
            {fitScores[jobUrlKey(job.url)]?.verdict && (
              <div className="run-note">{fitScores[jobUrlKey(job.url)].verdict}</div>
            )}
            <button
              className="primary big"
              onClick={() => {
                void chrome.tabs.create({ url: job.url })
                setRunAt(runAt + 1)
              }}
            >
              {t.openAndFill}
            </button>
            <div className="run-alt">
              <span />
              <button className="link muted" onClick={() => setRunAt(runAt + 1)}>{t.skipThisOne}</button>
            </div>
          </div>
          <div className="dots">
            {todo.slice(0, 12).map((q, i) => (
              <i key={q.id} className={i < runAt ? 'done' : i === runAt ? 'now' : ''} />
            ))}
          </div>
        </Body>
      </>
    )
  }

  /* ---------- your saved list ---------- */

  if (nav.screen === 'list') {
    return (
      <>
        <ScreenHead title={t.yourList} onBack={nav.back} backLabel={t.back} />
        <Body screen={nav.screen}>
          {todo.length === 0 ? (
            <div className="empty">{t.emptyJobList}</div>
          ) : (
            <>
              <div className="rows tall">
                {todo.map((q) => (
                  <Row
                    key={q.id}
                    lead={<FitChip score={scoreOf(q.url)} />}
                    title={q.title || urlLabel(q.url)}
                    sub={q.company || (scoreOf(q.url) === undefined ? t.notScoredYet : urlLabel(q.url))}
                    right={<button className="link muted" onClick={() => skip(q.id)}>{t.skip}</button>}
                  />
                ))}
              </div>
              <button className="primary wide" onClick={() => { setRunAt(0); nav.push('run') }}>
                {t.startApplying} &rarr;
              </button>
            </>
          )}
          <PasteJobs t={t} onAdd={addPasted} />
        </Body>
      </>
    )
  }

  /* ---------- root ---------- */

  return (
    <>
      <TopBar title={t.jobsTitle} />
      <Body screen={nav.screen}>
        <button className="navcard" onClick={() => nav.push('list')}>
          <span className="navcard-ic"><Icon name="briefcase" /></span>
          <span className="navcard-b">
            <span className="navcard-t">{t.yourList}</span>
            <span className="navcard-s">{todo.length > 0 ? t.yourListSub : t.noneSavedYet}</span>
          </span>
          {todo.length > 0 && <span className="navcard-n">{todo.length}</span>}
          <Icon name="chev" />
        </button>

        {todo.length > 0 && (
          <button className="primary big" onClick={() => { setRunAt(0); nav.push('run') }}>
            {t.startApplying} &rarr;
          </button>
        )}

        {/* Honest about not existing yet — an empty list would read as "we
            looked and found nothing", which is a different and worse claim. */}
        <div className="p-sec">
          <div className="p-sec-h">
            <span>{t.foundForYou}</span>
            <span className="pill flat">{t.comingSoon}</span>
          </div>
          <div className="soon">{t.foundForYouSoon}</div>
        </div>

        <PasteJobs t={t} onAdd={addPasted} />
      </Body>
    </>
  )
}

function PasteJobs({ t, onAdd }: { t: T; onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="p-sec">
      <div className="p-sec-h"><span>{t.addJobsLabel}</span></div>
      <textarea rows={2} placeholder={t.addJobsPlaceholder} value={text} onChange={(e) => setText(e.target.value)} />
      {text.trim() && (
        <button className="ghost wide" onClick={() => { onAdd(text); setText('') }}>{t.addToList}</button>
      )}
    </div>
  )
}

function bandWord(band: ReturnType<typeof fitBand> | undefined, t: T): string {
  switch (band) {
    case 'strongFit': return t.fitStrongFit
    case 'goodFit': return t.fitGoodFit
    case 'worthAShot': return t.fitWorthAShot
    case 'borderline': return t.fitBorderline
    default: return t.fitLongShot
  }
}

function urlLabel(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '') + u.pathname.slice(0, 30)
  } catch {
    return url.slice(0, 40)
  }
}
