import { useState } from 'react'

// Notion-style key/value row: reads as text, click to edit in place.
export function KV({
  k,
  v,
  placeholder = 'Empty',
  multiline = false,
  url = false,
  invalidHint,
  onChange,
}: {
  k: string
  v: string
  placeholder?: string
  multiline?: boolean
  /** Validate as a URL on commit; a bare domain gets https:// prepended. */
  url?: boolean
  /** Shown under the field when a url commit fails validation. */
  invalidHint?: string
  onChange: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(v)
  const [invalid, setInvalid] = useState(false)

  const commit = () => {
    let next = draft.trim()
    if (url && next) {
      if (!/^https?:\/\//i.test(next)) next = `https://${next}`
      let host = ''
      try {
        host = new URL(next).hostname
      } catch {
        host = ''
      }
      if (!host.includes('.')) {
        setInvalid(true) // stay in edit mode until it's a real link (or emptied)
        return
      }
    }
    setInvalid(false)
    setEditing(false)
    if (next !== v) onChange(next)
  }

  if (!editing) {
    return (
      <div className="kv" onClick={() => { setDraft(v); setEditing(true) }}>
        <span className="k">{k}</span>
        <span className={`v ${v ? '' : 'empty-v'}`}>{v || placeholder}</span>
      </div>
    )
  }
  return (
    <div className="kv" style={{ cursor: 'default', flexWrap: 'wrap' }}>
      <span className="k" style={{ paddingTop: 7 }}>{k}</span>
      {multiline ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          rows={3}
        />
      ) : (
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setInvalid(false) }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      )}
      {invalid && <span className="kv-error" style={{ width: '100%' }}>{invalidHint}</span>}
    </div>
  )
}
