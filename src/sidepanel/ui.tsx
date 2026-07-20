// Design-system primitives for the side panel.
//
// Only things that repeat or carry behaviour live here — layout shells, the
// push-navigation row, the paid-action tile, the sheet, the stack hook. Chips,
// pills and one-off spans stay as plain class strings, which is how the rest of
// this codebase is written.
//
// The old Section/KV primitives stay in components.tsx: the wizard and the
// not-yet-migrated profile editors still use them.

import { ReactNode, useEffect, useRef, useState } from 'react'

/* ---------- icons ---------- */

const ICONS = {
  chev: 'M6 3.5 10.5 8 6 12.5',
  back: 'M9.5 3.5 5 8l4.5 4.5',
  plus: 'M8 3.5v9M3.5 8h9',
  check: 'm3.5 8.5 3 3 6-7',
  up: 'M8 12.5V4M4.5 7.5 8 4l3.5 3.5',
  pen: 'M11.2 2.4 13.6 4.8 5.6 12.8 2.4 13.6l.8-3.2z',
  close: 'M4 4l8 8M12 4l-8 8',
} as const

export type IconName = keyof typeof ICONS | 'gear' | 'bolt' | 'doc' | 'briefcase'

/** 16px stroke icon. Inline rather than a sprite sheet — there are nine of
 *  them and a sprite would mean another asset to keep in sync. */
export function Icon({ name }: { name: IconName }) {
  // A cog, not a sun. The previous drawing was a circle with eight radiating
  // lines, which is the universal brightness glyph — it read as a theme toggle.
  // Teeth are blocky and joined to the ring, and there is a hole in the middle.
  if (name === 'gear') {
    const tooth = (key: string, x: number, y: number, w: number, h: number) => (
      <rect key={key} x={x} y={y} width={w} height={h} rx="0.5" fill="currentColor" />
    )
    const teeth = [
      tooth('n', 7.15, 1.1, 1.7, 3.4),
      tooth('s', 7.15, 11.5, 1.7, 3.4),
      tooth('w', 1.1, 7.15, 3.4, 1.7),
      tooth('e', 11.5, 7.15, 3.4, 1.7),
    ]
    return (
      <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
        <g>{teeth}</g>
        <g transform="rotate(45 8 8)">{teeth}</g>
        <circle cx="8" cy="8" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="8" cy="8" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  if (name === 'bolt') {
    return (
      <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8.8 1.5 3.5 9h3.6l-.9 5.5L12.5 7H8.9z" fill="currentColor" />
      </svg>
    )
  }
  if (name === 'briefcase') {
    return (
      <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.8" y="4.8" width="12.4" height="8.7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.8 4.8V3.6a1.1 1.1 0 0 1 1.1-1.1h2.2a1.1 1.1 0 0 1 1.1 1.1v1.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M1.8 8.3h12.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  if (name === 'doc') {
    return (
      <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 2h5l3 3v9H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 2v3h3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className="ic" viewBox="0 0 16 16" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Tab bar glyph. Drawn here rather than pulled from an icon pack: four shapes
 *  is not worth a dependency, and these match the stroke weight of Icon above.
 *  24-unit grid so they stay crisp at the 20px the tab bar renders them at. */
export function TabIcon({ name }: { name: 'home' | 'jobs' | 'profile' | 'cvs' }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg className="tb-i" viewBox="0 0 24 24" aria-hidden="true">
      {name === 'home' && (
        <>
          <path d="M3.5 10.2 12 3.5l8.5 6.7V20a1 1 0 0 1-1 1h-4.2v-5.6H8.7V21H4.5a1 1 0 0 1-1-1z" {...common} />
        </>
      )}
      {name === 'jobs' && (
        <>
          <rect x="3" y="7.5" width="18" height="12.5" rx="2" {...common} />
          <path d="M8.75 7.5V5.6a1.6 1.6 0 0 1 1.6-1.6h3.3a1.6 1.6 0 0 1 1.6 1.6v1.9" {...common} />
          <path d="M3 12.5h18" {...common} />
        </>
      )}
      {name === 'profile' && (
        <>
          <circle cx="12" cy="8.2" r="3.6" {...common} />
          <path d="M4.8 20.4a7.4 7.4 0 0 1 14.4 0" {...common} />
        </>
      )}
      {name === 'cvs' && (
        <>
          <path d="M6 3h7.5L19 8.5V21H6z" {...common} />
          <path d="M13.2 3v5.5H19" {...common} />
          <path d="M9 13h6M9 16.5h4" {...common} />
        </>
      )}
    </svg>
  )
}

/* ---------- navigation ---------- */

/** A per-tab screen stack. 'root' is always the bottom of the stack, so
 *  `back()` can never empty it and leave nothing rendered. */
export function useStack(): {
  screen: string
  depth: number
  push: (s: string) => void
  back: () => void
  reset: () => void
} {
  const [stack, setStack] = useState<string[]>(['root'])
  return {
    screen: stack[stack.length - 1],
    depth: stack.length,
    push: (s) => setStack((v) => [...v, s]),
    back: () => setStack((v) => (v.length > 1 ? v.slice(0, -1) : v)),
    reset: () => setStack(['root']),
  }
}

/* ---------- layout shells ---------- */

/** Header for a tab's root screen: wordmark left, actions right. */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="p-top">
      <div className="p-brand">{title}</div>
      {right && <div className="p-top-r">{right}</div>}
    </div>
  )
}

/** Header for a pushed screen: back arrow, title, optional right slot. */
export function ScreenHead({
  title,
  onBack,
  right,
  backLabel,
}: {
  title: string
  onBack: () => void
  right?: ReactNode
  backLabel: string
}) {
  return (
    <div className="p-head">
      <button className="iconbtn" onClick={onBack} aria-label={backLabel}>
        <Icon name="back" />
      </button>
      <span>{title}</span>
      {right && <span className="head-r">{right}</span>}
    </div>
  )
}

/** The scrolling area of a screen. Resets scroll whenever the screen changes,
 *  so a pushed view never opens halfway down. */
export function Body({ children, center, screen }: { children: ReactNode; center?: boolean; screen?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [screen])
  return (
    <div className={`p-body ${center ? 'center' : ''}`} ref={ref}>
      {children}
    </div>
  )
}

/* ---------- rows ---------- */

/** One row in a bordered list. With `onClick` it's a button that pushes a
 *  screen and shows a chevron; without, it's a static line. */
export function Row({
  title,
  sub,
  onClick,
  right,
  warn,
  lead,
}: {
  title: ReactNode
  sub?: ReactNode
  onClick?: () => void
  right?: ReactNode
  /** Amber dot: this row needs attention. */
  warn?: boolean
  /** Leading slot — a fit score, a tick. */
  lead?: ReactNode
}) {
  const inner = (
    <>
      {lead}
      <span className="row-b">
        <span className="row-t">{title}</span>
        {sub && <span className="row-s">{sub}</span>}
      </span>
      {warn && <span className="warn-dot" />}
      {right}
      {onClick && <Icon name="chev" />}
    </>
  )
  if (!onClick) return <div className="row">{inner}</div>
  return (
    <button className="row" onClick={onClick}>
      {inner}
    </button>
  )
}

/* ---------- paid action tile ---------- */

/** One of the two things we charge for. Given real weight on Home: these are
 *  the product, and in the old panel they were collapsed grey rows. */
export function Feature({
  icon,
  title,
  sub,
  cost,
  accent,
  disabled,
  onClick,
}: {
  icon: IconName
  title: string
  sub: string
  /** Rendered top-right. Omit for free actions. */
  cost?: string
  accent?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button className="feat" onClick={onClick} disabled={disabled}>
      {cost && <span className="feat-cost">{cost}</span>}
      <span className={`feat-ic ${accent ? 'accent' : ''}`}>
        <Icon name={icon} />
      </span>
      {/* The chevron sits on the title row rather than in a corner, so a sub
          that wraps to two lines cannot collide with it. */}
      <span className="feat-t">
        {title}
        <Icon name="chev" />
      </span>
      <span className="feat-s">{sub}</span>
    </button>
  )
}

/* ---------- composer ---------- */

/** "Something new to add?" — an open input rather than a button that leads to
 *  one, so adding a fact is a single gesture. Clears on submit. */
export function Composer({
  label,
  placeholder,
  hint,
  submitLabel,
  accent,
  busy,
  autoFocus,
  onSubmit,
}: {
  label: string
  placeholder: string
  hint?: string
  submitLabel: string
  accent?: boolean
  busy?: boolean
  autoFocus?: boolean
  onSubmit: (text: string) => void
}) {
  const [text, setText] = useState('')
  const ready = text.trim().length >= 8 && !busy

  const send = () => {
    if (!ready) return
    onSubmit(text.trim())
    setText('')
  }

  return (
    <div className={`composer ${accent ? 'accent' : ''}`}>
      <label className="comp-l" htmlFor="composer-in">{label}</label>
      <input
        id="composer-in"
        className="comp-in"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
      />
      {text.trim() && (
        <button className="ghost small wide" onClick={send} disabled={!ready}>
          {busy ? <span className="spin" /> : null}
          {submitLabel}
        </button>
      )}
      {hint && !text.trim() && <div className="comp-h">{hint}</div>}
    </div>
  )
}

/* ---------- repeatable fields ---------- */

/** Short tokens — skills, industries, the tech used in a role.
 *
 *  Replaces "comma separated", which makes the user learn a format and then
 *  makes a typo in it silently merge two skills into one. Enter or comma
 *  commits, and blur commits too so a half-typed entry is not lost by tapping
 *  elsewhere.
 *
 *  Backspace only ever edits text. Token inputs conventionally let backspace on
 *  an empty box delete the previous token, but that destroys something the user
 *  never pointed at, off the very key they were already pressing to erase what
 *  they had typed. Removing a token is the x on the token. */
export function ChipInput({
  items,
  onChange,
  placeholder,
  removeLabel,
}: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder: string
  removeLabel: string
}) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const value = draft.trim().replace(/,$/, '').trim()
    setDraft('')
    if (!value) return
    if (items.some((i) => i.toLowerCase() === value.toLowerCase())) return
    onChange([...items, value])
  }

  return (
    <div className="chipedit">
      {items.length > 0 && (
        <div className="chipedit-list">
          {items.map((item, i) => (
            <span key={`${item}-${i}`} className="echip">
              {item}
              <button
                aria-label={`${removeLabel} ${item}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              >
                <Icon name="close" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className="fin"
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit()
          }
        }}
      />
    </div>
  )
}

/** Sentence-length items — the achievements under a role, career highlights.
 *
 *  One box per item instead of one textarea holding all of them, so nobody has
 *  to know that a line break is what separates them. A new row is focused on
 *  add; an emptied row is dropped on blur rather than left as a blank line. */
export function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  removeLabel,
  max,
}: {
  items: string[]
  onChange: (next: string[]) => void
  placeholder: string
  addLabel: string
  removeLabel: string
  /** Cap, where one exists — career highlights are capped at three. */
  max?: number
}) {
  const [focusAt, setFocusAt] = useState(-1)
  const atMax = max !== undefined && items.length >= max

  const setAt = (i: number, value: string) => onChange(items.map((x, j) => (j === i ? value : x)))
  const removeAt = (i: number) => onChange(items.filter((_, j) => j !== i))

  return (
    <div className="listedit">
      {items.map((item, i) => (
        <div key={i} className="lrow">
          <textarea
            rows={2}
            value={item}
            placeholder={placeholder}
            autoFocus={i === focusAt}
            onChange={(e) => setAt(i, e.target.value)}
            onBlur={() => {
              if (!item.trim()) removeAt(i)
              setFocusAt(-1)
            }}
          />
          <button className="lrow-x" aria-label={removeLabel} onClick={() => removeAt(i)}>
            <Icon name="close" />
          </button>
        </div>
      ))}
      {!atMax && (
        <button
          className="ghost wide small"
          onClick={() => {
            setFocusAt(items.length)
            onChange([...items, ''])
          }}
        >
          <Icon name="plus" /> {addLabel}
        </button>
      )}
    </div>
  )
}

/* ---------- sheet ---------- */

/** Bottom sheet. Used to ask a question before an action spends a credit.
 *  Closes on scrim click or Escape. */
export function Sheet({
  title,
  sub,
  children,
  onClose,
  closeLabel,
}: {
  title: string
  sub?: string
  children: ReactNode
  onClose: () => void
  closeLabel: string
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-overlay">
      <div className="sheet-scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label={title}>
        <div className="sheet-h">{title}</div>
        {sub && <div className="sheet-s">{sub}</div>}
        {children}
        <button className="plain wide" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  )
}

/* ---------- small helpers ---------- */

/** Fit score 1-10 as a coloured square. Bands match lib/fitBands. */
export function FitChip({ score }: { score?: number }) {
  const tone = score === undefined ? 'none' : score >= 7 ? 'good' : score >= 5 ? 'mid' : 'low'
  return <span className={`fitchip ${tone}`}>{score ?? '?'}</span>
}
