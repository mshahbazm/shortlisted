import { useState } from 'react'
import { useStore } from '../hooks'
import { normalizeQuestion } from '../../lib/questions'
import { BankAnswer, uid } from '../../lib/types'

export function QuestionsTab() {
  const [pending, savePending] = useStore('pendingQuestions')
  const [bank, saveBank] = useStore('answerBank')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const answerPending = (id: string) => {
    const q = pending.find((p) => p.id === id)
    const answer = (drafts[id] ?? '').trim()
    if (!q || !answer) return
    const norm = normalizeQuestion(q.questionRaw)
    const existing = bank.find((a) => a.questionNorm === norm)
    if (existing) {
      saveBank(bank.map((a) => (a.id === existing.id ? { ...a, answer, lastUsedAt: Date.now() } : a)))
    } else {
      const fresh: BankAnswer = {
        id: uid(), questionNorm: norm, questionRaw: [q.questionRaw], answer,
        answerType: 'text', timesUsed: 0, lastUsedAt: Date.now(), sourceJobUrls: [q.jobUrl],
      }
      saveBank([...bank, fresh])
    }
    savePending(pending.filter((p) => p.id !== id))
  }

  return (
    <div>
      <h2>Answers</h2>
      <p className="hint">Answer once, reused on every application that asks — in any phrasing.</p>

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {pending.map((q) => (
            <div key={q.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="title" style={{ fontWeight: 550, fontSize: '13.5px' }}>{q.questionRaw}</div>
              <div className="sub" style={{ color: 'var(--muted)', fontSize: 12 }}>
                <a href={q.jobUrl} target="_blank" rel="noreferrer">from this job</a>
              </div>
              <div className="spacer" />
              <textarea
                rows={2}
                placeholder="Your answer…"
                value={drafts[q.id] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [q.id]: e.target.value })}
              />
              <div className="spacer" />
              <div className="row">
                <button className="primary small" onClick={() => answerPending(q.id)} disabled={!(drafts[q.id] ?? '').trim()}>
                  Save
                </button>
                <button className="link small" onClick={() => savePending(pending.filter((p) => p.id !== q.id))}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {bank.length === 0 && pending.length === 0 && (
        <div className="empty">Fill an application — every question I can't answer lands here, once.</div>
      )}

      {bank.length > 0 && (
        <div className="list">
          {[...bank].sort((a, b) => b.lastUsedAt - a.lastUsedAt).map((a) => (
            <div key={a.id} className="list-item" style={{ display: 'block' }}>
              <div className="title">{a.questionRaw[0]}</div>
              {editing === a.id ? (
                <>
                  <div className="spacer" />
                  <textarea rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} autoFocus />
                  <div className="spacer" />
                  <div className="row">
                    <button
                      className="primary small"
                      onClick={() => {
                        saveBank(bank.map((x) => (x.id === a.id ? { ...x, answer: editText } : x)))
                        setEditing(null)
                      }}
                    >
                      Save
                    </button>
                    <button className="link small" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <div className="sub" style={{ flex: 1 }}>{a.answer}</div>
                  <span className="chip">{a.timesUsed}×</span>
                  <button className="link small" onClick={() => { setEditing(a.id); setEditText(a.answer) }}>Edit</button>
                  <button className="danger small" onClick={() => saveBank(bank.filter((x) => x.id !== a.id))}>✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
