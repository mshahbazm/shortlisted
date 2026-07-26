import { useEffect, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { EntryWizard } from './wizards/entry'
import { HomeTab } from './tabs/HomeTab'
import { JobsTab } from './tabs/JobsTab'
import { AnswersTab } from './tabs/AnswersTab'
import { ResumesTab } from './tabs/ResumesTab'
import { SettingsTab } from './tabs/SettingsTab'
import { TabIcon } from './ui'
import { cn } from '../lib/cn'
import { Toasts } from './toast'
import * as store from '../lib/store'

// Four destinations. Settings is rare enough to live behind the gear. Jobs
// earns one: it is where a session actually starts.
//
// Profile EDITING is not here — it moved to the web app, where there is room
// for it. What the panel keeps is the answer bank, which is the half that is
// actually in-context while you apply, so it takes the tab Profile used to.
const TABS = ['home', 'jobs', 'answers', 'cvs'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const t = useContent('nav')

  // ---------- routing ----------
  // One rule: signed out -> the Entry wizard; signed in -> the app (Home).
  // There is no build wizard here any more — profile building moved to the web,
  // so the panel's only gate is whether you are signed in.
  const [settings, , settingsLoaded] = useStore('settings')
  const loggedIn = Boolean(settings.accountEmail)

  // The entry wizard, once shown, stays until it calls onDone — so it survives
  // the moment auth flips `loggedIn` mid-flow.
  const [activeWizard, setActiveWizard] = useState<null | 'entry'>(null)
  useEffect(() => {
    // Guard on settingsLoaded: before storage loads, `settings` is the default
    // (no accountEmail), so `loggedIn` is briefly false. Effects still run even
    // while the render is gated to null — without this guard the latch would pin
    // 'entry' during that loading frame and strand a signed-in user on the
    // welcome screen after reload.
    if (settingsLoaded && activeWizard === null && !loggedIn) setActiveWizard('entry')
  }, [settingsLoaded, activeWizard, loggedIn])

  const closeWizard = (land: Tab = 'home') => {
    setActiveWizard(null)
    setTab(land)
    setSettingsOpen(false)
  }

  if (!settingsLoaded) return null
  // Signed out ALWAYS goes to Entry — even mid-Build. This is the self-heal for
  // an expired session: any account call 401s → cloudCall clears the session →
  // `loggedIn` flips false → here we leave the Build wizard for sign-in, instead
  // of looping on a wizard whose calls keep 401ing.
  const onEntryDone = () => closeWizard('home')
  if (!loggedIn) return <EntryWizard onDone={onEntryDone} />
  if (activeWizard === 'entry') return <EntryWizard onDone={onEntryDone} />

  // Settings takes the whole panel rather than sitting behind a tab: it's a
  // place you visit deliberately and leave, not somewhere you switch between.
  if (settingsOpen) {
    return (
      <>
        <div className="flex min-h-0 flex-1 flex-col">
          <SettingsTab onClose={() => setSettingsOpen(false)} />
        </div>
        <Toasts />
      </>
    )
  }

  const go = (next: Tab) => {
    setTab(next)
    setSettingsOpen(false)
  }

  const label: Record<Tab, string> = { home: t.home, jobs: t.jobs, answers: t.answers, cvs: t.cvs }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'home' && (
          <HomeTab
            onGoAnswers={() => go('answers')}
            onGoJobs={() => go('jobs')}
            onGoCvs={() => go('cvs')}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'answers' && <AnswersTab onOpenSettings={() => setSettingsOpen(true)} />}
        {tab === 'cvs' && <ResumesTab />}
      </div>
      <nav className="grid flex-none grid-cols-4 border-t border-line bg-[#fcfcfb]">
        {TABS.map((name) => (
          <button
            key={name}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-[3px] border-0 bg-transparent px-1 pt-2 pb-[9px]',
              'text-[10.5px] font-semibold transition-colors',
              name === tab ? 'text-accent' : 'text-faint hover:text-muted',
            )}
            aria-current={name === tab ? 'page' : undefined}
            onClick={() => {
              setTab(name)
            }}
          >
            <TabIcon name={name} />
            {label[name]}
          </button>
        ))}
      </nav>
      <Toasts />
    </>
  )
}
