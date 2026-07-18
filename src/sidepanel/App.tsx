import { useEffect, useState } from 'react'
import { useStore } from './hooks'
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
  // Read the onboarded flag once, directly — the useStore default would
  // flash the wizard for already-onboarded users while storage loads.
  const [ready, setReady] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    void Promise.all([store.get('settings'), store.get('profile')]).then(([s, p]) => {
      setShowWizard(!s.onboarded && !p.identity.firstName && p.work.length === 0)
      setReady(true)
    })
  }, [])

  if (!ready) return null
  if (showWizard) return <Onboarding onDone={() => setShowWizard(false)} />

  return (
    <>
      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t}
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
