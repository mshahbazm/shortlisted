import { useState } from 'react'
import { cn } from '../lib/cn'
import { FIELD, Input, Textarea } from './ui'

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
      <div
        className="flex cursor-pointer items-baseline gap-3 rounded-md p-1.5 hover:bg-hover"
        onClick={() => { setDraft(v); setEditing(true) }}
      >
        <span className="w-[130px] shrink-0 text-[12.5px] text-muted">{k}</span>
        <span className={cn('text-[13.5px] [overflow-wrap:anywhere]', !v && 'text-faint')}>{v || placeholder}</span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap items-baseline gap-3 p-1.5">
      <span className="w-[130px] shrink-0 pt-[7px] text-[12.5px] text-muted">{k}</span>
      {multiline ? (
        <Textarea className={'min-h-16 resize-y leading-normal'}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          rows={3}
        />
      ) : (
        <Input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setInvalid(false) }}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
      )}
      {invalid && <span className="my-0.5 w-full text-[11.5px] text-bad">{invalidHint}</span>}
    </div>
  )
}
