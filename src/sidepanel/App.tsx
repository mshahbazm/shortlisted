import { useEffect, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { EntryWizard } from './wizards/entry'
import { BuildWizard } from './wizards/build'
import { HomeTab } from './tabs/HomeTab'
import { JobsTab } from './tabs/JobsTab'
import { ProfileTab } from './tabs/ProfileTab'
import { ResumesTab } from './tabs/ResumesTab'
import { SettingsTab } from './tabs/SettingsTab'
import { TabIcon } from './ui'
import { cn } from '../lib/cn'
import { Toasts } from './toast'
import * as store from '../lib/store'
import { hasProfileContent } from '../lib/types'
import { sendMsg } from '../lib/messaging'

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

  // ---------- routing ----------
  // Which screen the panel shows is decided by DATA, not a flag: are you signed
  // in, and does your account have a profile? Both are server-synced, so a plain
  // reload always lands on the right screen. Three destinations:
  //   - not signed in            -> the Entry wizard (import CV / start / log in)
  //   - signed in, has a profile -> the app (Home)
  //   - signed in, no profile    -> the Build wizard ("let's build your resume")
  const [settings, , settingsLoaded] = useStore('settings')
  const [profile, , profileLoaded] = useStore('profile')
  const loaded = settingsLoaded && profileLoaded
  const loggedIn = Boolean(settings.accountEmail)
  const hasProfile = hasProfileContent(profile)

  // Cold cache: signed in but this device hasn't pulled the profile yet. Kick a
  // pull and wait (bounded) rather than mistaking an empty local cache for a new
  // user. A warm cache (hasProfile) short-circuits this — no wait, no flash.
  const [pulled, setPulled] = useState(false)
  useEffect(() => {
    if (!loggedIn) {
      setPulled(false)
      return
    }
    let alive = true
    void sendMsg({ type: 'cloudPull' }).finally(() => alive && setPulled(true))
    const timer = setTimeout(() => alive && setPulled(true), 4000)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [loggedIn])

  const desired: 'checking' | 'entry' | 'build' | 'home' = !loaded
    ? 'checking'
    : !loggedIn
      ? 'entry'
      : hasProfile
        ? 'home'
        : !pulled
          ? 'checking'
          : 'build'

  // Latch: `desired` STARTS a wizard, the wizard ENDS itself (onDone). Once one
  // is showing it stays until then — so saving the profile mid-build (or
  // extracting mid-review) can't yank the user to Home. Sign-out drops back to
  // Entry.
  const [activeWizard, setActiveWizard] = useState<null | 'entry' | 'build'>(null)
  useEffect(() => {
    if (activeWizard === null && (desired === 'entry' || desired === 'build')) setActiveWizard(desired)
    else if (activeWizard === 'build' && desired === 'entry') setActiveWizard('entry')
  }, [activeWizard, desired])

  const leaveWizard = () => {
    setActiveWizard(null)
    setTab('home')
    setSettingsOpen(false)
  }

  if (!loaded) return null
  // Fall back to `desired` on the render before the latch effect fires, so a
  // wizard shows immediately with no flash of the app underneath.
  const wizardScreen = activeWizard ?? (desired === 'entry' || desired === 'build' ? desired : null)
  if (wizardScreen === 'entry') return <EntryWizard onDone={leaveWizard} />
  if (wizardScreen === 'build') return <BuildWizard onDone={leaveWizard} />
  if (desired === 'checking') return <Splash />

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

/** The brief "settling the profile question" state — a warm cache never sees it. */
function Splash() {
  return (
    <div className="flex min-h-full items-center justify-center">
      <span className="inline-block size-5 animate-spin rounded-full border-2 border-line border-t-fg" />
    </div>
  )
}
