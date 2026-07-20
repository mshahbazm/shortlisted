import { useState } from 'react'
import { useStore } from '../hooks'
import { useContent } from '../../i18n'
import { normalizeQuestion } from '../../lib/questions'
import { BankAnswer, uid } from '../../lib/types'
import { polishAnswer } from '../../ai/run'
import * as store from '../../lib/store'

// "What I know about you": each entry reads as a statement (the AI-polished
// sentence), with the original question as small print. The user edits the
// RAW answer — the truth source — and the polish is redone from it.

export function QuestionsTab() {
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

  return (
    <>
      <p className="lede">{t.hint}</p>

      {pending.map((q) => (
        <div key={q.id} className="qcard">
          <div className="q-meta">
            <a href={q.jobUrl} target="_blank" rel="noreferrer">{t.fromThisJob}</a>
          </div>
          <div className="q-q">{q.questionRaw}</div>
          <textarea
            rows={2}
            placeholder={t.yourAnswerPlaceholder}
            value={drafts[q.id] ?? ''}
            onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
          />
          <div className="q-act">
            <button className="primary small" onClick={() => answerPending(q.id)} disabled={!(drafts[q.id] ?? '').trim()}>
              {t.save}
            </button>
            <button className="plain small" onClick={() => dismissPending(q.id)}>{t.dismiss}</button>
          </div>
        </div>
      ))}

      {bank.length === 0 && pending.length === 0 && <div className="empty">{t.emptyState}</div>}

      {bank.length > 0 && (
        <div className="rows">
          {[...bank].sort((a, b) => b.lastUsedAt - a.lastUsedAt).map((a) => (
            <div key={a.id} className="row" style={{ display: 'block' }}>
              {editing === a.id ? (
                <div className="qcard" style={{ border: 'none', padding: 0 }}>
                  <div className="q-meta">{t.askedAs(a.questionRaw[0] ?? '')}</div>
                  <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <div className="q-act">
                    <button className="primary small" onClick={() => saveEdit(a)} disabled={!editText.trim()}>
                      {t.save}
                    </button>
                    <button className="plain small" onClick={() => setEditing(null)}>{t.cancel}</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* The polished sentence reads as the answer; the question it
                      came from is small print. */}
                  <div className="row-t" style={{ whiteSpace: 'normal' }}>{a.polished ?? a.answer}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 3 }}>
                    <span className="row-s" style={{ flex: 1 }}>{t.askedAs(a.questionRaw[0] ?? '')}</span>
                    {a.timesUsed > 0 && <span className="minichip">{t.timesUsed(a.timesUsed)}</span>}
                    <button className="link" onClick={() => { setEditing(a.id); setEditText(a.answer) }}>{t.edit}</button>
                    <button className="link muted" onClick={() => removeAnswer(a.id)}>{t.remove}</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
