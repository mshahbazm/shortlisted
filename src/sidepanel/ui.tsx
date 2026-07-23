// Design-system primitives for the side panel.
//
// Styled with Tailwind against the theme in styles.css, so a class name can no
// longer be written in markup and forgotten in CSS — the failure that produced
// an unstyled segmented control, chevrons that never picked up their colour,
// and a `sm` where `small` was meant.
//
// Only things that repeat or carry behaviour live here. One-off spans stay
// inline, which is how the rest of this codebase is written.

import { ReactNode, useEffect, useRef, useState } from 'react'
import { Dialog } from '@base-ui-components/react/dialog'
import { Select as BaseSelect } from '@base-ui-components/react/select'
import { cn } from '../lib/cn'

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
export function Icon({ name, className }: { name: IconName; className?: string }) {
  const box = cn('block size-4 shrink-0', className)

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
      <svg className={box} viewBox="0 0 16 16" aria-hidden="true">
        <g>{teeth}</g>
        <g transform="rotate(45 8 8)">{teeth}</g>
        <circle cx="8" cy="8" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.9" />
        <circle cx="8" cy="8" r="1.75" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  if (name === 'bolt') {
    return (
      <svg className={box} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M8.8 1.5 3.5 9h3.6l-.9 5.5L12.5 7H8.9z" fill="currentColor" />
      </svg>
    )
  }
  if (name === 'briefcase') {
    return (
      <svg className={box} viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.8" y="4.8" width="12.4" height="8.7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5.8 4.8V3.6a1.1 1.1 0 0 1 1.1-1.1h2.2a1.1 1.1 0 0 1 1.1 1.1v1.2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M1.8 8.3h12.4" fill="none" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    )
  }
  if (name === 'doc') {
    return (
      <svg className={box} viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 2h5l3 3v9H4z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M9 2v3h3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    )
  }
  return (
    <svg className={box} viewBox="0 0 16 16" aria-hidden="true">
      <path d={ICONS[name]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Tab bar glyph. Drawn here rather than pulled from an icon pack: four shapes
 *  is not worth a dependency, and these match the stroke weight of Icon above.
 *  24-unit grid so they stay crisp at the 21px the tab bar renders them at. */
export function TabIcon({ name }: { name: 'home' | 'jobs' | 'profile' | 'cvs' }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg className="block size-[21px]" viewBox="0 0 24 24" aria-hidden="true">
      {name === 'home' && (
        <path d="M3.5 10.2 12 3.5l8.5 6.7V20a1 1 0 0 1-1 1h-4.2v-5.6H8.7V21H4.5a1 1 0 0 1-1-1z" {...common} />
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

/* ---------- buttons ---------- */

/** Variants were a list of CSS selectors sharing one base rule, which meant a
 *  typo like `sm` for `small` produced a full-size button and no error at all.
 *  They are values now, so a wrong one does not compile. */
const BUTTON_BASE =
  'inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-field ' +
  'border border-transparent font-semibold transition-colors ' +
  'disabled:cursor-default disabled:opacity-40'

const BUTTON_VARIANT = {
  primary: 'bg-primary text-primary-fg hover:bg-[#2c2c31]',
  ghost: 'border-line bg-bg text-fg hover:bg-hover',
  plain: 'bg-transparent font-medium text-muted hover:bg-hover',
  danger: 'bg-transparent text-bad hover:bg-[#fef2f2]',
  destructive: 'bg-bad text-white hover:bg-[#b91c1c]',
  link: 'bg-transparent p-0 text-[12.5px] text-accent hover:underline',
} as const

const BUTTON_SIZE = {
  md: 'min-h-10 px-3.5 py-2.5 text-[13.5px]',
  sm: 'min-h-[34px] px-3 py-[7px] text-[12.5px]',
  lg: 'min-h-[46px] w-full px-3.5 py-2.5 text-[14.5px]',
  none: 'min-h-0',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANT
export type ButtonSize = keyof typeof BUTTON_SIZE

export function Button({
  variant = 'primary',
  size = 'md',
  wide,
  className,
  ...rest
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  wide?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        BUTTON_BASE,
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[variant === 'link' ? 'none' : size],
        wide && 'w-full',
        className,
      )}
      {...rest}
    />
  )
}

/** Square icon-only button — back arrows, the gear, the + in a title bar. */
export function IconButton({
  icon,
  className,
  ...rest
}: { icon: IconName } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'grid size-7 shrink-0 cursor-pointer place-items-center rounded-md',
        'border-0 bg-transparent p-0 text-muted hover:bg-hover hover:text-fg',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  )
}

/** The one back control for the whole panel. Always an arrow + a visible label,
 *  so every wizard and pushed screen reads the same. Two variants for our two
 *  layouts: `bar` sits in a screen header, `pill` stands alone in a wizard.
 *  Change the look here once and it changes everywhere. */
export function BackButton({
  label,
  variant = 'bar',
  className,
  ...rest
}: {
  label: string
  variant?: 'bar' | 'pill'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'group inline-flex w-fit shrink-0 cursor-pointer items-center gap-1 border-0 bg-transparent',
        'text-muted transition-colors hover:text-fg disabled:cursor-default disabled:opacity-40',
        variant === 'pill'
          ? '-ml-2 rounded-full py-1.5 pl-2 pr-3.5 text-[13px] font-medium hover:bg-hover disabled:hover:bg-transparent'
          : '-ml-1 rounded-md px-1 py-0.5 text-sm font-semibold hover:bg-hover',
        className,
      )}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="transition-transform group-hover:-translate-x-0.5"
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  )
}

/** The x beside a repeatable row. Muted until hovered, then clearly a delete. */
export function RemoveButton({
  label,
  onClick,
  className,
}: {
  label: string
  onClick: () => void
  className?: string
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-[30px] shrink-0 cursor-pointer place-items-center rounded-[7px]',
        'border-0 bg-transparent p-0 text-faint hover:bg-hover hover:text-bad',
        className,
      )}
    >
      <Icon name="close" className="size-[13px]" />
    </button>
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

const BAR = 'flex flex-none items-center gap-2 border-b border-line bg-bg'

/** Header for a tab's root screen: wordmark left, actions right. */
export function TopBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className={cn(BAR, 'px-3.5 pt-3 pb-2.5')}>
      <div className="text-[15px] font-[650] tracking-[-0.015em]">{title}</div>
      {right && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
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
    <div className={cn(BAR, 'px-3.5 py-[11px] text-sm font-semibold')}>
      <BackButton variant="bar" label={backLabel} onClick={onBack} />
      <span className="min-w-0 truncate text-muted">{title}</span>
      {right && (
        <span className="ml-auto shrink-0 text-[11.5px] font-semibold text-muted tabular-nums">{right}</span>
      )}
    </div>
  )
}

/** The scrolling area of a screen. Resets scroll whenever the screen changes,
 *  so a pushed view never opens halfway down.
 *
 *  One rhythm for the whole panel: 20px between sections. Sections set no outer
 *  margins of their own, so nothing can double up or collapse. */
export function Body({ children, center, screen }: { children: ReactNode; center?: boolean; screen?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [screen])
  return (
    <div
      ref={ref}
      className={cn(
        'mx-auto flex min-h-0 w-full max-w-[640px] flex-1 flex-col overflow-y-auto',
        'gap-5 px-3.5 pt-4 pb-7',
        center && 'justify-center',
      )}
    >
      {children}
    </div>
  )
}

/* ---------- rows ---------- */

/** The bordered container a set of Rows sits in. */
export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-card border border-line bg-bg', className)}>{children}</div>
}

/** One row in a bordered list. With `onClick` it's a button that pushes a
 *  screen and shows a chevron; without, it's a static line. */
export function Row({
  title,
  sub,
  onClick,
  right,
  warn,
  lead,
  tall,
}: {
  title: ReactNode
  sub?: ReactNode
  onClick?: () => void
  right?: ReactNode
  /** Amber dot: this row needs attention. */
  warn?: boolean
  /** Leading slot — a fit score, a tick. */
  lead?: ReactNode
  tall?: boolean
}) {
  const inner = (
    <>
      {lead}
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[13.5px] font-semibold">{title}</span>
        {sub && <span className="truncate text-[11.5px] text-muted">{sub}</span>}
      </span>
      {warn && <span className="size-[7px] shrink-0 rounded-full bg-warn" />}
      {right}
      {onClick && <Icon name="chev" className="text-faint" />}
    </>
  )
  const shared = cn(
    'flex w-full items-center gap-2.5 border-0 border-b border-line bg-bg px-3 text-left',
    'last:border-b-0',
    tall ? 'py-[13px]' : 'py-[11px]',
  )
  if (!onClick) return <div className={shared}>{inner}</div>
  return (
    <button className={cn(shared, 'cursor-pointer hover:bg-hover')} onClick={onClick}>
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
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-0.5 rounded-[11px] border border-line',
        'bg-bg px-[11px] pt-3 pb-[11px] text-left transition',
        'hover:-translate-y-px hover:border-[#dcdcd6] hover:shadow-lift-hover',
        'disabled:translate-y-0 disabled:cursor-default disabled:opacity-55 disabled:shadow-none',
      )}
    >
      {cost && <span className="absolute top-2.5 right-2.5 text-[10px] font-semibold text-warn">{cost}</span>}
      <span
        className={cn(
          'mb-2 grid size-7 place-items-center rounded-lg',
          accent ? 'bg-accent-soft text-accent' : 'bg-hover text-muted',
        )}
      >
        <Icon name={icon} />
      </span>
      {/* Chevron on the title row, not in a corner: a sub that wraps to two
          lines cannot collide with it there. */}
      <span className="flex items-center justify-between gap-1.5 text-[13.5px] font-[650] tracking-[-0.01em]">
        {title}
        <Icon
          name="chev"
          className={cn(
            'text-faint transition group-hover:text-muted',
            'motion-safe:group-hover:translate-x-0.5',
          )}
        />
      </span>
      <span className="text-[11.5px] leading-[1.4] text-muted">{sub}</span>
    </button>
  )
}

/** A full-width choice card: a title, a line of explanation, usually a cost.
 *  Used wherever the panel asks "which of these do you want" — the new-CV
 *  sheet, the wizard's forks. Six copies of the same markup before this. */
export function BigChoice({
  title,
  sub,
  right,
  disabled,
  onClick,
}: {
  title: ReactNode
  sub: ReactNode
  /** Usually a Cost. */
  right?: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex w-full cursor-pointer flex-col gap-1 rounded-[11px] border border-line bg-bg p-[13px] text-left',
        'hover:border-[#d4d4cf] hover:bg-hover',
        'disabled:cursor-default disabled:opacity-85 disabled:hover:border-line disabled:hover:bg-bg',
      )}
    >
      <span className="flex items-center gap-2 text-sm font-[650]">
        {title}
        {right}
      </span>
      <span className="text-xs leading-[1.45] text-muted">{sub}</span>
    </button>
  )
}

/* ---------- form fields ---------- */

/** The one input look. Exported because ChipInput and ListEditor compose it;
 *  screens should reach for Input/Textarea instead, which cannot be forgotten
 *  the way a hand-applied class can. */
export const FIELD =
  'w-full rounded-field border border-line bg-bg px-3 py-2.5 text-[13.5px] text-fg ' +
  'placeholder:text-faint focus:border-accent/60 focus:ring-2 focus:ring-accent-soft focus:outline-none'

/** A single-line field. */
export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, className)} {...rest} />
}

/** A multi-line field. Resizes vertically only — horizontal resize in a 400px
 *  panel just breaks the layout. */
export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'min-h-16 resize-y leading-normal', className)} {...rest} />
}

/** Label above a field. Wraps its control, so clicking the text focuses it
 *  without anyone having to remember a matching htmlFor/id pair. */
export function Label({ className, children, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={cn('flex flex-col gap-[5px] text-[11.5px] font-semibold text-muted', className)} {...rest}>
      {children}
    </label>
  )
}

/** A checkbox and its text, as one target. */
export function Checkbox({
  label,
  className,
  ...rest
}: { label: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 rounded-md px-0.5 py-1 text-[13px] hover:bg-hover', className)}>
      <input type="checkbox" className="accent-accent" {...rest} />
      <span>{label}</span>
    </label>
  )
}

const CARD_PAD = { none: '', sm: 'p-3', md: 'p-3.5' } as const

/** A bordered surface. The panel has exactly one card look, and this is it —
 *  which is the point, since the same box was being spelled out with slightly
 *  different radii and padding in two dozen places. */
export function Card({
  pad = 'sm',
  className,
  children,
  ...rest
}: {
  pad?: keyof typeof CARD_PAD
  children: ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-card border border-line bg-bg', CARD_PAD[pad], className)} {...rest}>
      {children}
    </div>
  )
}

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
    <div className="flex flex-col gap-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-[5px] rounded-full border border-line bg-hover py-1 pr-1.5 pl-2.5 text-xs"
            >
              {item}
              <button
                aria-label={`${removeLabel} ${item}`}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className="grid size-[17px] shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-faint hover:bg-active hover:text-bad"
              >
                <Icon name="close" className="size-[11px]" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        className={FIELD}
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
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          <textarea
            rows={2}
            value={item}
            placeholder={placeholder}
            autoFocus={i === focusAt}
            className={cn(FIELD, 'min-h-[52px] resize-y leading-normal')}
            onChange={(e) => setAt(i, e.target.value)}
            onBlur={() => {
              if (!item.trim()) removeAt(i)
              setFocusAt(-1)
            }}
          />
          <RemoveButton label={removeLabel} onClick={() => removeAt(i)} className="mt-[5px]" />
        </div>
      ))}
      {!atMax && (
        <Button
          variant="ghost"
          size="sm"
          wide
          onClick={() => {
            setFocusAt(items.length)
            onChange([...items, ''])
          }}
        >
          <Icon name="plus" /> {addLabel}
        </Button>
      )}
    </div>
  )
}

/** "Something new to add?" — an open input rather than a button that leads to
 *  one, so adding a fact is a single gesture. Deliberately the most inviting
 *  block on the screen after the primary action: it is free, it takes one line,
 *  and it makes every later CV better. Clears on submit. */
export function Composer({
  label,
  placeholder,
  hint,
  submitLabel,
  busy,
  autoFocus,
  onSubmit,
}: {
  label: string
  placeholder: string
  hint?: string
  submitLabel: string
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
    <div className="flex flex-col gap-2 rounded-xl border border-[#d9d2ff] bg-gradient-to-b from-[#faf9ff] to-bg p-3.5">
      <label className="text-sm font-[650] tracking-[-0.01em]" htmlFor="composer-in">
        {label}
      </label>
      <input
        id="composer-in"
        className={cn(FIELD, 'min-h-10 text-[13px]')}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
      />
      {text.trim() ? (
        <Button variant="ghost" size="sm" wide onClick={send} disabled={!ready}>
          {submitLabel}
        </Button>
      ) : (
        hint && <div className="text-[11.5px] leading-[1.45] text-muted">{hint}</div>
      )}
    </div>
  )
}

/* ---------- sheet ---------- */

/** Bottom sheet. Asks a question before an action spends a credit or deletes
 *  something.
 *
 *  Built on Base UI's Dialog rather than a div and a keydown listener, which is
 *  what this was. The hand-rolled version closed on Escape and on the scrim,
 *  and that was all: focus stayed wherever it had been, so a keyboard user
 *  tabbed straight out of the open sheet into the screen behind it, and a
 *  screen reader was never told a dialog had opened. Focus trapping, restoring
 *  focus on close, aria-modal, and locking the background scroll all come from
 *  the primitive. */
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
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[rgba(24,24,27,0.32)]" />
        <Dialog.Popup
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[640px] flex-col gap-2.5',
            'rounded-t-2xl bg-bg px-3.5 pt-[18px] pb-4 shadow-[0_-8px_30px_rgba(0,0,0,0.16)]',
            'focus:outline-none',
          )}
        >
          <Dialog.Title className="text-[17px] font-[650] tracking-[-0.015em]">{title}</Dialog.Title>
          {sub && (
            <Dialog.Description className="-mt-1.5 mb-1 text-[12.5px] text-muted">{sub}</Dialog.Description>
          )}
          {children}
          {/* The safe choice, where a mis-tap is most likely to land. */}
          <Dialog.Close
            render={
              <Button variant="plain" wide>
                {closeLabel}
              </Button>
            }
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/* ---------- select ---------- */

/** A dropdown that is a real listbox.
 *
 *  A native <select> cannot be styled consistently across platforms — the
 *  chevron we drew was a background image sitting behind the browser's own
 *  control. Base UI renders a button and a listbox we own completely, with the
 *  arrow keys, typeahead, and aria-activedescendant that a native select gives
 *  you for free and a div never does. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}) {
  const current = options.find((o) => o.value === value)
  return (
    <BaseSelect.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <BaseSelect.Trigger
        className={cn(
          'flex w-full cursor-pointer items-center justify-between gap-2 rounded-field border border-line',
          'bg-bg px-3 py-2.5 text-left text-[13.5px] text-fg',
          'focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent-soft focus-visible:outline-none',
          className,
        )}
      >
        <BaseSelect.Value>{current?.label ?? value}</BaseSelect.Value>
        <BaseSelect.Icon>
          <Icon name="chev" className="rotate-90 text-muted" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={4} className="z-50">
          <BaseSelect.Popup className="max-h-[40vh] min-w-[var(--anchor-width)] overflow-y-auto rounded-card border border-line bg-bg p-1 shadow-lift-hover">
            {options.map((o) => (
              <BaseSelect.Item
                key={o.value}
                value={o.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] outline-none',
                  'data-[highlighted]:bg-hover data-[selected]:font-semibold',
                )}
              >
                <BaseSelect.ItemIndicator className="flex size-3.5 shrink-0 items-center justify-center text-accent">
                  <Icon name="check" className="size-3.5" />
                </BaseSelect.ItemIndicator>
                <BaseSelect.ItemText
                  className={cn(!options.some((x) => x.value === value) && 'ml-0')}
                >
                  {o.label}
                </BaseSelect.ItemText>
              </BaseSelect.Item>
            ))}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  )
}

/* ---------- small helpers ---------- */

/** Fit score 1-10 as a coloured square. Bands match lib/fitBands. */
export function FitChip({ score }: { score?: number }) {
  const tone =
    score === undefined
      ? 'bg-hover text-faint'
      : score >= 7
        ? 'bg-good-bg text-good'
        : score >= 5
          ? 'bg-accent-soft text-accent'
          : 'bg-warn-bg text-warn'
  return (
    <span
      className={cn(
        'grid size-[26px] shrink-0 place-items-center rounded-[7px] text-[12.5px] font-bold tabular-nums',
        tone,
      )}
    >
      {score ?? '?'}
    </span>
  )
}

/* ---------- small repeated pieces ---------- */

/** A filled progress bar — profile strength, credits left, an apply run.
 *
 *  The fill is a child element, which is exactly what the migration lost: the
 *  old CSS coloured it with `.meter-bar i`, and converting the parent to
 *  utilities left two bars rendering an invisible fill. Keeping both halves in
 *  one component is what stops that happening again. */
export function Bar({ percent, className }: { percent: number; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-[3px] bg-active', className)}>
      <i className="block h-full rounded-[3px] bg-accent" style={{ width: `${percent}%` }} />
    </div>
  )
}

const CHIP_TONE = {
  plain: 'bg-[#f5f5f3] text-muted',
  amber: 'bg-warn-bg text-warn',
  accent: 'bg-accent-soft text-accent',
  dim: 'bg-[#f5f5f3] text-faint',
} as const

/** Small square-ish tag: a skill, a tool, a gap. */
export function Chip({
  tone = 'plain',
  onClick,
  children,
}: {
  tone?: keyof typeof CHIP_TONE
  onClick?: () => void
  children: ReactNode
}) {
  const cls = cn(
    'inline-block rounded-[5px] px-[7px] py-[2.5px] text-[11px] whitespace-nowrap',
    CHIP_TONE[tone],
  )
  if (!onClick) return <span className={cls}>{children}</span>
  return (
    <button className={cn(cls, 'cursor-pointer border-0 hover:brightness-95')} onClick={onClick}>
      {children}
    </button>
  )
}

const PILL_TONE = {
  good: 'bg-good-bg text-good',
  flat: 'bg-hover text-muted',
  amber: 'bg-warn-bg text-warn',
  accent: 'bg-accent-soft text-accent',
} as const

/** Rounded status label: Default, Applied, Current, Coming soon. */
export function Pill({ tone = 'flat', children }: { tone?: keyof typeof PILL_TONE; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-[3px] text-[10.5px] font-[650] whitespace-nowrap',
        PILL_TONE[tone],
      )}
    >
      {children}
    </span>
  )
}

/** What an action costs, stated before the click. Muted amber states a fact;
 *  red would make our own paid features read as a penalty. */
export function Cost({ children, free, onDark }: { children: ReactNode; free?: boolean; onDark?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-[7px] py-0.5 text-[10.5px] font-semibold whitespace-nowrap',
        onDark ? 'bg-white/[0.17] text-white' : free ? 'bg-good-bg text-good' : 'bg-warn-bg text-warn',
      )}
    >
      {children}
    </span>
  )
}

/** Count badge on the right of a row. */
export function Count({ children, warn }: { children: ReactNode; warn?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[11.5px] font-[650] whitespace-nowrap',
        warn ? 'bg-warn-bg text-warn' : 'bg-hover text-muted',
      )}
    >
      {children}
    </span>
  )
}

/** Segmented filter over one list. Same data, several views — not several
 *  places. Segments ellipsis rather than wrap, so a long label cannot push the
 *  control onto two lines. */
export function Segments<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-[3px] rounded-card bg-hover p-[3px]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'min-w-0 flex-1 truncate rounded-lg border-0 px-1.5 py-[7px] text-center text-xs font-semibold transition-colors',
            o.value === value
              ? 'bg-bg text-fg shadow-[0_1px_2px_rgba(0,0,0,0.07)]'
              : 'cursor-pointer bg-transparent text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Multi-select from a fixed set — tap a pill to add/remove it. The counterpart
 *  to Select (one) and Segments (one, segmented) for the "pick any of these"
 *  case. Wraps to as many rows as needed. */
export function ToggleChips<T extends string>({
  values,
  options,
  onChange,
}: {
  values: T[]
  options: { value: T; label: string }[]
  onChange: (next: T[]) => void
}) {
  const toggle = (v: T) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = values.includes(o.value)
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className={cn(
              'cursor-pointer rounded-full border px-3 py-1.5 text-[13px] transition-colors',
              on
                ? 'border-accent bg-accent-soft font-semibold text-accent'
                : 'border-line bg-bg text-fg hover:bg-hover',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
