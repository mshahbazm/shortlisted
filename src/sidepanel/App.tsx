import { useEffect, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { Onboarding } from './Onboarding'
import { ApplyTab } from './tabs/ApplyTab'
import { ProfileTab } from './tabs/ProfileTab'
import { ResumesTab } from './tabs/ResumesTab'
import { QuestionsTab } from './tabs/QuestionsTab'
import { SettingsTab } from './tabs/SettingsTab'
import { Toasts } from './toast'
import * as store from '../lib/store'

const TABS = ['Apply', 'Profile', 'CVs', 'Answers', 'Settings'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const [tab, setTab] = useState<Tab>('Apply')
  const [focusTellMe, setFocusTellMe] = useState(false)
  const [pending] = useStore('pendingQuestions')

  // Navigation hints from outside the panel ("Update profile" on the fit
  // report): consume once, then clear.
  useEffect(() => {
    const consume = (nav: string) => {
      if (nav !== 'tellme') return
      setTab('Profile')
      setFocusTellMe(true)
      void store.set('pendingNav', '')
    }
    void store.get('pendingNav').then(consume)
    return store.onChange('pendingNav', consume)
  }, [])
  const t = useContent('nav')
  const tabLabels: Record<Tab, string> = {
    Apply: t.apply, Profile: t.profile, CVs: t.cvs, Answers: t.answers, Settings: t.settings,
  }
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
  // from the welcome screen. finish() sets onboarded and the storage
  // subscription above lets them through.
  if (!signedIn) return <Onboarding onDone={() => undefined} />

  return (
    <>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => { setTab(t); setFocusTellMe(false) }}>
            {tabLabels[t]}
            {t === 'Answers' && pending.length > 0 && <span className="dot">{pending.length}</span>}
          </button>
        ))}
      </nav>
      <main className="page">
        {tab === 'Apply' && <ApplyTab />}
        {tab === 'Profile' && <ProfileTab focusTellMe={focusTellMe} />}
        {tab === 'CVs' && <ResumesTab />}
        {tab === 'Answers' && <QuestionsTab />}
        {tab === 'Settings' && <SettingsTab />}
      </main>
      <Toasts />
    </>
  )
}
