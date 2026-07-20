// Jobs — one list, one way to add to it.
//
// An earlier pass had three competing ideas on this screen: a card that opened
// the list, a "found for you" block, and a loose paste box. That is three
// answers to "where do my jobs live". Now there is one list with a segmented
// filter over it, and adding happens in a sheet you open deliberately.

import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { cn } from '../../lib/cn'
import { Bar, Body, Button, FitChip, Icon, Row, ScreenHead, Segments, Sheet, TopBar, useStack } from '../ui'
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
            <div className="flex flex-col items-center gap-[7px] px-1 pt-2.5 pb-0.5 text-center">
              <div className="mb-[5px] grid size-[42px] place-items-center rounded-full bg-good-bg text-good"><Icon name="check" /></div>
              <div className="text-base font-[650] tracking-[-0.01em]">{t.runDoneTitle}</div>
              <div className="max-w-[32ch] text-[12.5px] leading-normal text-muted">{t.runDoneBody(runAt)}</div>
            </div>
            <Button wide onClick={() => { setRunAt(0); nav.back() }}>{t.backToHome}</Button>
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
        <Bar percent={((runAt + 1) / todo.length) * 100} className="h-[3px] flex-none rounded-none" />
        <Body center screen={`run-${runAt}`}>
          <div className="flex flex-col items-center gap-[5px] rounded-[14px] border border-line px-[18px] py-5 text-center">
            {score !== undefined && (
              <>
                <div className={cn('flex items-baseline tabular-nums', low ? 'text-warn' : 'text-good')}>
                  <span className="text-[44px] leading-none font-bold tracking-[-0.03em]">{score}</span>
                  <span className="text-[17px] font-semibold opacity-55">/10</span>
                </div>
                <div className={cn('mb-2.5 text-[11px] font-bold tracking-[0.09em] uppercase', low ? 'text-warn' : 'text-good')}>{bandWord(band, t)}</div>
              </>
            )}
            <div className="text-[17px] leading-[1.25] font-[650] tracking-[-0.015em]">{job.title || urlLabel(job.url)}</div>
            <div className="text-[12.5px] text-muted">{job.company || urlLabel(job.url)}</div>
            {fitScores[jobUrlKey(job.url)]?.verdict && (
              <div className="my-3 rounded-[9px] bg-hover px-3 py-2.5 text-left text-[12.5px] leading-normal text-muted">{fitScores[jobUrlKey(job.url)].verdict}</div>
            )}
            <Button size="lg" onClick={() => {
                void chrome.tabs.create({ url: job.url })
                setRunAt(runAt + 1)
              }}
            >
              {t.openAndFill}
            </Button>
            <div className="mt-[11px] flex w-full justify-between">
              <span />
              <Button variant="link" className="text-faint" onClick={() => setRunAt(runAt + 1)}>{t.skipThisOne}</Button>
            </div>
          </div>
          <div className="flex justify-center gap-1.5">
            {todo.slice(0, 12).map((q, i) => (
              <i key={q.id} className={cn('size-1.5 rounded-full', i < runAt ? 'bg-[#c4c4bd]' : i === runAt ? 'w-[18px] rounded-[3px] bg-accent' : 'bg-[#e4e4e0]')} />
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
          <button className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md border-0 bg-transparent p-0 text-muted hover:bg-hover hover:text-fg" onClick={() => setAdding(true)} aria-label={t.addJobsLabel}>
            <Icon name="plus" />
          </button>
        }
      />
      <Body screen={`jobs-${seg}`}>
        <Segments
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'all', label: t.segAll + (todo.length ? ` ${todo.length}` : '') },
            { value: 'yours', label: t.segYours + (todo.length ? ` ${todo.length}` : '') },
            { value: 'found', label: t.foundForYou },
          ]}
        />

        {/* Harvesting isn't switched on. Said plainly — an empty list here would
            read as "we looked and found nothing", which is a worse claim. */}
        {seg === 'found' && (
          <div className="rounded-card border border-dashed border-[#dcdcd6] bg-bg px-3.5 py-[13px] text-[12.5px] leading-[1.55] text-muted">
            <b>{t.comingSoon}.</b> {t.foundForYouSoon}
          </div>
        )}

        {seg !== 'found' && shown.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#dcdcd6] bg-bg px-[18px] py-[30px] text-center">
            <div className="text-[15px] font-[650] tracking-[-0.01em]">{t.jobListTitle}</div>
            <div className="max-w-[32ch] text-[12.5px] leading-[1.55] text-muted">{t.noYoursYet}</div>
            <Button onClick={() => setAdding(true)}>
              <Icon name="plus" /> {t.addJobsLabel}
            </Button>
          </div>
        )}

        {shown.length > 0 && (
          <>
            <div className="overflow-hidden rounded-card border border-line bg-bg">
              {shown.map((q) => (
                <Row
                  key={q.id}
                  lead={<FitChip score={scoreOf(q.url)} />}
                  title={q.title || urlLabel(q.url)}
                  sub={q.company || (scoreOf(q.url) === undefined ? t.notScoredYet : urlLabel(q.url))}
                  right={<Button variant="link" className="text-faint" onClick={() => skip(q.id)}>{t.skip}</Button>}
                />
              ))}
            </div>
            <Button size="lg" onClick={() => { setRunAt(0); nav.push('run') }}>
              {t.startApplying} &rarr;
            </Button>
            <Button variant="ghost" wide onClick={() => setAdding(true)}>
              <Icon name="plus" /> {t.addJobsLabel}
            </Button>
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
      <Button wide disabled={!text.trim()} onClick={() => onAdd(text)}>
        {t.addToList}
      </Button>
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
