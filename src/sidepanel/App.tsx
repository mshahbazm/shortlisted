import { useEffect, useRef, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { Onboarding } from './Onboarding'
import { HomeTab } from './tabs/HomeTab'
import { JobsTab } from './tabs/JobsTab'
import { ProfileTab } from './tabs/ProfileTab'
import { ResumesTab } from './tabs/ResumesTab'
import { SettingsTab } from './tabs/SettingsTab'
import { TabIcon } from './ui'
import { cn } from '../lib/cn'
import { Toasts } from './toast'
import * as store from '../lib/store'

// Four destinations. Settings is rare enough to live behind the gear, and the
// answer bank is profile data, so it lives inside Profile rather than taking a
// tab of its own. Jobs earns one: it is where a session actually starts.
const TABS = ['home', 'jobs', 'profile', 'cvs'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [focusTellMe, setFocusTellMe] = useState(false)
  const t = useContent('nav')

  // Navigation hints from outside the panel ("Update profile" on the fit
  // report): consume once, then clear.
  useEffect(() => {
    const consume = (nav: string) => {
      if (nav !== 'tellme') return
      setTab('profile')
      setSettingsOpen(false)
      setFocusTellMe(true)
      void store.set('pendingNav', '')
    }
    void store.get('pendingNav').then(consume)
    return store.onChange('pendingNav', consume)
  }, [])

  // Read settings once for the initial decision (the useStore default would
  // flash the wizard for signed-in users while storage loads), then stay
  // subscribed so signing out re-engages the gate.
  const [ready, setReady] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  const wasSignedIn = useRef(false)

  useEffect(() => {
    // Both flags matter: sign-in happens mid-wizard now (review/answers can
    // follow it), so only accountEmail + onboarded together open the app.
    const open = (s: { accountEmail?: string; onboarded?: boolean } | undefined) => {
      const next = Boolean(s?.accountEmail && s?.onboarded)
      // Landing after sign-in: the moment we cross signed-out → signed-in
      // (the wizard finishing, for a new or a returning user), force Home with
      // no overlay. Only on the transition, so an ordinary settings change
      // while signed in doesn't yank the user off whatever tab they're on.
      if (next && !wasSignedIn.current) {
        setTab('home')
        setSettingsOpen(false)
      }
      wasSignedIn.current = next
      setSignedIn(next)
      // Otherwise signing out while Settings is open leaves it open for
      // whoever signs in next — they'd land on Settings instead of Home.
      if (!next) {
        setSettingsOpen(false)
        setTab('home')
      }
    }
    void store.get('settings').then((s) => {
      open(s)
      setReady(true)
    })
    return store.onChange('settings', open)
  }, [])

  if (!ready) return null
  // No local mode: the panel requires an account. The wizard carries both
  // paths — new users verify their email mid-flow, returning users log in
  // from the welcome screen.
  if (!signedIn) return <Onboarding onDone={() => undefined} />

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

  const label: Record<Tab, string> = { home: t.home, jobs: t.jobs, profile: t.profile, cvs: t.cvs }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {tab === 'home' && (
          <HomeTab
            onGoProfile={() => go('profile')}
            onGoJobs={() => go('jobs')}
            onGoCvs={() => go('cvs')}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        )}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'profile' && (
          <ProfileTab focusTellMe={focusTellMe} onOpenSettings={() => setSettingsOpen(true)} />
        )}
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
              setFocusTellMe(false)
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
