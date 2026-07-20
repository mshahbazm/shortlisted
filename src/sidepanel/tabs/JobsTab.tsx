// Jobs — one list, one way to add to it.
//
// An earlier pass had three competing ideas on this screen: a card that opened
// the list, a "found for you" block, and a loose paste box. That is three
// answers to "where do my jobs live". Now there is one list with a segmented
// filter over it, and adding happens in a sheet you open deliberately.

import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Body, FitChip, Icon, Row, ScreenHead, Sheet, TopBar, useStack } from '../ui'
import * as store from '../../lib/store'
import { QueueItem, jobUrlKey, uid } from '../../lib/types'
import { showToast } from '../toast'
import { fitBand } from '../../lib/fitBands'

type T = ReturnType<typeof useContent<'home'>>
type Seg = 'all' | 'yours' | 'found'

export function JobsTab() {
  const t = useContent('home')
  const nav = useStack()
  const [queue] = useStore('queue')
  const [fitScores] = useStore('fitScores')
  const [runAt, setRunAt] = useState(0)
  const [seg, setSeg] = useState<Seg>('all')
  const [adding, setAdding] = useState(false)

  const todo = queue.filter((q) => q.status === 'todo')
  const scoreOf = (url: string) => fitScores[jobUrlKey(url)]?.score

  // Every job is currently one the user brought. When harvesting lands, these
  // split on a source field and 'found' stops being empty by definition.
  const shown = seg === 'found' ? [] : todo

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
    setAdding(false)
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

  /* ---------- root: one list ---------- */

  return (
    <>
      <TopBar
        title={t.jobsTitle}
        right={
          <button className="iconbtn" onClick={() => setAdding(true)} aria-label={t.addJobsLabel}>
            <Icon name="plus" />
          </button>
        }
      />
      <Body screen={`jobs-${seg}`}>
        <div className="segs">
          <button className={`seg ${seg === 'all' ? 'on' : ''}`} onClick={() => setSeg('all')}>
            {t.segAll}{todo.length > 0 ? ` ${todo.length}` : ''}
          </button>
          <button className={`seg ${seg === 'yours' ? 'on' : ''}`} onClick={() => setSeg('yours')}>
            {t.segYours}{todo.length > 0 ? ` ${todo.length}` : ''}
          </button>
          <button className={`seg ${seg === 'found' ? 'on' : ''}`} onClick={() => setSeg('found')}>
            {t.foundForYou}
          </button>
        </div>

        {/* Harvesting isn't switched on. Said plainly — an empty list here would
            read as "we looked and found nothing", which is a worse claim. */}
        {seg === 'found' && (
          <div className="soon">
            <b>{t.comingSoon}.</b> {t.foundForYouSoon}
          </div>
        )}

        {seg !== 'found' && shown.length === 0 && (
          <div className="blank">
            <div className="blank-t">{t.jobListTitle}</div>
            <div className="blank-s">{t.noYoursYet}</div>
            <button className="primary" onClick={() => setAdding(true)}>
              <Icon name="plus" /> {t.addJobsLabel}
            </button>
          </div>
        )}

        {shown.length > 0 && (
          <>
            <div className="rows tall">
              {shown.map((q) => (
                <Row
                  key={q.id}
                  lead={<FitChip score={scoreOf(q.url)} />}
                  title={q.title || urlLabel(q.url)}
                  sub={q.company || (scoreOf(q.url) === undefined ? t.notScoredYet : urlLabel(q.url))}
                  right={<button className="link muted" onClick={() => skip(q.id)}>{t.skip}</button>}
                />
              ))}
            </div>
            <button className="primary big" onClick={() => { setRunAt(0); nav.push('run') }}>
              {t.startApplying} &rarr;
            </button>
            <button className="ghost wide" onClick={() => setAdding(true)}>
              <Icon name="plus" /> {t.addJobsLabel}
            </button>
          </>
        )}
      </Body>

      {adding && <AddJobsSheet t={t} onAdd={addPasted} onClose={() => setAdding(false)} />}
    </>
  )
}

/** Adding is a deliberate act, so it gets a sheet rather than a box sitting
 *  permanently on the screen competing with the list itself. */
function AddJobsSheet({ t, onAdd, onClose }: { t: T; onAdd: (text: string) => void; onClose: () => void }) {
  const [text, setText] = useState('')
  return (
    <Sheet title={t.addJobsLabel} sub={t.addJobsSub} closeLabel={t.cancel} onClose={onClose}>
      <textarea
        rows={4}
        autoFocus
        placeholder={t.addJobsPlaceholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="primary wide" disabled={!text.trim()} onClick={() => onAdd(text)}>
        {t.addToList}
      </button>
    </Sheet>
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
