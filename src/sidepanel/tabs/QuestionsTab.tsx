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
  const [pending, savePending] = useStore('pendingQuestions')
  const [bank, saveBank] = useStore('answerBank')
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

  const answerPending = (id: string) => {
    const q = pending.find((p) => p.id === id)
    const answer = (drafts[id] ?? '').trim()
    if (!q || !answer) return
    const norm = normalizeQuestion(q.questionRaw)
    const existing = bank.find((a) => a.questionNorm === norm)
    if (existing) {
      saveBank(bank.map((a) => (a.id === existing.id ? { ...a, answer, polished: undefined, lastUsedAt: Date.now() } : a)))
      void repolish(existing.id, q.questionRaw, answer)
    } else {
      const fresh: BankAnswer = {
        id: uid(), questionNorm: norm, questionRaw: [q.questionRaw], answer,
        answerType: 'text', timesUsed: 0, lastUsedAt: Date.now(), sourceJobUrls: [q.jobUrl],
      }
      saveBank([...bank, fresh])
      void repolish(fresh.id, q.questionRaw, answer)
    }
    savePending(pending.filter((p) => p.id !== id))
  }

  const saveEdit = (a: BankAnswer) => {
    const answer = editText.trim()
    if (!answer) return
    saveBank(bank.map((x) => (x.id === a.id ? { ...x, answer, polished: undefined } : x)))
    setEditing(null)
    void repolish(a.id, a.questionRaw[0] ?? '', answer)
  }

  return (
    <div>
      <h2>{t.title}</h2>
      <p className="hint">{t.hint}</p>

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {pending.map((q) => (
            <div key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="title" style={{ fontWeight: 550, fontSize: '13.5px' }}>{q.questionRaw}</div>
              <div className="sub" style={{ color: 'var(--muted)', fontSize: 12 }}>
                <a href={q.jobUrl} target="_blank" rel="noreferrer">{t.fromThisJob}</a>
              </div>
              <div className="spacer" />
              <textarea
                rows={2}
                placeholder={t.yourAnswerPlaceholder}
                value={drafts[q.id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
              />
              <div className="spacer" />
              <div className="row">
                <button className="primary small" onClick={() => answerPending(q.id)} disabled={!(drafts[q.id] ?? '').trim()}>
                  {t.save}
                </button>
                <button className="link small" onClick={() => savePending(pending.filter((p) => p.id !== q.id))}>
                  {t.dismiss}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bank.length === 0 && pending.length === 0 && (
        <div className="empty">{t.emptyState}</div>
      )}

      {bank.length > 0 && (
        <div className="list">
          {[...bank].sort((a, b) => b.lastUsedAt - a.lastUsedAt).map((a) => (
            <div key={a.id} className="list-item" style={{ display: 'block' }}>
              {editing === a.id ? (
                <>
                  <div className="sub" style={{ fontSize: 12 }}>{t.askedAs(a.questionRaw[0] ?? '')}</div>
                  <div className="spacer" />
                  <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <div className="spacer" />
                  <div className="row">
                    <button className="primary small" onClick={() => saveEdit(a)} disabled={!editText.trim()}>
                      {t.save}
                    </button>
                    <button className="link small" onClick={() => setEditing(null)}>{t.cancel}</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="title" style={{ fontWeight: 550 }}>{a.polished ?? a.answer}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginTop: 2 }}>
                    <div className="sub" style={{ flex: 1, fontSize: 11.5 }}>{t.askedAs(a.questionRaw[0] ?? '')}</div>
                    {a.timesUsed > 0 && <span className="chip">{t.timesUsed(a.timesUsed)}</span>}
                    <button className="link small" onClick={() => { setEditing(a.id); setEditText(a.answer) }}>{t.edit}</button>
                    <button className="danger small" onClick={() => saveBank(bank.filter((x) => x.id !== a.id))}>✕</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
