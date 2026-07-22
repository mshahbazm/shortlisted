// Home. Replaces the old Apply tab.
//
// The top of the screen is one slot with four states, decided by what the
// active tab actually is. The rule underneath all of them: never render a
// disabled primary button — when the main action isn't available, a different
// action takes its place.

import { useEffect, useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { cn } from '../../lib/cn'
import { Body, Button, Card, Chip, Composer, Cost, FIELD, Feature, Icon, IconButton, Pill, Row, ScreenHead, Textarea, TopBar, useStack } from '../ui'
import { PageContext, sendMsg } from '../../lib/messaging'
import * as store from '../../lib/store'
import { ApplicationRecord, base64ToBytes, resumeHelpDone, uid } from '../../lib/types'
import { cloudProfileNote, cloudUsage, runScoreFit, ScoreFitResult } from '../../ai/run'
import { mergeIntakeFacts } from '../../lib/profileMerge'
import { showToast } from '../toast'
import { fitBand } from '../../lib/fitBands'

type FillErrorCode = 'noTab' | 'cannotFill' | 'noForm'
const FILL_ERRORS = { noTab: 'fillNoTab', cannotFill: 'fillCannotFill', noForm: 'fillNoForm' } as const

/** What the panel knows about the tab in front of the user. `null` means no
 *  content script answered — a chrome:// or otherwise restricted page.
 *
 *  Keeping this current is harder than it looks, because there are three ways
 *  the answer can change and only one of them is a page load:
 *
 *    - a full navigation      -> tabs.onUpdated, status 'complete'
 *    - a client-side route    -> tabs.onUpdated, changeInfo.url, NO status
 *    - a form appearing in    -> no event of any kind exists for this
 *      place (modal, wizard
 *      step, lazy render)
 *
 *  Hence listeners for the first two and a gentle poll for the third. The poll
 *  is cheap: the content script caches its scoring per (url, field count), so
 *  a tick on an unchanged page is a message round trip and nothing else. */
const POLL_MS = 1500

/** Whether two readings would render identically. The poll runs on a timer, so
 *  without this every tick would hand React a fresh object and re-render Home
 *  a couple of times a second for no reason. Returning the previous value from
 *  the setter makes React bail out instead. */
function samePage(a: PageContext | null, b: PageContext | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return (
    a.url === b.url &&
    a.title === b.title &&
    a.hasFields === b.hasFields &&
    a.bubbleOpen === b.bubbleOpen &&
    a.isJobPage === b.isJobPage &&
    a.knownAts === b.knownAts &&
    a.fieldCount === b.fieldCount
  )
}

function usePageContext(): { page: PageContext | null; refresh: () => void } {
  const [ctx, setCtx] = useState<PageContext | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    let retry: ReturnType<typeof setTimeout> | undefined

    // The content script registers its listener at document_idle, so a read
    // fired the moment a tab reports 'complete' can land before anything is
    // listening. Treat an early miss as "not ready yet" and try again briefly
    // before concluding the page has nothing for us.
    const read = (attempt = 0) => {
      void sendMsg<PageContext | null>({ type: 'pageContext' })
        .then((c) => {
          if (!alive) return
          if (c) return setCtx((prev) => (samePage(prev, c) ? prev : c))
          if (attempt < 3) retry = setTimeout(() => read(attempt + 1), 200 * (attempt + 1))
          else setCtx(null)
        })
        .catch(() => {
          if (!alive) return
          if (attempt < 3) retry = setTimeout(() => read(attempt + 1), 200 * (attempt + 1))
          else setCtx(null)
        })
    }

    read()

    const onActivated = () => read()
    // `url` without `status` is a client-side route change — the case that
    // used to go completely unnoticed. Only the active tab matters.
    const onUpdated = (tabId: number, change: chrome.tabs.TabChangeInfo) => {
      if (change.status !== 'complete' && !change.url) return
      void chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (alive && tab?.id === tabId) read()
      })
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)

    // Catches everything the events cannot see. No retries on a poll tick: a
    // miss here just means we look again shortly anyway.
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') read(3)
    }, POLL_MS)

    return () => {
      alive = false
      clearTimeout(retry)
      clearInterval(poll)
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [tick])

  return { page: ctx, refresh: () => setTick((n) => n + 1) }
}

/** Credits left, from the free /v1/me call. Undefined until it lands — showing
 *  a placeholder "0 credits" would read as "you're out", which is worse than
 *  showing nothing for a moment. */
function useCreditsLeft(): number | undefined {
  const [settings] = useStore('settings')
  const [left, setLeft] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!settings.accountEmail) return
    let alive = true
    void cloudUsage(settings)
      .then((u) => alive && setLeft(Math.max(0, u.creditsLimit - u.creditsUsed)))
      .catch(() => undefined) // offline is not worth an error here
    return () => {
      alive = false
    }
  }, [settings.accountEmail]) // eslint-disable-line react-hooks/exhaustive-deps

  return left
}

export function HomeTab({
  onGoProfile,
  onGoJobs,
  onGoCvs,
  onOpenSettings,
  onBuildProfile,
}: {
  onGoProfile: () => void
  onGoJobs: () => void
  onGoCvs: () => void
  onOpenSettings: () => void
  onBuildProfile: () => void
}) {
  const t = useContent('home')
  const nav = useStack()
  const [queue] = useStore('queue')
  const [apps] = useStore('applications')
  const [settings] = useStore('settings')
  const [profile] = useStore('profile')
  const [resumes] = useStore('resumes')
  const { page, refresh: refreshPage } = usePageContext()
  const credits = useCreditsLeft()

  const [notice, setNotice] = useState('')
  const [fit, setFit] = useState<ScoreFitResult | null>(null)

  const todo = queue.filter((q) => q.status === 'todo')

  const fillCurrent = async () => {
    setNotice('')
    const res = await sendMsg<{ ok?: boolean; errorCode?: FillErrorCode }>({ type: 'fillCurrentTab' })
    setNotice(res?.errorCode ? t[FILL_ERRORS[res.errorCode]] : t.lookForPanel)
    // The fill mounted the on-page bubble, so this card's answer just
    // changed — re-read rather than leaving a stale offer on screen.
    refreshPage()
  }

  const saveCurrentJob = () => {
    if (!page) return
    // Dedup against the LIVE queue, not this render's copy.
    void store.update('queue', (q) =>
      q.some((x) => x.url === page.url)
        ? q
        : [
            ...q,
            {
              id: uid(),
              url: page.url,
              title: page.title,
              company: page.company,
              tags: [],
              status: 'todo' as const,
              addedAt: Date.now(),
            },
          ],
    )
    showToast(t.addedJobs(1))
  }

  /* ---------- pushed screens ---------- */

  if (nav.screen === 'applied') {
    return (
      <>
        <ScreenHead title={t.appliedTitle(apps.length)} onBack={nav.back} backLabel={t.back} />
        <Body screen={nav.screen}>
          {apps.length === 0 && <div className="px-3 py-[26px] text-center text-[13px] text-faint">{t.appliedEmpty}</div>}
          {apps.length > 0 && (
            <>
              {/* We filled the form, so we know it was sent. We have no inbox
                  access, so everything past that is the user's to mark. */}
              <div className="rounded-[9px] bg-hover px-3 py-[11px] text-[12.5px] leading-[1.55] text-muted">
                <b>{t.noInbox}</b> {t.noInboxBody}
              </div>
              <div className="flex flex-col gap-2.5">
                {[...apps]
                  .sort((a, b) => b.appliedAt - a.appliedAt)
                  .map((a) => (
                    <AppliedCard key={a.id} app={a} resumes={resumes} t={t} />
                  ))}
              </div>
            </>
          )}
        </Body>
      </>
    )
  }


  if (nav.screen === 'fit') {
    return (
      <>
        <ScreenHead title={t.yourFit} onBack={nav.back} backLabel={t.back} />
        <Body screen={nav.screen}>
          <FitPanel
            t={t}
            result={fit}
            onResult={setFit}
            disabled={profile.work.length === 0}
            run={(jobText, onStep) => runScoreFit(settings, profile, jobText, onStep)}
            onUpdateProfile={onGoProfile}
            onSaveJob={saveCurrentJob}
          />
        </Body>
      </>
    )
  }

  /* ---------- root ---------- */

  return (
    <>
      <TopBar
        title={t.appName}
        right={
          <>
            {credits !== undefined && (
              <button className="cursor-pointer rounded-full border-0 bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent hover:bg-[#e6e0ff]" onClick={onOpenSettings}>{t.credits(credits)}</button>
            )}
            <IconButton icon="gear" onClick={onOpenSettings} aria-label={t.settings} />
          </>
        }
      />
      <Body screen={nav.screen}>
        {/* Hasn't been through the resume builder yet — the one thing that
            unlocks everything else. A whole CTA up top, like the "fill this
            page" one, that opens the builder. Gated by a durable flag (they
            went through the wizard), not by whether a stray field is filled. */}
        {!resumeHelpDone(profile) && (
          <div className="flex w-full flex-col gap-[3px] rounded-xl border border-line bg-gradient-to-b from-[#faf9ff] to-bg p-3.5">
            <span className="text-base leading-[1.25] font-[650] tracking-[-0.01em]">{t.buildProfileTitle}</span>
            <span className="mb-3 text-[12.5px] leading-normal text-muted">{t.buildProfileSub}</span>
            <Button size="lg" onClick={onBuildProfile}>{t.buildProfileCta}</Button>
          </div>
        )}
        <ContextSlot page={page} t={t} onFill={fillCurrent} onFit={() => nav.push('fit')} onSave={saveCurrentJob} />
        {notice && <p className="my-1 text-[13px] text-muted">{notice}</p>}

        <div className="grid grid-cols-2 gap-[9px]">
          <Feature
            icon="bolt"
            accent
            title={t.checkMyFit}
            sub={page?.isJobPage ? t.checkMyFitSub : t.checkMyFitSubGeneric}
            cost={t.oneCredit}
            onClick={() => nav.push('fit')}
          />
          <Feature
            icon="doc"
            title={t.tailorACv}
            sub={page?.isJobPage ? t.tailorACvSub : t.tailorACvSubGeneric}
            cost={t.oneCredit}
            onClick={onGoCvs}
          />
        </div>

        {/* Detection is good, not perfect. When we're on a real page and saw
            nothing, offer the manual route rather than leaving the user stuck
            — fillCurrentTab force-injects and fills regardless of what the
            detector decided. `page === null` means a chrome:// or restricted
            page, where we genuinely cannot help, so nothing is offered. */}
        {page && !page.hasFields && !page.bubbleOpen && (
          <div className="-mt-1 flex flex-wrap items-center gap-2 text-xs leading-normal text-faint">
            <span>{t.missedJob}</span>
            <button onClick={fillCurrent}>{t.fillAnyway} &rarr;</button>
          </div>
        )}


        {/* A doorway, not a section. Adding jobs happens on the Jobs screen —
            the dashboard should never carry a paste box. */}
        <button className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg p-3.5 text-left transition hover:border-[#dcdcd6] hover:shadow-lift-hover" onClick={onGoJobs}>
          <span className="grid size-[34px] shrink-0 place-items-center rounded-[9px] bg-accent-soft text-accent"><Icon name="briefcase" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-[650] tracking-[-0.01em]">{t.jobListTitle}</span>
            <span className="text-xs leading-[1.4] text-muted">{todo.length > 0 ? t.yourListSub : t.noneSavedYet}</span>
          </span>
          {todo.length > 0 && <span className="rounded-full bg-accent-soft px-[9px] py-[3px] text-xs font-[650] whitespace-nowrap text-accent">{todo.length}</span>}
          <Icon name="chev" />
        </button>

        {/* Nothing to add to yet before the profile exists — the build CTA above
            is the only relevant action, so the "Update Profile" composer hides. */}
        {resumeHelpDone(profile) && <TellMeComposer t={t} />}

        {apps.length > 0 && (
          /* `apart` — a different subject from the composer above it, so it gets
             twice the usual gap. */
          <div className="mt-5 flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between text-[11px] font-[650] tracking-[0.07em] text-muted uppercase">
              <span>{t.recentlyApplied}</span>
              <Button variant="link" onClick={() => nav.push('applied')}>{t.seeAllApplied(apps.length)}</Button>
            </div>
            <div className="overflow-hidden rounded-card border border-line bg-bg">
              {[...apps]
                .sort((a, b) => b.appliedAt - a.appliedAt)
                .slice(0, 2)
                .map((a) => (
                  <Row
                    key={a.id}
                    title={a.title || a.company}
                    sub={`${a.company} · ${new Date(a.appliedAt).toLocaleDateString()}`}
                    right={<Pill>{t.statusApplied}</Pill>}
                  />
                ))}
            </div>
          </div>
        )}
      </Body>
    </>
  )
}

/* ---------- context slot ---------- */

/** Four states. The bubble case is the important one: if the on-page panel is
 *  already offering to fill, repeating that offer here is just noise. */
function ContextSlot({
  page,
  t,
  onFill,
  onFit,
  onSave,
}: {
  page: PageContext | null
  t: ReturnType<typeof useContent<'home'>>
  onFill: () => void
  onFit: () => void
  onSave: () => void
}) {
  // A restricted page (chrome://, extension pages). No slot at all, so the paid
  // actions move up the screen instead of sitting under an empty banner.
  if (!page) return null

  // Two independent questions, and the answers do not imply each other:
  //   is this a job?     -> the detector scored it, or the URL is a known ATS
  //   are there fields?  -> weak on its own; a webmail search box is a field
  // Four combinations, four different things worth saying.
  const isJob = page.isJobPage || page.knownAts

  // The bubble is up: stand back, name the job, offer a way in.
  if (page.bubbleOpen) {
    return (
      <div className="flex flex-col gap-[3px] rounded-xl border border-dashed border-line bg-[#fafaf8] p-3.5">
        <div className="mb-[5px] flex items-center gap-[7px] text-[11px] font-[650] tracking-[0.05em] text-accent uppercase"><span className="size-[7px] shrink-0 rounded-full bg-current motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]" /> {t.onThisPage}</div>
        <div className="text-base leading-[1.25] font-[650] tracking-[-0.01em]">{page.title}</div>
        <div className="mb-[11px] text-[12.5px] text-muted">{page.company}{page.ats ? ` · ${page.ats}` : ''}</div>
        <div className="-mt-[5px] text-[12.5px] leading-normal text-muted">
          {t.bubbleOpenNote} <Button variant="link" onClick={onFill}>{t.bringItHere}</Button>
        </div>
      </div>
    )
  }

  // A job AND something to fill: an application form. The only case where we
  // assert it, and the only case where the page title is a job title.
  if (isJob && page.hasFields) {
    return (
      <div className="flex flex-col gap-[3px] rounded-xl border border-line bg-gradient-to-b from-[#faf9ff] to-bg p-3.5">
        <div className="mb-[5px] flex items-center gap-[7px] text-[11px] font-[650] tracking-[0.05em] text-accent uppercase"><span className="size-[7px] shrink-0 rounded-full bg-current motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]" /> {t.formOnThisTab}</div>
        <div className="text-base leading-[1.25] font-[650] tracking-[-0.01em]">{page.title}</div>
        <div className="mb-[11px] text-[12.5px] text-muted">
          {page.company}{page.ats ? ` · ${page.ats}` : ''} · {t.fieldCount(page.fieldCount)}
        </div>
        <Button size="lg" onClick={onFill}>{t.fillThisApplication}</Button>
        <div className="mt-[7px] text-center text-[11.5px] text-faint">{t.fillFoot}</div>
      </div>
    )
  }

  // A job with the apply form somewhere else — a description page. Nothing to
  // fill, so the two useful moves are saving it and scoring it.
  if (isJob) {
    return (
      <div className="flex flex-col gap-[3px] rounded-xl border border-line bg-gradient-to-b from-[#faf9ff] to-bg p-3.5">
        <div className="mb-[5px] flex items-center gap-[7px] text-[11px] font-[650] tracking-[0.05em] text-accent uppercase">{t.jobOnThisPage}</div>
        <div className="text-base leading-[1.25] font-[650] tracking-[-0.01em]">{page.title}</div>
        <div className="mb-[11px] text-[12.5px] text-muted">{page.company}</div>
        <div className="mb-[11px] text-[12.5px] leading-normal text-muted">{t.noFormHere}</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={onSave}>{t.saveToList}</Button>
          <Button onClick={onFit}>{t.checkMyFit}</Button>
        </div>
      </div>
    )
  }

  // Fields, but nothing saying they belong to an application. Ask rather than
  // announce, and do not dress the page title up as a job title. The offer
  // still stands — quietly, and phrased as the guess it is.
  if (page.hasFields) {
    return (
      <div className="flex flex-col gap-[3px] rounded-xl border border-dashed border-line bg-bg p-3.5">
        {/* The uncertainty belongs in the headline, not in the button. We are
            unsure whether this is an application; we are not unsure about our
            ability to fill it once the user says it is. */}
        <div className="text-base leading-[1.25] font-[650] tracking-[-0.01em]">{t.applyingHere}</div>
        <div className="mb-[11px] text-[12.5px] text-muted">{hostOf(page.url)} · {t.fieldCount(page.fieldCount)}</div>
        <div className="mb-[11px] text-[12.5px] leading-normal text-muted">{t.notRecognised}</div>
        <Button size="lg" onClick={onFill}>{t.fillThisPage}</Button>
        <div className="mt-[7px] text-center text-[11.5px] text-faint">{t.fillFoot}</div>
      </div>
    )
  }

  return null
}

/* ---------- pieces ---------- */

function AppliedCard({
  app,
  resumes,
  t,
}: {
  app: ApplicationRecord
  resumes: { id: string; label: string; dataBase64: string }[]
  t: ReturnType<typeof useContent<'home'>>
}) {
  const cv = app.resumeId ? resumes.find((r) => r.id === app.resumeId) : undefined
  const openPdf = () => {
    if (!cv) return
    const blob = new Blob([base64ToBytes(cv.dataBase64) as BlobPart], { type: 'application/pdf' })
    window.open(URL.createObjectURL(blob), '_blank')
  }
  const set = (status: ApplicationRecord['status']) =>
    void store.update('applications', (list) => list.map((x) => (x.id === app.id ? { ...x, status } : x)))

  const options: [ApplicationRecord['status'], string][] = [
    ['applied', t.statusApplied],
    ['interviewing', t.statusInterviewing],
    ['offer', t.statusOffer],
    ['rejected', t.statusRejected],
  ]

  return (
    <Card className="gap-1">
      <div className="text-[13.5px] font-[650]">{app.title || app.company}</div>
      <div className="mb-1.5 text-[11.5px] text-muted">
        {app.company} · {new Date(app.appliedAt).toLocaleDateString()}
        {cv && <> · <Button variant="link" onClick={openPdf}>{t.cvSent}</Button></>}
      </div>
      <div className="flex flex-wrap gap-[5px]">
        {options.map(([value, label]) => (
          <button key={value} className={cn('cursor-pointer rounded-full border px-2.5 py-[5px] text-[11.5px] font-semibold', app.status === value ? 'border-primary bg-primary text-primary-fg' : 'border-line bg-transparent text-muted hover:bg-hover')} onClick={() => set(value)}>
            {label}
          </button>
        ))}
      </div>
    </Card>
  )
}


/** "Something new to add?" — reports what the merge actually stored, never what
 *  the model proposed. A highlight for a job that isn't on file has nowhere to
 *  go, and claiming it saved is how a fact appears to vanish. */
function TellMeComposer({ t }: { t: ReturnType<typeof useContent<'home'>> }) {
  const [settings] = useStore('settings')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  return (
    <>
      <Composer
        label={t.composerLabel}
        placeholder={t.composerPlaceholder}
        hint={t.composerHint}
        submitLabel={t.composerSubmit}
        busy={busy}
        onSubmit={(text) => {
          setBusy(true)
          setMsg('')
          void cloudProfileNote(settings, text)
            .then(async (facts) => {
              let applied = 0
              let unplaced = 0
              await store.update('profile', (cur) => {
                const r = mergeIntakeFacts(cur, facts)
                applied = r.applied
                unplaced = r.unplacedHighlights
                return r.profile
              })
              if (applied === 0) {
                setMsg(unplaced > 0 ? t.composerNoJob : t.composerNothingNew)
                return
              }
              setMsg(t.composerSaved(applied))
              showToast(t.composerSaved(applied))
            })
            .catch((e) => setMsg(e instanceof Error ? e.message : String(e)))
            .finally(() => setBusy(false))
        }}
      />
      {msg && <p className="mt-1.5 text-xs leading-[1.45] text-faint">{msg}</p>}
    </>
  )
}

function FitPanel({
  t,
  result,
  onResult,
  disabled,
  run,
  onUpdateProfile,
  onSaveJob,
}: {
  t: ReturnType<typeof useContent<'home'>>
  result: ScoreFitResult | null
  onResult: (r: ScoreFitResult | null) => void
  disabled: boolean
  run: (jobText: string, onStep: (s: string) => void) => Promise<ScoreFitResult>
  onUpdateProfile: () => void
  onSaveJob: () => void
}) {
  const [jobText, setJobText] = useState('')
  const [step, setStep] = useState('')
  const [err, setErr] = useState('')

  if (result) {
    const score = result.fit.overallScore
    const band = fitBand(score)
    const low = band === 'longShot' || band === 'borderline'
    return (
      <>
        <div className="flex flex-col items-center pt-1 text-center">
          <div className={cn('flex items-baseline tabular-nums', low ? 'text-warn' : 'text-good')}>
            <span className="text-[44px] leading-none font-bold tracking-[-0.03em]">{score}</span>
            <span className="text-[17px] font-semibold opacity-55">/10</span>
          </div>
          <div className={cn('mb-2.5 text-[11px] font-bold tracking-[0.09em] uppercase', low ? 'text-warn' : 'text-good')}>{bandWord(band, t)}</div>
          <div className="max-w-[34ch] text-[13px] leading-[1.55] text-muted">{result.fit.verdict}</div>
        </div>
        {result.fit.strengths.length > 0 && (
          <div className="rounded-[9px] bg-accent-soft px-3 py-[11px] text-[12.5px] leading-normal text-[#2a1a7a]">
            <b>{t.leadWith}</b> {result.fit.strengths.join(' · ')}
          </div>
        )}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between text-[11px] font-[650] tracking-[0.07em] text-muted uppercase"><span>{t.howYouMatchUp}</span></div>
          <div className="overflow-hidden rounded-card border border-line">
            {result.fit.criteria.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 border-b border-line px-3 py-[11px] last:border-b-0">
                <span className={cn('mt-px grid size-[22px] shrink-0 place-items-center rounded-md text-[11.5px] font-bold tabular-nums', c.score >= 4 ? 'bg-good-bg text-good' : c.score >= 3 ? 'bg-accent-soft text-accent' : 'bg-warn-bg text-warn')}>{c.score}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[13px] leading-[1.35] font-semibold">{c.requirement}</span>
                  {!c.notObserved && c.commentary && <span className="text-[11.5px] leading-[1.4] text-muted">{c.commentary}</span>}
                </span>
                {c.notObserved ? (
                  <span className="mt-0.5 text-[10px] font-[650] tracking-[0.04em] whitespace-nowrap text-warn uppercase">{t.notShown}</span>
                ) : (
                  <span
                    className={cn(
                      'mt-0.5 text-[10px] font-[650] tracking-[0.04em] whitespace-nowrap uppercase',
                      c.relevance === 'direct'
                        ? 'text-good'
                        : c.relevance === 'transferable'
                          ? 'text-accent'
                          : 'text-warn',
                    )}
                  >
                    {c.relevance === 'direct' ? t.relDirect : c.relevance === 'transferable' ? t.relTransferable : t.relGap}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        {result.fit.gaps.length > 0 && (
          <div className="flex flex-col gap-2 rounded-card border border-warn-line bg-warn-bg p-3">
            <div className="text-[12.5px] font-[650] text-warn">{t.beReadyFor}</div>
            <div className="flex flex-wrap gap-1.5">
              {result.fit.gaps.map((g) => <Chip key={g} tone="amber">{g}</Chip>)}
            </div>
            <Button variant="link" className="text-warn" onClick={onUpdateProfile}>{t.gapsAddPrompt} &rarr;</Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" onClick={() => onResult(null)}>{t.scoreMyFit}</Button>
          <Button onClick={onSaveJob}>{t.saveTheJob}</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <Textarea className={"min-h-[110px] resize-y leading-normal"}
        rows={6}
        placeholder={t.pasteJobPlaceholder}
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
      />
      {disabled && <p className="mt-1.5 text-xs leading-[1.45] text-faint">{t.fillProfileFirst}</p>}
      <Button size="lg" disabled={disabled || !!step || jobText.trim().length < 80}
        onClick={() => {
          setErr('')
          run(jobText, setStep)
            .then(onResult)
            .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
            .finally(() => setStep(''))
        }}
      >
        {step ? t.scoring : t.scoreMyFit}
        {!step && <Cost onDark>{t.oneCredit}</Cost>}
      </Button>
      {step && <p className="my-1 text-[13px] text-muted">{step}</p>}
      {err && <p className="my-1 text-[13px] text-bad">{err}</p>}
    </>
  )
}

function bandWord(band: ReturnType<typeof fitBand> | undefined, t: ReturnType<typeof useContent<'home'>>): string {
  switch (band) {
    case 'strongFit': return t.fitStrongFit
    case 'goodFit': return t.fitGoodFit
    case 'worthAShot': return t.fitWorthAShot
    case 'borderline': return t.fitBorderline
    default: return t.fitLongShot
  }
}

/** Bare hostname. Used where we know which site we're on but have no
 *  business claiming to know what the page is. */
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
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
