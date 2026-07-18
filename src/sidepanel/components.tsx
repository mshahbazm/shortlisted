import { ReactNode, useState } from 'react'

// Collapsible section — the core of the progressive-disclosure layout.
// Collapsed, it's one calm line with a summary; open, it's the editor.
export function Section({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <button className={`section-head ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
        <span className="chev">▶</span>
        <span className="t">{title}</span>
        {!open && summary && <span className="s">{summary}</span>}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}

// Notion-style key/value row: reads as text, click to edit in place.
export function KV({
  k,
  v,
  placeholder = 'Empty',
  multiline = false,
  onChange,
}: {
  k: string
  v: string
  placeholder?: string
  multiline?: boolean
  onChange: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(v)

  const commit = () => {
    setEditing(false)
    if (draft !== v) onChange(draft)
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
    <div className="kv" style={{ cursor: 'default' }}>
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
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      )}
    </div>
  )
}
