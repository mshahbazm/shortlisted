import { useEffect, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { Onboarding } from './Onboarding'
import { HomeTab } from './tabs/HomeTab'
import { ProfileTab } from './tabs/ProfileTab'
import { ResumesTab } from './tabs/ResumesTab'
import { SettingsTab } from './tabs/SettingsTab'
import { Icon, ScreenHead } from './ui'
import { Toasts } from './toast'
import * as store from '../lib/store'

// Three destinations, down from five. Settings is rare enough to live behind
// the gear, and the answer bank is profile data, so it lives inside Profile
// rather than competing for a fifth of the tab bar.
const TABS = ['home', 'profile', 'cvs'] as const
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

  useEffect(() => {
    // Both flags matter: sign-in happens mid-wizard now (review/answers can
    // follow it), so only accountEmail + onboarded together open the app.
    const open = (s: { accountEmail?: string; onboarded?: boolean } | undefined) =>
      setSignedIn(Boolean(s?.accountEmail && s?.onboarded))
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
        <div className="shell">
          <ScreenHead title={t.settings} onBack={() => setSettingsOpen(false)} backLabel={t.back} />
          <div className="p-body">
            <SettingsTab />
          </div>
        </div>
        <Toasts />
      </>
    )
  }

  const goProfile = () => {
    setTab('profile')
    setSettingsOpen(false)
  }

  return (
    <>
      <div className="shell">
        {tab === 'home' && <HomeTab onGoProfile={goProfile} onOpenSettings={() => setSettingsOpen(true)} />}
        {tab === 'profile' && (
          <ProfileTab focusTellMe={focusTellMe} onOpenSettings={() => setSettingsOpen(true)} />
        )}
        {tab === 'cvs' && (
          <div className="p-body">
            <ResumesTab />
          </div>
        )}
      </div>
      <nav className="tabbar">
        {TABS.map((name) => (
          <button
            key={name}
            className={name === tab ? 'active' : ''}
            onClick={() => {
              setTab(name)
              setFocusTellMe(false)
            }}
          >
            <span className="tb-i" />
            {name === 'home' ? t.home : name === 'profile' ? t.profile : t.cvs}
          </button>
        ))}
      </nav>
      <Toasts />
    </>
  )
}
