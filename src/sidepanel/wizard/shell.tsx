// Shared wizard chrome — promoted verbatim from the old Onboarding.tsx so every
// wizard (and every step) uses one implementation of the frame, headings, action
// row, error line and spinner. StepFrame gains a `busy` prop so the repeated
// `if (busy) return <StepFrame title={<><Spinner/>…}/>` in each step disappears.

import { ReactNode } from 'react'
import { BackButton, Select } from '../ui'
import { useStore } from '../hooks'
import { LOCALES, LOCALE_LABELS, isLocale, useContent } from '../../i18n'
import * as store from '../../lib/store'

/** The panel frame every step renders inside: centred scroll column, a back
 *  chevron when there's history, and the always-pinned language switcher. */
export function WizardShell({
  canBack,
  disabled,
  onBack,
  backLabel,
  children,
}: {
  canBack: boolean
  disabled: boolean
  onBack: () => void
  backLabel: string
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-full w-full flex-col">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 min-h-0 flex-col justify-center overflow-y-auto px-[26px] pt-8 pb-10">
        {canBack && (
          <BackButton variant="pill" label={backLabel} onClick={onBack} disabled={disabled} className="mb-5 self-start" />
        )}
        {children}
      </div>
      <div className="absolute right-3 bottom-3">
        <LocaleSwitcher />
      </div>
    </div>
  )
}

/** Heading + optional lead + body, bound together so they can never drift. When
 *  `busy`, shows a spinner beside the (optional) `busyTitle` and hides the body. */
export function StepFrame({
  title,
  lead,
  busy,
  busyTitle,
  children,
}: {
  title: ReactNode
  lead?: ReactNode
  busy?: boolean
  busyTitle?: ReactNode
  children?: ReactNode
}) {
  const heading = busy ? (
    <>
      <Spinner />
      {busyTitle ?? title}
    </>
  ) : (
    title
  )
  return (
    <>
      <h1 className="mb-1.5 text-[21px] font-bold tracking-[-0.02em]">{heading}</h1>
      {lead != null && <p className="mb-[26px] text-sm leading-relaxed text-muted">{lead}</p>}
      {!busy && children}
    </>
  )
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className="mt-[22px] flex items-center gap-2.5">{children}</div>
}

export function ErrLine({ msg }: { msg?: string }) {
  return msg ? <p className="my-2 text-[13px] text-bad">{msg}</p> : null
}

export const Spinner = () => (
  <span className="mr-[7px] inline-block size-3 animate-spin rounded-full border-2 border-line border-t-fg align-[-1px]" />
)

/**
 * Always-visible language picker. The default follows the browser language
 * (chrome.i18n); picking one persists in settings.locale and re-renders the
 * whole panel instantly — the wizard is exactly where a wrong auto-detected
 * language must be fixable.
 */
export function LocaleSwitcher() {
  const [settings] = useStore('settings')
  const t = useContent('settings')
  return (
    <Select
      className="mx-auto w-auto border-0 bg-transparent px-1.5 py-1 text-xs text-muted hover:text-fg"
      value={isLocale(settings.locale) ? settings.locale : 'auto'}
      onChange={(v) => void store.update('settings', (s) => ({ ...s, locale: v === 'auto' ? undefined : v }))}
      options={[
        { value: 'auto', label: `🌐 ${t.languageAuto}` },
        ...LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] })),
      ]}
    />
  )
}
