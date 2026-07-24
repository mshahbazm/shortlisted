// Steps shared across the onboarding wizards. A step is data, so both Entry and
// Build reference the same one. (The OTP email/code pair lives in entry.tsx for
// now; Phase 2 will lift it here to also replace SettingsTab's duplicate auth.)

import { useContent } from '../../i18n'
import { Button, Input, Label, ToggleChips } from '../ui'
import { StepFrame, Actions, type BaseCtx, type Step } from '../wizard'
import { useStore } from '../hooks'
import { Profile } from '../../lib/types'

export type OnbContent = ReturnType<typeof useContent<'onboarding'>>

// The job types offered on the "quick basics" step: a STABLE key (what we store,
// comma-joined) plus its i18n label key (what we show). Storing the stable key —
// not the localized label — means the selection survives a language switch.
const JOB_TYPES = [
  { value: 'full_time', key: 'jobTypeFullTime' },
  { value: 'part_time', key: 'jobTypePartTime' },
  { value: 'contract', key: 'jobTypeContract' },
  { value: 'internship', key: 'jobTypeInternship' },
  { value: 'freelance', key: 'jobTypeFreelance' },
  { value: 'any', key: 'jobTypeOpenToAny' },
] as const

/** The context every onboarding wizard provides: the i18n bundle and a `finish`
 *  that ends the wizard (the App router then decides where the user lands). */
export interface WizCtx extends BaseCtx {
  t: OnbContent
  finish: () => void
}

/** "Does this look right?" — shown after a CV is parsed (both the has-CV Entry
 *  door and the have-a-resume Build door). Reads/writes the parsed identity in
 *  the store directly (like answersStep), so it needs nothing from the wizard's
 *  ctx beyond `t`. Advances to `next` via the button. Generic in wizard state. */
export function reviewStep<S>(next: string): Step<S, WizCtx> {
  return {
    next,
    view: ({ api, ctx }) => {
      const [profile, saveProfile] = useStore('profile')
      const t = ctx.t
      const setIdentity = (k: keyof Profile['identity'], v: string) =>
        saveProfile({ ...profile, identity: { ...profile.identity, [k]: v } })
      const setLink = (k: keyof Profile['links'], v: string) =>
        saveProfile({ ...profile, links: { ...profile.links, [k]: v } })
      // A resume without a name is not useful; everything else stays optional.
      const nameOk = profile.identity.firstName.trim().length > 0
      return (
        <StepFrame title={t.reviewTitle} lead={t.reviewLead(profile.work.length, profile.skills.length)}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-2.5 [&>*]:flex-1">
              <Label>{t.firstName}
                <Input type="text" value={profile.identity.firstName} onChange={(e) => setIdentity('firstName', e.target.value)} /></Label>
              <Label>{t.lastName}
                <Input type="text" value={profile.identity.lastName} onChange={(e) => setIdentity('lastName', e.target.value)} /></Label>
            </div>
            <Label>{t.email}
              <Input type="text" value={profile.identity.email} onChange={(e) => setIdentity('email', e.target.value)} /></Label>
            <div className="flex gap-2.5 [&>*]:flex-1">
              <Label>{t.phone}
                <Input type="text" value={profile.identity.phone} onChange={(e) => setIdentity('phone', e.target.value)} /></Label>
              <Label>{t.location}
                <Input type="text" value={profile.identity.location} onChange={(e) => setIdentity('location', e.target.value)} /></Label>
            </div>
            <div className="flex flex-col gap-2.5">
              <Label>{t.linkedin}
                <Input type="text" placeholder={t.linkedinPlaceholder} value={profile.links.linkedin ?? ''} onChange={(e) => setLink('linkedin', e.target.value)} /></Label>
              <Label>{t.github}
                <Input type="text" placeholder={t.githubPlaceholder} value={profile.links.github ?? ''} onChange={(e) => setLink('github', e.target.value)} /></Label>
              <Label>{t.portfolio}
                <Input type="text" placeholder={t.portfolioPlaceholder} value={profile.links.portfolio ?? ''} onChange={(e) => setLink('portfolio', e.target.value)} /></Label>
            </div>
          </div>
          <Actions>
            <Button disabled={!nameOk} onClick={() => api.next()}>{t.looksRight}</Button>
          </Actions>
        </StepFrame>
      )
    },
  }
}

/** The answer-bank seed — the final step of both the has-CV (Entry) and no-CV
 *  (Build) paths. Reads and writes the persisted profile facts directly and
 *  ends the wizard via `finish`. Generic in the wizard's state (it uses none). */
export function answersStep<S>(): Step<S, WizCtx> {
  return {
    view: ({ ctx }) => {
      const [profile, saveProfile] = useStore('profile')
      const t = ctx.t
      const setFact = (k: keyof Profile['facts'], v: string | number | undefined) =>
        saveProfile({ ...profile, facts: { ...profile.facts, [k]: v } })
      // Numeric facts: empty clears to undefined; anything non-numeric is ignored.
      const setNum = (k: keyof Profile['facts'], raw: string) => {
        const n = raw === '' ? undefined : Number(raw)
        setFact(k, n === undefined || Number.isNaN(n) ? undefined : n)
      }
      const jobTypeOptions = JOB_TYPES.map((j) => ({ value: j.value, label: t[j.key] }))
      const jobTypes = (profile.facts.jobType ?? '').split(',').map((s) => s.trim()).filter(Boolean)
      return (
        <StepFrame title={t.answersTitle} lead={t.answersLead}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-[5px]">
              <span className="text-[11.5px] font-semibold text-muted">{t.jobTypeLabel}</span>
              <ToggleChips values={jobTypes} options={jobTypeOptions} onChange={(next) => setFact('jobType', next.join(', '))} />
            </div>
            <div className="flex gap-2.5 [&>*]:flex-1">
              <Label>{t.salaryHourlyLabel}
                <Input type="number" inputMode="numeric" min={0} placeholder={t.salaryHourlyPlaceholder}
                  value={profile.facts.salaryHourly ?? ''} onChange={(e) => setNum('salaryHourly', e.target.value)} /></Label>
              <Label>{t.salaryMonthlyLabel}
                <Input type="number" inputMode="numeric" min={0} placeholder={t.salaryMonthlyPlaceholder}
                  value={profile.facts.salaryMonthly ?? ''} onChange={(e) => setNum('salaryMonthly', e.target.value)} /></Label>
            </div>
            <Label>{t.noticeDaysLabel}
              <Input type="number" inputMode="numeric" min={0} placeholder={t.noticeDaysHint}
                value={profile.facts.noticeDays ?? ''} onChange={(e) => setNum('noticeDays', e.target.value)} /></Label>
          </div>
          <Actions>
            <Button onClick={ctx.finish}>{t.continue}</Button>
            <Button variant="link" onClick={ctx.finish}>{t.skip}</Button>
          </Actions>
        </StepFrame>
      )
    },
  }
}
