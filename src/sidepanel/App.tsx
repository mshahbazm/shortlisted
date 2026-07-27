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
import { resumeHelpWanted } from '../lib/types'

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
  // One rule: not set up yet -> the Entry wizard; set up -> the app (Home). The
  // Build wizard is NOT a route — it's launched on demand from Home's "build
  // your profile" CTA (onBuildProfile below), which only shows when the profile
  // is empty. Simple, and the user drives it.
  //
  // The gate used to be "is there an account". It is now `onboarded`, set when
  // the Entry wizard finishes. Deliberately NOT `aiConfigured`: the wizard lets
  // you defer the AI setup, and someone who chose that should land in the app,
  // not be shown the welcome screen again every time they open the panel.
  const [settings, , settingsLoaded] = useStore('settings')
  const [profile] = useStore('profile')
  const onboarded = Boolean(settings.onboarded)
  const needsBuild = resumeHelpWanted(profile)

  // A wizard, once shown, stays until it calls onDone — so Entry survives the
  // moment auth flips `loggedIn` mid-flow (the has-CV door continues into
  // review/answers), and Build stays put while it saves the profile.
  const [activeWizard, setActiveWizard] = useState<null | 'entry' | 'build'>(null)
  useEffect(() => {
    // Guard on settingsLoaded: before storage loads, `settings` is the default
    // (not onboarded), so the flag is briefly false. Effects still run even
    // while the render is gated to null — without this guard the latch would pin
    // 'entry' during that loading frame and strand a set-up user on the welcome
    // screen after reload.
    if (settingsLoaded && activeWizard === null && !onboarded) setActiveWizard('entry')
  }, [settingsLoaded, activeWizard, onboarded])

  const closeWizard = () => {
    setActiveWizard(null)
    setTab('home')
    setSettingsOpen(false)
  }

  if (!settingsLoaded) return null
  if (!onboarded) return <EntryWizard onDone={closeWizard} />
  if (activeWizard === 'build') return <BuildWizard onDone={closeWizard} />
  if (activeWizard === 'entry') return <EntryWizard onDone={closeWizard} />

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
            onBuildProfile={() => setActiveWizard('build')}
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
              // This account asked for help building a profile — the tap opens
              // the builder instead of the (still-empty) profile page.
              if (name === 'profile' && needsBuild) {
                setActiveWizard('build')
                return
              }
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
