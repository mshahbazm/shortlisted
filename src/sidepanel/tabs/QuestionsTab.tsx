import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { normalizeQuestion } from '../../lib/questions'
import { BankAnswer, uid } from '../../lib/types'
import { polishAnswer } from '../../ai/run'
import * as store from '../../lib/store'
import { Button, Rows, Textarea } from '../ui'

// "What I know about you": each entry reads as a statement (the AI-polished
// sentence), with the original question as small print. The user edits the
// RAW answer — the truth source — and the polish is redone from it.

/** `bank` = what we already know about you. `pending` = what a form asked
 *  that we could not answer. Two different jobs, so Profile shows them as
 *  two tabs rather than one scroll. */
export function QuestionsTab({ view }: { view: 'bank' | 'pending' }) {
  const t = useContent('questions')
  const [pending] = useStore('pendingQuestions')
  const [bank] = useStore('answerBank')
  const [settings] = useStore('settings')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const repolish = async (id: string, question: string, answer: string) => {
    try {
      const polished = await polishAnswer(settings, question, answer)
      if (!polished) return
      await store.update('answerBank', (b) =>
        b.map((x) => (x.id === id && x.answer === answer ? { ...x, polished } : x)),
      )
    } catch {
      // Raw answer keeps working; polish is a bonus.
    }
  }

  // The background writes this bank constantly (form saves, polish, intake) —
  // every mutation must run against the live list, never this render's copy.
  const answerPending = (id: string) => {
    const q = pending.find((p) => p.id === id)
    const answer = (drafts[id] ?? '').trim()
    if (!q || !answer) return
    const norm = normalizeQuestion(q.questionRaw)
    let targetId = ''
    void store
      .update('answerBank', (b) => {
        const existing = b.find((a) => a.questionNorm === norm)
        if (existing) {
          targetId = existing.id
          return b.map((a) => (a.id === existing.id ? { ...a, answer, polished: undefined, lastUsedAt: Date.now() } : a))
        }
        targetId = uid()
        const fresh: BankAnswer = {
          id: targetId, questionNorm: norm, questionRaw: [q.questionRaw], answer,
          answerType: 'text', timesUsed: 0, lastUsedAt: Date.now(), sourceJobUrls: [q.jobUrl],
        }
        return [...b, fresh]
      })
      .then(() => void repolish(targetId, q.questionRaw, answer))
    dismissPending(id)
  }

  const dismissPending = (id: string) =>
    void store.update('pendingQuestions', (p) => p.filter((x) => x.id !== id))

  const removeAnswer = (id: string) => void store.update('answerBank', (b) => b.filter((x) => x.id !== id))

  const saveEdit = (a: BankAnswer) => {
    const answer = editText.trim()
    if (!answer) return
    void store.update('answerBank', (b) => b.map((x) => (x.id === a.id ? { ...x, answer, polished: undefined } : x)))
    setEditing(null)
    void repolish(a.id, a.questionRaw[0] ?? '', answer)
  }

  const lede = 'm-0 text-[12.5px] leading-normal text-muted'
  const card = 'flex flex-col gap-[9px] rounded-card border border-line p-3'
  const blank = 'px-3 py-[26px] text-center text-[13px] text-faint'

  return (
    <>
      <p className={lede}>{view === 'pending' ? t.pendingLede : t.hint}</p>

      {view === 'pending' && pending.length === 0 && <div className={blank}>{t.noPending}</div>}
      {view === 'pending' &&
        pending.map((q) => (
          <div key={q.id} className={card}>
            <div className="text-[11px] text-faint">
              <a href={q.jobUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                {t.fromThisJob}
              </a>
            </div>
            <div className="text-[13.5px] leading-[1.4] font-semibold">{q.questionRaw}</div>
            <Textarea rows={2} className={'resize-y leading-normal'}
              placeholder={t.yourAnswerPlaceholder}
              value={drafts[q.id] ?? ''}
              onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={() => answerPending(q.id)} disabled={!(drafts[q.id] ?? '').trim()}>
                {t.save}
              </Button>
              <Button variant="plain" size="sm" onClick={() => dismissPending(q.id)}>
                {t.dismiss}
              </Button>
            </div>
          </div>
        ))}

      {view === 'bank' && bank.length === 0 && <div className={blank}>{t.emptyState}</div>}

      {view === 'bank' && bank.length > 0 && (
        <Rows>
          {[...bank]
            .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
            .map((a) => (
              <div key={a.id} className="block border-b border-line px-3 py-[11px] last:border-b-0">
                {editing === a.id ? (
                  <div className="flex flex-col gap-[9px]">
                    <div className="text-[11px] text-faint">{t.askedAs(a.questionRaw[0] ?? '')}</div>
                    <Textarea
                      rows={3}
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" onClick={() => saveEdit(a)} disabled={!editText.trim()}>
                        {t.save}
                      </Button>
                      <Button variant="plain" size="sm" onClick={() => setEditing(null)}>
                        {t.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* The polished sentence reads as the answer; the question it
                        came from is small print. */}
                    <div className="text-[13.5px] font-semibold">{a.polished ?? a.answer}</div>
                    <div className="mt-[3px] flex items-baseline gap-2">
                      <span className="flex-1 text-[11.5px] text-muted">{t.askedAs(a.questionRaw[0] ?? '')}</span>
                      {a.timesUsed > 0 && (
                        <span className="rounded-[5px] bg-[#f5f5f3] px-[7px] py-[2.5px] text-[11px] whitespace-nowrap text-muted">
                          {t.timesUsed(a.timesUsed)}
                        </span>
                      )}
                      <Button variant="link" onClick={() => { setEditing(a.id); setEditText(a.answer) }}>
                        {t.edit}
                      </Button>
                      <Button variant="link" className="text-faint" onClick={() => removeAnswer(a.id)}>
                        {t.remove}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
        </Rows>
      )}
    </>
  )
}
