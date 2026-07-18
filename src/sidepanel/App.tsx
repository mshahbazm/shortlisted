import { useEffect, useState } from 'react'
import { useStore } from './hooks'
import { useContent } from '../i18n'
import { Onboarding } from './Onboarding'
import { ApplyTab } from './tabs/ApplyTab'
import { ProfileTab } from './tabs/ProfileTab'
import { ResumesTab } from './tabs/ResumesTab'
import { QuestionsTab } from './tabs/QuestionsTab'
import { SettingsTab } from './tabs/SettingsTab'
import * as store from '../lib/store'

const TABS = ['Apply', 'Profile', 'CVs', 'Answers', 'Settings'] as const
type Tab = (typeof TABS)[number]

export function App() {
  const [tab, setTab] = useState<Tab>('Apply')
  const [pending] = useStore('pendingQuestions')
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
    void store.get('settings').then((s) => {
      setSignedIn(Boolean(s.accountEmail))
      setReady(true)
    })
    return store.onChange('settings', (s) => setSignedIn(Boolean(s?.accountEmail)))
  }, [])

  if (!ready) return null
  // No local mode: the panel requires an account. The wizard carries both
  // paths — new users verify their email at the end, returning users log in
  // from the welcome screen. Either way, verifying flips settings.accountEmail
  // and the storage subscription above lets them through.
  if (!signedIn) return <Onboarding onDone={() => undefined} />

  return (
    <>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {tabLabels[t]}
            {t === 'Answers' && pending.length > 0 && <span className="dot">{pending.length}</span>}
          </button>
        ))}
      </nav>
      <main className="page">
        {tab === 'Apply' && <ApplyTab />}
        {tab === 'Profile' && <ProfileTab />}
        {tab === 'CVs' && <ResumesTab />}
        {tab === 'Answers' && <QuestionsTab />}
        {tab === 'Settings' && <SettingsTab />}
      </main>
    </>
  )
}
