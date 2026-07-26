import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { Body, Segments, TopBar, IconButton } from '../ui'
import { QuestionsTab } from './QuestionsTab'
import { cloudBaseUrl } from '../../lib/config'

// The answer bank — what used to be two of the three segments inside Profile.
//
// Profile EDITING now lives on the web (shortlist.id/dashboard/profile). It
// left the panel on purpose: the panel's job is the moment you are applying,
// and building a CV is a sit-down task that a 400px column was always fighting.
// A read-only mirror was the obvious middle ground and the wrong one — it would
// still track every schema change, at nearly the maintenance cost of an editable
// one, for something you cannot act on.
//
// What stays is the half that IS in-context: the answers you have given, and
// the questions a form asked that we could not answer yet.
export function AnswersTab({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useContent('profile')
  const [pending] = useStore('pendingQuestions')
  const [bank] = useStore('answerBank')
  const [seg, setSeg] = useState<'bank' | 'pending'>('bank')

  return (
    <>
      <TopBar title={t.answerBankTitle} right={<IconButton icon="gear" onClick={onOpenSettings} aria-label={t.settings} />} />
      <Body screen={`answers-${seg}`}>
        {/* The unanswered count lives here and nowhere else — it is only
            actionable on this screen. */}
        <Segments
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'bank', label: t.answerBankTitle + (bank.length ? ` ${bank.length}` : '') },
            { value: 'pending', label: t.segUnanswered + (pending.length ? ` ${pending.length}` : '') },
          ]}
        />

        {seg === 'bank' && <QuestionsTab view="bank" />}
        {seg === 'pending' && <QuestionsTab view="pending" />}

        {/* The one pointer out. Without it, a user who wants to fix a job title
            has no idea where their profile went. */}
        <a
          href={`${cloudBaseUrl()}/dashboard/profile`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block rounded-lg border border-line px-3 py-2.5 text-[12.5px] text-muted no-underline hover:text-ink"
        >
          {t.manageProfileOnWeb}
        </a>
      </Body>
    </>
  )
}
